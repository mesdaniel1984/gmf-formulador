-- FASE 4.1 — Fundação do ciclo de vida do produto
-- STATUS: DRAFT / NÃO APLICADA
--
-- Princípios:
-- 1. Não altera public.produtos nem o formato JSON legado.
-- 2. Cada revisão controlada é um snapshot imutável após aprovação/vigência.
-- 3. LEGADO é um snapshot histórico, não um estado de aprovação.
-- 4. Nenhuma policy de escrita frontend é criada nesta fase.
-- 5. Audit trail é gerado pelo banco, não pelo JavaScript do cliente.

begin;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  origin text not null default 'db',
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Sem policies para anon/authenticated nesta fase:
-- o frontend não lê, não escreve e não altera o audit trail.

create index if not exists idx_audit_log_entity
  on public.audit_log(entity_type, entity_id, created_at desc);

create index if not exists idx_audit_log_actor
  on public.audit_log(actor_id, created_at desc);

create table if not exists public.produto_revisoes (
  id uuid primary key default gen_random_uuid(),

  produto_id bigint not null
    references public.produtos(id)
    on delete restrict,

  -- Revisão controlada. NULL somente para snapshot LEGADO.
  revisao_codigo text,

  -- Preserva literalmente o valor encontrado no JSON legado, inclusive NULL.
  legacy_revision_text text,

  status text not null default 'RASCUNHO'
    check (
      status in (
        'LEGADO',
        'RASCUNHO',
        'EM_REVISAO',
        'AGUARDANDO_APROVACAO',
        'APROVADA',
        'VIGENTE',
        'OBSOLETA',
        'REJEITADA',
        'CANCELADA'
      )
    ),

  -- Snapshot completo da especificação/fórmula daquela revisão.
  snapshot jsonb not null
    check (jsonb_typeof(snapshot) = 'object'),

  motivo_alteracao text,

  origem text not null default 'manual'
    check (
      origem in (
        'manual',
        'legacy_snapshot',
        'sandbox_promotion'
      )
    ),

  criado_por uuid not null
    references auth.users(id)
    on delete restrict,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  enviado_aprovacao_em timestamptz,

  aprovado_por uuid
    references auth.users(id)
    on delete restrict,
  aprovado_em timestamptz,

  vigente_desde timestamptz,
  obsoleta_em timestamptz,

  rejeitada_por uuid
    references auth.users(id)
    on delete restrict,
  rejeitada_em timestamptz,
  rejeicao_motivo text,

  lock_version integer not null default 1
    check (lock_version >= 1),

  check (
    (status = 'LEGADO' and revisao_codigo is null)
    or
    (
      status <> 'LEGADO'
      and nullif(btrim(revisao_codigo),'') is not null
    )
  ),

  check (
    status not in ('APROVADA','VIGENTE','OBSOLETA')
    or (aprovado_por is not null and aprovado_em is not null)
  ),

  check (
    status <> 'VIGENTE'
    or vigente_desde is not null
  ),

  check (
    status <> 'OBSOLETA'
    or obsoleta_em is not null
  ),

  check (
    status <> 'REJEITADA'
    or (rejeitada_por is not null and rejeitada_em is not null)
  )
);

alter table public.produto_revisoes enable row level security;

-- Nesta fase não há policies de frontend.
-- F4.2 criará policies/RPCs depois do modelo de papéis estar fechado.

create unique index if not exists ux_produto_revisao_controlada
  on public.produto_revisoes(produto_id, revisao_codigo)
  where revisao_codigo is not null;

create unique index if not exists ux_produto_revisao_um_legado
  on public.produto_revisoes(produto_id)
  where status = 'LEGADO';

create unique index if not exists ux_produto_revisao_uma_vigente
  on public.produto_revisoes(produto_id)
  where status = 'VIGENTE';

create index if not exists idx_produto_revisoes_status
  on public.produto_revisoes(status, produto_id);

create index if not exists idx_produto_revisoes_produto
  on public.produto_revisoes(produto_id, criado_em desc);

