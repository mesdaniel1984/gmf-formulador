-- SECURITY HARDENING — view e funções expostas
-- Aplicado no Supabase em 19/09/2026.

-- A view passa a respeitar privilégios/RLS do chamador.
alter view public.produtos_view set (security_invoker = true);

-- A chave anon não pode consultar a view.
revoke all privileges on table public.produtos_view from anon;

-- A trigger function continua disponível ao Auth interno,
-- mas deixa de ser um RPC chamável por clientes.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Search path fixo reduz risco de resolução indevida de objetos.
alter function public.handle_new_user() set search_path = pg_catalog, public;
alter function public.set_atualizado_em() set search_path = pg_catalog, public;
