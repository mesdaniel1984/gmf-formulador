-- FASE 4.3 — Sandbox de P&D + promoção explícita
-- STATUS: DRAFT / NÃO APLICADA
--
-- Regras:
-- - sandbox nunca é oficial;
-- - somente P&D/Admin cria, altera, arquiva ou promove;
-- - Qualidade/Regulatório podem consultar;
-- - promoção cria uma nova revisão RASCUNHO;
-- - sandbox promovido/arquivado fica imutável;
-- - nenhuma escrita direta pelo frontend.

begin;

create table if not exists public.produto_sandboxes (
  id uuid primary key default gen_random_uuid(),

  produto_id bigint not null
    references public.produtos(id)
    on delete restrict,

  base_revisao_id uuid
    references public.produto_revisoes(id)
    on delete restrict,

  nome text not null
    check (nullif(btrim(nome),'') is not null),

  descricao text,

  snapshot jsonb not null
    check (jsonb_typeof(snapshot)='object'),

  status text not null default 'ATIVO'
    check (status in ('ATIVO','PROMOVIDO','ARQUIVADO')),

  criado_por uuid not null
    references auth.users(id)
    on delete restrict,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  promovido_para_revisao_id uuid
    references public.produto_revisoes(id)
    on delete restrict,

  promovido_em timestamptz,
  arquivado_em timestamptz,

  lock_version integer not null default 1
    check (lock_version>=1),

  check (
    (status='PROMOVIDO' and promovido_para_revisao_id is not null and promovido_em is not null)
    or
    (status<>'PROMOVIDO' and promovido_para_revisao_id is null and promovido_em is null)
  ),

  check (
    (status='ARQUIVADO' and arquivado_em is not null)
    or
    (status<>'ARQUIVADO' and arquivado_em is null)
  )
);

alter table public.produto_sandboxes enable row level security;

revoke all privileges on table public.produto_sandboxes from anon, authenticated;
grant select on table public.produto_sandboxes to authenticated;

create index if not exists idx_produto_sandboxes_produto
  on public.produto_sandboxes(produto_id, criado_em desc);

create index if not exists idx_produto_sandboxes_base_revisao
  on public.produto_sandboxes(base_revisao_id);

create index if not exists idx_produto_sandboxes_criado_por
  on public.produto_sandboxes(criado_por);

create index if not exists idx_produto_sandboxes_promovido_revisao
  on public.produto_sandboxes(promovido_para_revisao_id);

drop policy if exists produto_sandboxes_select_auth on public.produto_sandboxes;
create policy produto_sandboxes_select_auth
  on public.produto_sandboxes
  for select
  to authenticated
  using (
    criado_por=(select auth.uid())
    or exists(
      select 1
      from public.app_user_roles r
      where r.user_id=(select auth.uid())
        and r.role in ('rd','admin','quality','regulatory')
    )
  );

create or replace function private.produto_sandbox_guard()
returns trigger
language plpgsql
set search_path=''
as $fn$
declare
  v_allowed boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.produto_id is distinct from old.produto_id
     or new.base_revisao_id is distinct from old.base_revisao_id
     or new.criado_por is distinct from old.criado_por
     or new.criado_em is distinct from old.criado_em then
    raise exception 'SANDBOX_IDENTITY_IMMUTABLE';
  end if;

  if old.status in ('PROMOVIDO','ARQUIVADO') then
    if new is distinct from old then
      raise exception 'SANDBOX_TERMINAL_IMMUTABLE';
    end if;
  end if;

  if old.status='ATIVO' and new.status in ('ATIVO','PROMOVIDO','ARQUIVADO') then
    v_allowed := true;
  elsif old.status=new.status then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'SANDBOX_INVALID_TRANSITION';
  end if;

  if new.status in ('PROMOVIDO','ARQUIVADO')
     and new.snapshot is distinct from old.snapshot then
    raise exception 'SANDBOX_SNAPSHOT_IMMUTABLE_ON_CLOSE';
  end if;

  new.atualizado_em := now();
  new.lock_version := old.lock_version + 1;

  return new;