create or replace function public.produto_revisao_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  transicao_ok boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- Identidade da revisão não pode ser reciclada.
  if new.produto_id is distinct from old.produto_id then
    raise exception 'produto_id da revisão é imutável';
  end if;

  if new.revisao_codigo is distinct from old.revisao_codigo then
    raise exception 'revisao_codigo é imutável';
  end if;

  if new.legacy_revision_text is distinct from old.legacy_revision_text then
    raise exception 'legacy_revision_text é imutável';
  end if;

  if new.origem is distinct from old.origem then
    raise exception 'origem da revisão é imutável';
  end if;

  if new.criado_por is distinct from old.criado_por
     or new.criado_em is distinct from old.criado_em then
    raise exception 'autoria original da revisão é imutável';
  end if;

  -- Não permite alterar conteúdo já congelado nem alterar conteúdo
  -- no mesmo comando que promove a revisão a um estado controlado.
  if (
       old.status in ('LEGADO','APROVADA','VIGENTE','OBSOLETA','CANCELADA')
       or new.status in ('APROVADA','VIGENTE','OBSOLETA')
     )
     and new.snapshot is distinct from old.snapshot then
    raise exception 'snapshot imutável na promoção/estado % -> %', old.status, new.status;
  end if;

  -- Metadados de aprovação já registrados não podem ser reescritos.
  if old.status in ('APROVADA','VIGENTE','OBSOLETA')
     and (
       new.aprovado_por is distinct from old.aprovado_por
       or new.aprovado_em is distinct from old.aprovado_em
     ) then
    raise exception 'metadados de aprovação são imutáveis após aprovação';
  end if;

  if old.status in ('VIGENTE','OBSOLETA')
     and new.vigente_desde is distinct from old.vigente_desde then
    raise exception 'vigente_desde é imutável após vigência';
  end if;

  if old.status = 'LEGADO' and new.status is distinct from old.status then
    raise exception 'snapshot LEGADO é histórico e não muda de status; crie uma nova revisão controlada';
  end if;

  if new.status = old.status then
    transicao_ok := true;
  elsif old.status = 'RASCUNHO'
        and new.status in ('EM_REVISAO','CANCELADA') then
    transicao_ok := true;
  elsif old.status = 'EM_REVISAO'
        and new.status in ('RASCUNHO','AGUARDANDO_APROVACAO','CANCELADA') then
    transicao_ok := true;
  elsif old.status = 'AGUARDANDO_APROVACAO'
        and new.status in ('EM_REVISAO','APROVADA','REJEITADA','CANCELADA') then
    transicao_ok := true;
  elsif old.status = 'REJEITADA'
        and new.status in ('RASCUNHO','CANCELADA') then
    transicao_ok := true;
  elsif old.status = 'APROVADA'
        and new.status in ('VIGENTE','CANCELADA') then
    transicao_ok := true;
  elsif old.status = 'VIGENTE'
        and new.status = 'OBSOLETA' then
    transicao_ok := true;
  end if;

  if not transicao_ok then
    raise exception 'transição de status inválida: % -> %', old.status, new.status;
  end if;

  new.atualizado_em := now();
  new.lock_version := old.lock_version + 1;

  return new;
end;
$$;

drop trigger if exists trg_produto_revisao_guard on public.produto_revisoes;
create trigger trg_produto_revisao_guard
before update on public.produto_revisoes
for each row
execute function public.produto_revisao_guard();

create or replace function public.produto_revisao_audit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_id uuid;
begin
  v_actor := auth.uid();

  if tg_op = 'DELETE' then
    v_id := old.id;
  else
    v_id := new.id;
  end if;

  insert into public.audit_log(
    entity_type,
    entity_id,
    action,
    before_data,
    after_data,
    actor_id,
    origin
  )
  values (
    'produto_revisao',
    v_id::text,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    v_actor,
    'db_trigger'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$;

drop trigger if exists trg_produto_revisao_audit on public.produto_revisoes;
create trigger trg_produto_revisao_audit
after insert or update or delete on public.produto_revisoes
for each row
execute function public.produto_revisao_audit();

-- Audit trail deve continuar append-only para papéis de aplicação.
revoke all privileges on table public.audit_log from anon, authenticated;
revoke all privileges on table public.produto_revisoes from anon, authenticated;

commit;
