-- SECURITY GATE P0 — contenção imediata de acesso anônimo
-- Data: 2026-09-19
--
-- Objetivo:
--   impedir que a chave publishable/anon leia ou altere dados das tabelas
--   internas antes de existir uma sessão autenticada.
--
-- IMPORTANTE:
--   1. Este arquivo NÃO altera grants do papel authenticated.
--   2. Este arquivo NÃO substitui o desenho completo de RLS.
--   3. Aplicar no Supabase SQL Editor / migration somente após backup normal.
--   4. Depois de aplicar, rerodar o gate anônimo e testar login GMF + SGQ.
--
-- Evidência pré-hotfix:
--   produtos             -> anon SELECT EXPOSED
--   ingredientes_custom  -> anon SELECT EXPOSED
--   laudos               -> anon SELECT EXPOSED
--   perfis               -> sem linha exposta no teste
--   app_state            -> sem linha exposta no teste
--
-- Revogamos anon das cinco por defesa em profundidade.

begin;

revoke all privileges on table public.produtos            from anon;
revoke all privileges on table public.ingredientes_custom from anon;
revoke all privileges on table public.laudos              from anon;
revoke all privileges on table public.perfis              from anon;
revoke all privileges on table public.app_state           from anon;

-- Evita que NOVAS tabelas criadas pelo papel postgres voltem a conceder
-- privilégios ao papel anon por default privilege.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon;

commit;

-- Pós-condição esperada:
-- chamadas REST com a publishable/anon key, sem JWT de usuário,
-- devem retornar 401/403 ou lista vazia por RLS/grants, nunca linhas reais.
