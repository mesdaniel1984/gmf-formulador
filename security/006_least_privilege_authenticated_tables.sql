-- Migration aplicada no Supabase em 19/09/2026
-- Nome: security_least_privilege_authenticated_tables

begin;

revoke all privileges on table public.produtos            from authenticated;
revoke all privileges on table public.ingredientes_custom from authenticated;
revoke all privileges on table public.laudos              from authenticated;
revoke all privileges on table public.perfis              from authenticated;
revoke all privileges on table public.app_state           from authenticated;

grant select, insert, update, delete
  on table public.produtos
  to authenticated;

grant select, insert, update, delete
  on table public.ingredientes_custom
  to authenticated;

grant select, insert, update, delete
  on table public.laudos
  to authenticated;

grant select, update
  on table public.perfis
  to authenticated;

grant select, insert, update, delete
  on table public.app_state
  to authenticated;

commit;
