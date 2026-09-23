-- Tighten the Data API boundary without changing existing records.
-- Commercial accounts have readonly=true in perfis. They may consult
-- certificates, licences and laudos, but not formulas or internal SGQ data.
begin;

-- A user could previously set their own readonly flag to false. Keep the
-- editable profile fields while withholding the authorization column.
revoke update on public.perfis from authenticated;
grant update (nome, cargo) on public.perfis to authenticated;

drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis for select to authenticated
  using (id = (select auth.uid()) or exists (
    select 1 from public.app_user_roles r
    where r.user_id = (select auth.uid()) and r.role = 'admin'
  ));

-- All remaining direct writes require an active editable profile, even
-- when a client bypasses the navigation or sends its own REST request.
drop policy if exists sq_select on public.app_state;
create policy sq_select on public.app_state for select to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ) or (key in ('docs', 'licencas') and exists (
    select 1 from public.perfis p where p.id = (select auth.uid())
  )));
drop policy if exists sq_insert on public.app_state;
create policy sq_insert on public.app_state for insert to authenticated
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists sq_update on public.app_state;
create policy sq_update on public.app_state for update to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ))
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists sq_delete on public.app_state;
create policy sq_delete on public.app_state for delete to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));

drop policy if exists produtos_select on public.produtos;
create policy produtos_select on public.produtos for select to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists produtos_insert on public.produtos;
create policy produtos_insert on public.produtos for insert to authenticated
  with check (criado_por = (select auth.uid()) and exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists produtos_update on public.produtos;
create policy produtos_update on public.produtos for update to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ))
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists produtos_delete on public.produtos;
create policy produtos_delete on public.produtos for delete to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));

drop policy if exists ingredientes_auth_select on public.ingredientes_custom;
create policy ingredientes_auth_select on public.ingredientes_custom for select to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists ingredientes_auth_insert on public.ingredientes_custom;
create policy ingredientes_auth_insert on public.ingredientes_custom for insert to authenticated
  with check (usuario_id = (select auth.uid()) and exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists ingredientes_auth_update on public.ingredientes_custom;
create policy ingredientes_auth_update on public.ingredientes_custom for update to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ))
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists ingredientes_auth_delete on public.ingredientes_custom;
create policy ingredientes_auth_delete on public.ingredientes_custom for delete to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));

drop policy if exists laudos_select on public.laudos;
create policy laudos_select on public.laudos for select to authenticated
  using (exists (
    select 1 from public.perfis p where p.id = (select auth.uid())
  ));
drop policy if exists laudos_insert on public.laudos;
create policy laudos_insert on public.laudos for insert to authenticated
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists laudos_update on public.laudos;
create policy laudos_update on public.laudos for update to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ))
  with check (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));
drop policy if exists laudos_delete on public.laudos;
create policy laudos_delete on public.laudos for delete to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));

drop policy if exists produto_revisoes_select_auth on public.produto_revisoes;
create policy produto_revisoes_select_auth on public.produto_revisoes for select to authenticated
  using (exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.readonly is false
  ));

commit;
