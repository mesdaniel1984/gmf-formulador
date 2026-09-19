-- Migration aplicada no Supabase em 19/09/2026
-- Nome: security_enable_rls_and_explicit_authenticated_policies

begin;

alter table public.produtos enable row level security;

drop policy if exists "leitura_publica" on public.produtos;
drop policy if exists "escrita_autenticada" on public.produtos;
drop policy if exists "atualizacao_autenticada" on public.produtos;
drop policy if exists "exclusao_autenticada" on public.produtos;

drop policy if exists "leitura_publica_ing" on public.ingredientes_custom;
drop policy if exists "escrita_autenticada_ing" on public.ingredientes_custom;
drop policy if exists "atualizacao_autenticada_ing" on public.ingredientes_custom;

drop policy if exists "ingredientes_auth_select" on public.ingredientes_custom;
drop policy if exists "ingredientes_auth_insert" on public.ingredientes_custom;
drop policy if exists "ingredientes_auth_update" on public.ingredientes_custom;
drop policy if exists "ingredientes_auth_delete" on public.ingredientes_custom;

create policy "ingredientes_auth_select"
  on public.ingredientes_custom for select
  to authenticated using (true);

create policy "ingredientes_auth_insert"
  on public.ingredientes_custom for insert
  to authenticated with check (auth.uid() is not null);

create policy "ingredientes_auth_update"
  on public.ingredientes_custom for update
  to authenticated using (true)
  with check (auth.uid() is not null);

create policy "ingredientes_auth_delete"
  on public.ingredientes_custom for delete
  to authenticated using (true);

drop policy if exists "leitura_publica_laudos" on public.laudos;
drop policy if exists "escrita_autenticada_laudos" on public.laudos;
drop policy if exists "atualizacao_autenticada_laudos" on public.laudos;

drop policy if exists "laudos_delete" on public.laudos;
create policy "laudos_delete"
  on public.laudos for delete
  to authenticated using (true);

commit;
