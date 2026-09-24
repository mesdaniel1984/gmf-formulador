-- Historico de encaminhamentos: o caso permanece sob supervisao da Qualidade.
create table public.sac_encaminhamento (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.sac_caso_tratativa(caso_id) on delete restrict,
  area text not null check (area in
    ('QUALIDADE','PRODUCAO','LOGISTICA','COMERCIAL','FINANCEIRO','REGULATORIO','OUTROS')),
  destinatario text not null check (length(btrim(destinatario)) between 3 and 160),
  canal text not null check (canal in ('EMAIL','TELEFONE','PRESENCIAL','OUTRO')),
  solicitacao text not null check (length(btrim(solicitacao)) between 10 and 2000),
  prazo date not null,
  referencia_envio text not null check (length(btrim(referencia_envio)) between 4 and 200),
  enviado_em timestamptz not null default now(),
  enviado_por uuid not null default auth.uid(),
  confirmado_em timestamptz,
  confirmado_por uuid,
  referencia_confirmacao text,
  respondido_em timestamptz,
  respondido_por uuid,
  resposta text,
  constraint sac_encaminhamento_confirmacao check
    ((confirmado_em is null and confirmado_por is null and referencia_confirmacao is null) or
     (confirmado_em is not null and confirmado_por is not null and
      coalesce(length(btrim(referencia_confirmacao)),0) between 4 and 200)),
  constraint sac_encaminhamento_resposta check
    ((respondido_em is null and respondido_por is null and resposta is null) or
     (respondido_em is not null and respondido_por is not null and
      confirmado_em is not null and coalesce(length(btrim(resposta)),0) between 5 and 2000))
);
create index sac_encaminhamento_pendente on public.sac_encaminhamento(caso_id,prazo)
  where respondido_em is null;
alter table public.sac_encaminhamento enable row level security;
revoke all on public.sac_encaminhamento from public, anon, authenticated;
grant select,insert,update on public.sac_encaminhamento to authenticated;
create policy sac_encaminhamento_ler on public.sac_encaminhamento for select to authenticated
  using ((select public.sac_pode_ler()));
create policy sac_encaminhamento_criar on public.sac_encaminhamento for insert to authenticated
  with check ((select public.sac_pode_atender()) and enviado_por = (select auth.uid())
    and confirmado_em is null and respondido_em is null);
create policy sac_encaminhamento_atualizar on public.sac_encaminhamento for update to authenticated
  using ((select public.sac_pode_atender()))
  with check ((select public.sac_pode_atender()));

-- Os campos de envio sao imutaveis; apenas recebimento e resposta podem avancar.
create function public.sac_encaminhamento_validar_atualizacao()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    new.enviado_em := now();
    new.enviado_por := auth.uid();
    return new;
  end if;
  if (new.id,new.caso_id,new.area,new.destinatario,new.canal,new.solicitacao,
      new.prazo,new.referencia_envio,new.enviado_em,new.enviado_por)
     is distinct from
     (old.id,old.caso_id,old.area,old.destinatario,old.canal,old.solicitacao,
      old.prazo,old.referencia_envio,old.enviado_em,old.enviado_por) then
    raise exception 'Encaminhamento enviado nao pode ser alterado';
  end if;
  if old.confirmado_em is not null and
    (new.confirmado_em,new.confirmado_por,new.referencia_confirmacao) is distinct from
    (old.confirmado_em,old.confirmado_por,old.referencia_confirmacao) then
    raise exception 'Confirmacao de recebimento nao pode ser alterada';
  end if;
  if old.respondido_em is not null and
    (new.respondido_em,new.respondido_por,new.resposta) is distinct from
    (old.respondido_em,old.respondido_por,old.resposta) then
    raise exception 'Resposta registrada nao pode ser alterada';
  end if;
  if (old.confirmado_em is null and new.confirmado_em is not null and
      new.confirmado_por is distinct from auth.uid()) or
     (old.respondido_em is null and new.respondido_em is not null and
      new.respondido_por is distinct from auth.uid()) then
    raise exception 'Autor do registro deve ser o usuario autenticado';
  end if;
  return new;
end $$;
revoke all on function public.sac_encaminhamento_validar_atualizacao() from public, anon;
create trigger sac_encaminhamento_validar before insert or update on public.sac_encaminhamento
  for each row execute function public.sac_encaminhamento_validar_atualizacao();

create function public.sac_caso_impedir_conclusao_pendente()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.situacao = 'CONCLUIDO' and exists
    (select 1 from public.sac_encaminhamento e
     where e.caso_id = new.caso_id and e.respondido_em is null) then
    raise exception 'Ha encaminhamento aguardando retorno';
  end if;
  return new;
end $$;
revoke all on function public.sac_caso_impedir_conclusao_pendente() from public, anon;
create trigger sac_caso_conclusao_pendente before update on public.sac_caso_tratativa
  for each row execute function public.sac_caso_impedir_conclusao_pendente();