end;
$fn$;

revoke all on function private.produto_sandbox_guard()
  from public,anon,authenticated;

drop trigger if exists trg_produto_sandbox_guard on public.produto_sandboxes;
create trigger trg_produto_sandbox_guard
before update on public.produto_sandboxes
for each row execute function private.produto_sandbox_guard();

create or replace function private.produto_sandbox_audit()
returns trigger
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_id uuid;
begin
  if tg_op='DELETE' then
    v_id:=old.id;
  else
    v_id:=new.id;
  end if;

  insert into public.audit_log(
    entity_type,entity_id,action,before_data,after_data,actor_id,origin
  )
  values(
    'produto_sandbox',
    v_id::text,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    (select auth.uid()),
    'db_trigger'
  );

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$fn$;

revoke all on function private.produto_sandbox_audit()
  from public,anon,authenticated;

drop trigger if exists trg_produto_sandbox_audit on public.produto_sandboxes;
create trigger trg_produto_sandbox_audit
after insert or update or delete on public.produto_sandboxes
for each row execute function private.produto_sandbox_audit();

create or replace function private.pode_manter_sandbox()
returns boolean
language sql
stable
security definer
set search_path=''
as $fn$
  select
    private.has_app_role('rd')
    or private.has_app_role('admin')
$fn$;

revoke all on function private.pode_manter_sandbox()
  from public,anon,authenticated;

