-- Fiscalizações separadas dos laudos; equivalência do autocontrole exige
-- ato explícito da Qualidade, evidência e justificativa. Sem dados reais seed.
begin;

create function public.fiscal_pode_ler() returns boolean language sql stable security definer
set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.app_user_roles r where r.user_id = (select auth.uid())
      and r.role in ('admin','quality','regulatory','rd'));
$$;
create function public.fiscal_pode_escrever() returns boolean language sql stable security definer
set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.app_user_roles r where r.user_id = (select auth.uid())
      and r.role in ('admin','quality','regulatory'));
$$;
revoke all on function public.fiscal_pode_ler(),public.fiscal_pode_escrever() from public,anon;
grant execute on function public.fiscal_pode_ler(),public.fiscal_pode_escrever() to authenticated;

create table public.fiscalizacoes (
  id uuid primary key default gen_random_uuid(),
  empresa text not null check (empresa in ('DMS','MFParis','Profi')),
  orgao text not null check (orgao in ('MAPA','Anvisa','Procon','Vigilância Sanitária','Outro')),
  orgao_outro text,
  processo text not null check (length(processo) between 1 and 160),
  data_fiscalizacao date not null,
  prazo_resposta date,
  responsavel text not null check (length(responsavel) between 1 and 160),
  situacao text not null default 'Aberta' check (situacao in ('Aberta','Em atendimento','Concluída')),
  observacao text not null default '' check (length(observacao)<=4000),
  criado_por uuid not null default auth.uid(), criado_em timestamptz not null default now(),
  atualizado_por uuid, atualizado_em timestamptz not null default now()
);
create index fiscalizacoes_prazo_idx on public.fiscalizacoes (prazo_resposta) where situacao<>'Concluída';
create table public.fiscalizacao_exigencias (
  id uuid primary key default gen_random_uuid(),
  fiscalizacao_id uuid not null references public.fiscalizacoes(id),
  descricao text not null check (length(descricao) between 1 and 2000),
  prazo date, responsavel text not null check (length(responsavel) between 1 and 160),
  situacao text not null default 'Pendente' check (situacao in ('Pendente','Em andamento','Cumprida')),
  evidencia text not null default '' check (length(evidencia)<=2000),
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now()
);
create index fiscalizacao_exigencias_fiscal_idx on public.fiscalizacao_exigencias (fiscalizacao_id);
create table public.fiscalizacao_documentos (
  id uuid primary key default gen_random_uuid(),
  fiscalizacao_id uuid not null references public.fiscalizacoes(id),
  nome text not null check (length(nome) between 1 and 255),
  caminho text not null unique,
  enviado_por uuid not null default auth.uid(), enviado_em timestamptz not null default now()
);
create index fiscalizacao_documentos_fiscal_idx on public.fiscalizacao_documentos (fiscalizacao_id);
create table public.fiscalizacao_equivalencias (
  id uuid primary key default gen_random_uuid(),
  fiscalizacao_id uuid not null references public.fiscalizacoes(id),
  analise_id text not null, plano_id text not null,
  empresa text not null, produto text not null, amostra text not null,
  parametros text not null, criterios text not null,
  numero_laudo text not null,
  data_analise date not null, dias_plano integer not null check (dias_plano between 1 and 3660),
  proximo_prazo date not null,
  justificativa text not null check (length(justificativa) between 20 and 2000),
  aprovada_por uuid not null, aprovada_em timestamptz not null default now(),
  revogada_por uuid, revogada_em timestamptz, motivo_revogacao text
);
create unique index fiscal_equiv_ativo_unico on public.fiscalizacao_equivalencias (analise_id,plano_id) where revogada_em is null;
create index fiscal_equiv_plano_idx on public.fiscalizacao_equivalencias (plano_id,data_analise desc) where revogada_em is null;
create table public.fiscalizacao_audit (
  id bigint generated always as identity primary key,
  tabela text not null, registro_id uuid not null, acao text not null,
  antes jsonb, depois jsonb, autor uuid, em timestamptz not null default now()
);

create function public.fiscal_auditar() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.atualizado_em := now();
    if tg_table_name = 'fiscalizacoes' then new.atualizado_por := auth.uid(); end if;
  end if;
  insert into public.fiscalizacao_audit(tabela,registro_id,acao,antes,depois,autor)
  values (tg_table_name, new.id, tg_op,
    case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new),auth.uid());
  return new;
end;
$$;
create trigger fiscalizacoes_audita before insert or update on public.fiscalizacoes
for each row execute function public.fiscal_auditar();
create trigger fiscal_exigencias_audita before insert or update on public.fiscalizacao_exigencias
for each row execute function public.fiscal_auditar();
revoke all on function public.fiscal_auditar() from public,anon,authenticated;

do $$ declare t text; begin
  foreach t in array array['fiscalizacoes','fiscalizacao_exigencias','fiscalizacao_documentos','fiscalizacao_equivalencias','fiscalizacao_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.fiscal_pode_ler()))','fiscal_ler_'||t,t);
  end loop;
end $$;
grant insert,update on public.fiscalizacoes,public.fiscalizacao_exigencias to authenticated;
grant insert on public.fiscalizacao_documentos to authenticated;
create policy fiscal_criar on public.fiscalizacoes for insert to authenticated
with check ((select public.fiscal_pode_escrever()) and criado_por=(select auth.uid()));
create policy fiscal_editar on public.fiscalizacoes for update to authenticated
using ((select public.fiscal_pode_escrever())) with check ((select public.fiscal_pode_escrever()));
create policy fiscal_exig_criar on public.fiscalizacao_exigencias for insert to authenticated
with check ((select public.fiscal_pode_escrever()));
create policy fiscal_exig_editar on public.fiscalizacao_exigencias for update to authenticated
using ((select public.fiscal_pode_escrever())) with check ((select public.fiscal_pode_escrever()));
create policy fiscal_doc_criar on public.fiscalizacao_documentos for insert to authenticated
with check ((select public.fiscal_pode_escrever()) and enviado_por=(select auth.uid())
  and caminho like 'fiscalizacoes/'||fiscalizacao_id::text||'/%');

