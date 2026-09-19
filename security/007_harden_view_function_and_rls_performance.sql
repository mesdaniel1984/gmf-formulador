-- Migration aplicada no Supabase em 19/09/2026
-- Nome: security_harden_view_function_and_rls_performance

begin;

revoke all privileges on table public.produtos_view from authenticated;
grant select on table public.produtos_view to authenticated;

revoke execute on function public.set_atualizado_em() from public, anon, authenticated;

drop policy if exists "perfis_update" on public.perfis;
create policy "perfis_update"
  on public.perfis for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "produtos_insert" on public.produtos;
create policy "produtos_insert"
  on public.produtos for insert
  to authenticated
  with check ((select auth.uid()) = criado_por);

drop policy if exists "ingredientes_auth_insert" on public.ingredientes_custom;
create policy "ingredientes_auth_insert"
  on public.ingredientes_custom for insert
  to authenticated
  with check ((select auth.uid()) is not null);

drop policy if exists "ingredientes_auth_update" on public.ingredientes_custom;
create policy "ingredientes_auth_update"
  on public.ingredientes_custom for update
  to authenticated
  using (true)
  with check ((select auth.uid()) is not null);

create index if not exists idx_ingredientes_custom_usuario_id
  on public.ingredientes_custom(usuario_id);
create index if not exists idx_laudos_emitido_por
  on public.laudos(emitido_por);
create index if not exists idx_produtos_criado_por
  on public.produtos(criado_por);

commit;