create or replace function public.criar_sandbox_produto(
  p_produto_id bigint,
  p_nome text,
  p_descricao text default null,
  p_base_revisao_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_user uuid:=auth.uid();
  v_snapshot jsonb;
  v_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.usuario_editavel() then raise exception 'READONLY_USER'; end if;
  if not private.pode_manter_sandbox() then raise exception 'SANDBOX_ROLE_REQUIRED'; end if;
  if nullif(btrim(p_nome),'') is null then raise exception 'SANDBOX_NAME_REQUIRED'; end if;

  if p_base_revisao_id is not null then
    select r.snapshot
      into v_snapshot
    from public.produto_revisoes r
    where r.id=p_base_revisao_id
      and r.produto_id=p_produto_id;

    if v_snapshot is null then
      raise exception 'BASE_REVISION_NOT_FOUND';
    end if;
  else
    select jsonb_build_object(
      'nome',p.nome,
      'classificacao',p.classificacao,
      'dados',p.dados
    )
      into v_snapshot
    from public.produtos p
    where p.id=p_produto_id;

    if v_snapshot is null then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;
  end if;

  insert into public.produto_sandboxes(
    produto_id,base_revisao_id,nome,descricao,snapshot,status,criado_por
  )
  values(
    p_produto_id,p_base_revisao_id,btrim(p_nome),nullif(btrim(p_descricao),''),
    v_snapshot,'ATIVO',v_user
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

create or replace function public.atualizar_sandbox_produto(
  p_sandbox_id uuid,
  p_expected_lock_version integer,
  p_snapshot jsonb,
  p_nome text default null,
  p_descricao text default null
)
returns integer
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_sandbox public.produto_sandboxes%rowtype;
  v_lock integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.usuario_editavel() then raise exception 'READONLY_USER'; end if;
  if not private.pode_manter_sandbox() then raise exception 'SANDBOX_ROLE_REQUIRED'; end if;

  if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' then
    raise exception 'SANDBOX_SNAPSHOT_INVALID';
  end if;

  select * into v_sandbox
  from public.produto_sandboxes
  where id=p_sandbox_id
  for update;

  if not found then raise exception 'SANDBOX_NOT_FOUND'; end if;
  if v_sandbox.status<>'ATIVO' then raise exception 'SANDBOX_NOT_EDITABLE'; end if;
  if v_sandbox.lock_version<>p_expected_lock_version then raise exception 'SANDBOX_CONFLICT'; end if;

  update public.produto_sandboxes
     set snapshot=p_snapshot,
         nome=coalesce(nullif(btrim(p_nome),''),nome),
         descricao=case
           when p_descricao is null then descricao
           else nullif(btrim(p_descricao),'')
         end
   where id=p_sandbox_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.arquivar_sandbox_produto(
  p_sandbox_id uuid,
  p_expected_lock_version integer
)
returns integer
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_sandbox public.produto_sandboxes%rowtype;
  v_lock integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.pode_manter_sandbox() then raise exception 'SANDBOX_ROLE_REQUIRED'; end if;

  select * into v_sandbox
  from public.produto_sandboxes
  where id=p_sandbox_id
  for update;

  if not found then raise exception 'SANDBOX_NOT_FOUND'; end if;
  if v_sandbox.status<>'ATIVO' then raise exception 'SANDBOX_NOT_EDITABLE'; end if;
  if v_sandbox.lock_version<>p_expected_lock_version then raise exception 'SANDBOX_CONFLICT'; end if;

  update public.produto_sandboxes
     set status='ARQUIVADO',
         arquivado_em=now()
   where id=p_sandbox_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.promover_sandbox_revisao(
  p_sandbox_id uuid,
  p_expected_lock_version integer,
  p_revisao_codigo text,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $fn$
declare
  v_user uuid:=auth.uid();
  v_sandbox public.produto_sandboxes%rowtype;
  v_revision_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.usuario_editavel() then raise exception 'READONLY_USER'; end if;
  if not private.pode_manter_sandbox() then raise exception 'SANDBOX_ROLE_REQUIRED'; end if;
  if nullif(btrim(p_revisao_codigo),'') is null then raise exception 'REVISION_CODE_REQUIRED'; end if;
  if nullif(btrim(p_motivo),'') is null then raise exception 'CHANGE_REASON_REQUIRED'; end if;

  select * into v_sandbox
  from public.produto_sandboxes
  where id=p_sandbox_id
  for update;

  if not found then raise exception 'SANDBOX_NOT_FOUND'; end if;
  if v_sandbox.status<>'ATIVO' then raise exception 'SANDBOX_NOT_EDITABLE'; end if;
  if v_sandbox.lock_version<>p_expected_lock_version then raise exception 'SANDBOX_CONFLICT'; end if;

  insert into public.produto_revisoes(
    produto_id,revisao_codigo,status,snapshot,motivo_alteracao,origem,criado_por
  )
  values(
    v_sandbox.produto_id,btrim(p_revisao_codigo),'RASCUNHO',
    v_sandbox.snapshot,btrim(p_motivo),'sandbox_promotion',v_user
  )
  returning id into v_revision_id;

  update public.produto_sandboxes
     set status='PROMOVIDO',
         promovido_para_revisao_id=v_revision_id,
         promovido_em=now()
   where id=p_sandbox_id;

  return v_revision_id;
end;
$fn$;

revoke all on function public.criar_sandbox_produto(bigint,text,text,uuid)
  from public,anon;
revoke all on function public.atualizar_sandbox_produto(uuid,integer,jsonb,text,text)
  from public,anon;
revoke all on function public.arquivar_sandbox_produto(uuid,integer)
  from public,anon;
revoke all on function public.promover_sandbox_revisao(uuid,integer,text,text)
  from public,anon;

grant execute on function public.criar_sandbox_produto(bigint,text,text,uuid)
  to authenticated;
grant execute on function public.atualizar_sandbox_produto(uuid,integer,jsonb,text,text)
  to authenticated;
grant execute on function public.arquivar_sandbox_produto(uuid,integer)
  to authenticated;
grant execute on function public.promover_sandbox_revisao(uuid,integer,text,text)
  to authenticated;

commit;
