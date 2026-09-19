-- FASE 4.2 — RBAC + RPCs de revisão controlada
-- STATUS: DRAFT / NÃO APLICADA
--
-- Dependências:
--   F4.1 aplicada: public.produto_revisoes + public.audit_log
--
-- Princípios:
--   - nenhuma escrita direta em produto_revisoes pelo frontend;
--   - ações críticas passam por RPC SECURITY DEFINER com validações explícitas;
--   - papéis NÃO são inferidos de cargo/nome;
--   - usuário readonly não cria/avança revisão;
--   - aprovação e vigência têm segregação de função.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.app_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (
      role in (
        'admin',
        'rd',
        'quality',
        'regulatory',
        'procurement',
        'production',
        'auditor',
        'executive'
      )
    ),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key(user_id, role)
);

alter table public.app_user_roles enable row level security;

revoke all privileges on table public.app_user_roles from anon, authenticated;
grant select on table public.app_user_roles to authenticated;

drop policy if exists app_user_roles_select_self on public.app_user_roles;
create policy app_user_roles_select_self
  on public.app_user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create index if not exists idx_app_user_roles_assigned_by
  on public.app_user_roles(assigned_by);

create or replace function private.has_app_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists(
    select 1
    from public.app_user_roles r
    where r.user_id = (select auth.uid())
      and r.role = p_role
  )
$fn$;

revoke all on function private.has_app_role(text) from public, anon, authenticated;

create or replace function private.usuario_editavel()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists(
    select 1
    from public.perfis p
    where p.id = (select auth.uid())
      and coalesce(p.readonly,false) = false
  )
$fn$;

revoke all on function private.usuario_editavel() from public, anon, authenticated;