-- Arquivos oficiais têm bucket privado, diferente do bucket legado de anexos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('fiscalizacoes','fiscalizacoes',false,10485760,
  array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create policy fiscal_storage_ler on storage.objects for select to authenticated
using (bucket_id='fiscalizacoes' and (select public.fiscal_pode_ler()));
create policy fiscal_storage_criar on storage.objects for insert to authenticated
with check (bucket_id='fiscalizacoes' and (select public.fiscal_pode_escrever())
  and split_part(name,'/',1)='fiscalizacoes'
  and exists(select 1 from public.fiscalizacoes f where f.id::text=split_part(name,'/',2)));

-- Consulta do plano e do laudo é feita no servidor no momento da decisão.
-- O laudo fica uma vez em app_state. Aqui persiste apenas a evidência da
-- decisão e o retrato necessário para demonstrá-la mesmo se o laudo mudar.
create function public.aprovar_equivalencia_fiscal(
  p_fiscalizacao uuid,p_analise text,p_plano text,p_justificativa text,
  p_produto boolean,p_amostra boolean,p_parametros boolean,p_criterios boolean)
returns public.fiscalizacao_equivalencias language plpgsql security definer
set search_path = '' as $$
declare a jsonb; p jsonb; f public.fiscalizacoes; r public.fiscalizacao_equivalencias;
  d date; n integer;
begin
  if not public.fiscal_pode_escrever() then raise exception 'Sem permissão para aprovar'; end if;
  if not (p_produto and p_amostra and p_parametros and p_criterios)
    then raise exception 'Confirme produto, amostra, parâmetros e critérios'; end if;
  if length(trim(coalesce(p_justificativa,'')))<20 then raise exception 'Justificativa obrigatória (20 caracteres)'; end if;
  select * into f from public.fiscalizacoes where id=p_fiscalizacao;
  if not found then raise exception 'Fiscalização não encontrada'; end if;
  select x into a from public.app_state s cross join lateral jsonb_array_elements(s.data) x
    where s.key='analises' and x->>'id'=p_analise limit 1;
  select x into p from public.app_state s cross join lateral jsonb_array_elements(s.data) x
    where s.key='analPlanos' and x->>'id'=p_plano limit 1;
  if a is null or p is null then raise exception 'Laudo ou plano não encontrado'; end if;
  if a->>'origem'<>'OFICIAL' or a->>'fiscalizacaoId'<>p_fiscalizacao::text
    or a->>'planoId'<>p_plano then raise exception 'Laudo oficial deve estar vinculado à fiscalização e ao plano'; end if;
  if a->>'status'<>'Aprovado' or length(trim(coalesce(a->>'laudo','')))=0
    or (a->>'arquivo' is null and a->>'arquivo2' is null and a->>'arquivo3' is null)
    then raise exception 'Laudo aprovado com documento obrigatório'; end if;
  if a->>'empresa'<>f.empresa or p->>'empresa'<>f.empresa then raise exception 'Empresa não corresponde ao plano'; end if;
  if length(trim(coalesce(a->>'produto','')))=0 or length(trim(coalesce(a->>'amostra','')))=0
    or length(trim(coalesce(a->>'params','')))=0 or length(trim(coalesce(a->>'criterios','')))=0
    then raise exception 'Produto, amostra, parâmetros e critérios do laudo são obrigatórios'; end if;
  if (p->>'dias') !~ '^[0-9]{1,4}$' then raise exception 'Periodicidade do plano inválida'; end if;
  n := (p->>'dias')::integer;
  if n<1 or n>3660 then raise exception 'Periodicidade fora do intervalo'; end if;
  d := (a->>'data')::date;
  if d>current_date then raise exception 'Data do laudo no futuro'; end if;
  insert into public.fiscalizacao_equivalencias(fiscalizacao_id,analise_id,plano_id,empresa,
    produto,amostra,parametros,criterios,numero_laudo,data_analise,dias_plano,
    proximo_prazo,justificativa,aprovada_por)
  values(p_fiscalizacao,p_analise,p_plano,f.empresa,left(a->>'produto',200),
    left(a->>'amostra',300),left(a->>'params',2000),left(a->>'criterios',2000),
    left(a->>'laudo',160),d,n,d+n,trim(p_justificativa),auth.uid()) returning * into r;
  return r;
end;
$$;
revoke all on function public.aprovar_equivalencia_fiscal(uuid,text,text,text,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.aprovar_equivalencia_fiscal(uuid,text,text,text,boolean,boolean,boolean,boolean) to authenticated;

create function public.revogar_equivalencia_fiscal(p_id uuid,p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.fiscal_pode_escrever() then raise exception 'Sem permissão para revogar'; end if;
  if length(trim(coalesce(p_justificativa,'')))<20 then raise exception 'Justificativa obrigatória (20 caracteres)'; end if;
  update public.fiscalizacao_equivalencias set revogada_por=auth.uid(),revogada_em=now(),
    motivo_revogacao=trim(p_justificativa) where id=p_id and revogada_em is null;
  if not found then raise exception 'Aprovação inexistente ou já revogada'; end if;
end;
$$;
revoke all on function public.revogar_equivalencia_fiscal(uuid,text) from public,anon;
grant execute on function public.revogar_equivalencia_fiscal(uuid,text) to authenticated;
commit;
