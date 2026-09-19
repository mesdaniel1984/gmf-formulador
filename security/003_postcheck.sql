-- SECURITY GATE P0 — pós-check
-- SOMENTE LEITURA. Execute depois de 001_revoke_anon.sql.

-- Esperado: ZERO linhas para grantee = anon nas cinco tabelas.
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
  and grantee = 'anon'
order by table_name, privilege_type;

-- Grants de authenticated devem continuar presentes conforme a operação atual.
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
  and grantee = 'authenticated'
order by table_name, privilege_type;

-- RLS/policies continuam sendo inventariados; a contenção P0 não apaga policies.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname='public'
  and tablename in (
    'produtos',
    'ingredientes_custom',
    'laudos',
    'perfis',
    'app_state'
  )
order by tablename, policyname;
