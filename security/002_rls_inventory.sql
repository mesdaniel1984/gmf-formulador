-- SECURITY GATE — inventário de RLS/grants
-- SOMENTE LEITURA. Não modifica schema nem dados.
--
-- Execute após a contenção P0 e guarde o resultado.
-- Esse inventário é a base para o desenho de políticas autenticadas por tabela.

-- 1) RLS habilitado/forçado?
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'produtos',
    'ingredientes_custom',
    'laudos',
    'perfis',
    'app_state'
  )
order by c.relname;

-- 2) Políticas existentes
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'produtos',
    'ingredientes_custom',
    'laudos',
    'perfis',
    'app_state'
  )
order by tablename, policyname;

-- 3) Grants efetivos declarados
select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'produtos',
    'ingredientes_custom',
    'laudos',
    'perfis',
    'app_state'
  )
  and grantee in ('anon','authenticated','service_role')
order by table_name, grantee, privilege_type;

-- 4) Grants de sequência (útil caso IDs sejam identity/sequence)
select
  grantee,
  object_name,
  privilege_type
from information_schema.role_usage_grants
where object_schema = 'public'
  and grantee in ('anon','authenticated','service_role')
order by object_name, grantee, privilege_type;
