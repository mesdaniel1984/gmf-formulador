-- Run with migrations installed and existing provisioned Admin/Commercial profiles.
-- Read-only source checks; transaction always rolled back by the runner on error.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.app_user_roles where role='admin' limit 1),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $$ begin
 if jsonb_array_length(public.painel_admin_dados()->'laudos') <> (select count(*) from public.laudos) then
   raise exception 'Dashboard source count mismatch';
 end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id from public.perfis where nome='comercial' limit 1),'role','authenticated','is_anonymous',false)::text,true);
set local role authenticated;
do $$ begin
 perform public.painel_admin_dados(); raise exception 'Commercial unexpectedly allowed';
 exception when insufficient_privilege then null;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$ begin
 perform public.painel_admin_dados(); raise exception 'Unassigned user unexpectedly allowed';
 exception when insufficient_privilege then null;
end $$;
reset role;
set local role anon;
do $$ begin
 perform public.painel_admin_dados(); raise exception 'Anon unexpectedly allowed';
 exception when insufficient_privilege then null;
end $$;
reset role;
select 'PASS: Admin fonte real; Comercial, usuario sem papel e anon recusados' as resultado;
rollback;