create or replace function private.pode_editar_revisao(p_criado_por uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    (select auth.uid()) = p_criado_por
    or private.has_app_role('rd')
    or private.has_app_role('admin')
$fn$;

revoke all on function private.pode_editar_revisao(uuid) from public, anon, authenticated;

-- Frontend pode LER revisões, mas continua sem INSERT/UPDATE/DELETE direto.
grant select on table public.produto_revisoes to authenticated;

drop policy if exists produto_revisoes_select_auth on public.produto_revisoes;
create policy produto_revisoes_select_auth
  on public.produto_revisoes
  for select
  to authenticated
  using ((select auth.uid()) is not null);

-- Cada usuário lê apenas seus próprios papéis.
-- Audit log continua invisível para frontend nesta fase.

create or replace function private.audit_app_user_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id text;
begin
  v_id := coalesce(new.user_id,old.user_id)::text || ':' || coalesce(new.role,old.role);

  insert into public.audit_log(
    entity_type,entity_id,action,before_data,after_data,actor_id,origin
  )
  values(
    'app_user_role',
    v_id,
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

revoke all on function private.audit_app_user_role() from public, anon, authenticated;

drop trigger if exists trg_app_user_role_audit on public.app_user_roles;
create trigger trg_app_user_role_audit
after insert or update or delete on public.app_user_roles
for each row execute function private.audit_app_user_role();

-- CRIAR RASCUNHO a partir do estado atual do produto legado.
create or replace function public.criar_revisao_produto(
  p_produto_id bigint,
  p_revisao_codigo text,
  p_motivo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_snapshot jsonb;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not private.usuario_editavel() then
    raise exception 'READONLY_USER';
  end if;

  if nullif(btrim(p_revisao_codigo),'') is null then
    raise exception 'REVISION_CODE_REQUIRED';
  end if;

  if nullif(btrim(p_motivo),'') is null then
    raise exception 'CHANGE_REASON_REQUIRED';
  end if;

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

  insert into public.produto_revisoes(
    produto_id,
    revisao_codigo,
    status,
    snapshot,
    motivo_alteracao,
    origem,
    criado_por
  )
  values(
    p_produto_id,
    btrim(p_revisao_codigo),
    'RASCUNHO',
    v_snapshot,
    btrim(p_motivo),
    'manual',
    v_user
  )
  returning id into v_id;

  return v_id;
end;
$fn$;

-- Recarrega o snapshot do produto atual enquanto a revisão ainda é editável.
create or replace function public.atualizar_snapshot_revisao(
  p_revisao_id uuid,
  p_expected_lock_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_rev public.produto_revisoes%rowtype;
  v_snapshot jsonb;
  v_lock integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.usuario_editavel() then raise exception 'READONLY_USER'; end if;

  select * into v_rev
  from public.produto_revisoes
  where id=p_revisao_id
  for update;

  if not found then raise exception 'REVISION_NOT_FOUND'; end if;
  if v_rev.lock_version <> p_expected_lock_version then raise exception 'REVISION_CONFLICT'; end if;
  if v_rev.status not in ('RASCUNHO','EM_REVISAO') then raise exception 'REVISION_NOT_EDITABLE'; end if;
  if not private.pode_editar_revisao(v_rev.criado_por) then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object(
    'nome',p.nome,
    'classificacao',p.classificacao,
    'dados',p.dados
  )
  into v_snapshot
  from public.produtos p
  where p.id=v_rev.produto_id;

  update public.produto_revisoes
     set snapshot=v_snapshot
   where id=p_revisao_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.iniciar_revisao(
  p_revisao_id uuid,
  p_expected_lock_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_rev public.produto_revisoes%rowtype;
  v_lock integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.usuario_editavel() then raise exception 'READONLY_USER'; end if;

  select * into v_rev
  from public.produto_revisoes
  where id=p_revisao_id
  for update;

  if not found then raise exception 'REVISION_NOT_FOUND'; end if;
  if v_rev.lock_version <> p_expected_lock_version then raise exception 'REVISION_CONFLICT'; end if;
  if v_rev.status <> 'RASCUNHO' then raise exception 'INVALID_STATUS'; end if;
  if not private.pode_editar_revisao(v_rev.criado_por) then raise exception 'FORBIDDEN'; end if;

  update public.produto_revisoes
     set status='EM_REVISAO'
   where id=p_revisao_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.submeter_revisao_aprovacao(
  p_revisao_id uuid,
  p_expected_lock_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_rev public.produto_revisoes%rowtype;
  v_lock integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.usuario_editavel() then raise exception 'READONLY_USER'; end if;

  select * into v_rev
  from public.produto_revisoes
  where id=p_revisao_id
  for update;

  if not found then raise exception 'REVISION_NOT_FOUND'; end if;
  if v_rev.lock_version <> p_expected_lock_version then raise exception 'REVISION_CONFLICT'; end if;
  if v_rev.status <> 'EM_REVISAO' then raise exception 'INVALID_STATUS'; end if;
  if not private.pode_editar_revisao(v_rev.criado_por) then raise exception 'FORBIDDEN'; end if;

  update public.produto_revisoes
     set status='AGUARDANDO_APROVACAO',
         enviado_aprovacao_em=now()
   where id=p_revisao_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.aprovar_revisao_produto(
  p_revisao_id uuid,
  p_expected_lock_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_rev public.produto_revisoes%rowtype;
  v_lock integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  if not (
    private.has_app_role('quality')
    or private.has_app_role('regulatory')
    or private.has_app_role('admin')
  ) then
    raise exception 'APPROVER_ROLE_REQUIRED';
  end if;

  select * into v_rev
  from public.produto_revisoes
  where id=p_revisao_id
  for update;

  if not found then raise exception 'REVISION_NOT_FOUND'; end if;
  if v_rev.lock_version <> p_expected_lock_version then raise exception 'REVISION_CONFLICT'; end if;
  if v_rev.status <> 'AGUARDANDO_APROVACAO' then raise exception 'INVALID_STATUS'; end if;

  update public.produto_revisoes
     set status='APROVADA',
         aprovado_por=v_user,
         aprovado_em=now()
   where id=p_revisao_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.rejeitar_revisao_produto(
  p_revisao_id uuid,
  p_expected_lock_version integer,
  p_motivo text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user uuid := auth.uid();
  v_rev public.produto_revisoes%rowtype;
  v_lock integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  if not (
    private.has_app_role('quality')
    or private.has_app_role('regulatory')
    or private.has_app_role('admin')
  ) then
    raise exception 'APPROVER_ROLE_REQUIRED';
  end if;

  if nullif(btrim(p_motivo),'') is null then
    raise exception 'REJECTION_REASON_REQUIRED';
  end if;

  select * into v_rev
  from public.produto_revisoes
  where id=p_revisao_id
  for update;

  if not found then raise exception 'REVISION_NOT_FOUND'; end if;
  if v_rev.lock_version <> p_expected_lock_version then raise exception 'REVISION_CONFLICT'; end if;
  if v_rev.status <> 'AGUARDANDO_APROVACAO' then raise exception 'INVALID_STATUS'; end if;

  update public.produto_revisoes
     set status='REJEITADA',
         rejeitada_por=v_user,
         rejeitada_em=now(),
         rejeicao_motivo=btrim(p_motivo)
   where id=p_revisao_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.reabrir_revisao_produto(
  p_revisao_id uuid,
  p_expected_lock_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_rev public.produto_revisoes%rowtype;
  v_lock integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.usuario_editavel() then raise exception 'READONLY_USER'; end if;

  select * into v_rev
  from public.produto_revisoes
  where id=p_revisao_id
  for update;

  if not found then raise exception 'REVISION_NOT_FOUND'; end if;
  if v_rev.lock_version <> p_expected_lock_version then raise exception 'REVISION_CONFLICT'; end if;
  if v_rev.status <> 'REJEITADA' then raise exception 'INVALID_STATUS'; end if;
  if not private.pode_editar_revisao(v_rev.criado_por) then raise exception 'FORBIDDEN'; end if;

  update public.produto_revisoes
     set status='RASCUNHO',
         rejeitada_por=null,
         rejeitada_em=null,
         rejeicao_motivo=null
   where id=p_revisao_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

create or replace function public.colocar_revisao_vigente(
  p_revisao_id uuid,
  p_expected_lock_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_rev public.produto_revisoes%rowtype;
  v_lock integer;
  v_product_lock bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  if not (
    private.has_app_role('quality')
    or private.has_app_role('admin')
  ) then
    raise exception 'EFFECTIVE_ROLE_REQUIRED';
  end if;

  select * into v_rev
  from public.produto_revisoes
  where id=p_revisao_id
  for update;

  if not found then raise exception 'REVISION_NOT_FOUND'; end if;
  if v_rev.lock_version <> p_expected_lock_version then raise exception 'REVISION_CONFLICT'; end if;
  if v_rev.status <> 'APROVADA' then raise exception 'INVALID_STATUS'; end if;

  -- Serializa a troca de vigência por produto.
  select p.id into v_product_lock
  from public.produtos p
  where p.id=v_rev.produto_id
  for update;

  update public.produto_revisoes
     set status='OBSOLETA',
         obsoleta_em=now()
   where produto_id=v_rev.produto_id
     and status='VIGENTE'
     and id<>p_revisao_id;

  update public.produto_revisoes
     set status='VIGENTE',
         vigente_desde=now()
   where id=p_revisao_id
  returning lock_version into v_lock;

  return v_lock;
end;
$fn$;

-- Public RPCs: somente authenticated.
revoke all on function public.criar_revisao_produto(bigint,text,text) from public, anon;
revoke all on function public.atualizar_snapshot_revisao(uuid,integer) from public, anon;
revoke all on function public.iniciar_revisao(uuid,integer) from public, anon;
revoke all on function public.submeter_revisao_aprovacao(uuid,integer) from public, anon;
revoke all on function public.aprovar_revisao_produto(uuid,integer) from public, anon;
revoke all on function public.rejeitar_revisao_produto(uuid,integer,text) from public, anon;
revoke all on function public.reabrir_revisao_produto(uuid,integer) from public, anon;
revoke all on function public.colocar_revisao_vigente(uuid,integer) from public, anon;

grant execute on function public.criar_revisao_produto(bigint,text,text) to authenticated;
grant execute on function public.atualizar_snapshot_revisao(uuid,integer) to authenticated;
grant execute on function public.iniciar_revisao(uuid,integer) to authenticated;
grant execute on function public.submeter_revisao_aprovacao(uuid,integer) to authenticated;
grant execute on function public.aprovar_revisao_produto(uuid,integer) to authenticated;
grant execute on function public.rejeitar_revisao_produto(uuid,integer,text) to authenticated;
grant execute on function public.reabrir_revisao_produto(uuid,integer) to authenticated;
grant execute on function public.colocar_revisao_vigente(uuid,integer) to authenticated;

commit;
