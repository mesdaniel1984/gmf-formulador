-- Migration aplicada no Supabase em 19/09/2026
-- Nome: security_remove_duplicate_product_policies

begin;

drop policy if exists "Usuarios podem ver produtos" on public.produtos;
drop policy if exists "Usuarios podem salvar produtos" on public.produtos;
drop policy if exists "Usuarios podem atualizar produtos" on public.produtos;
drop policy if exists "Usuarios podem deletar produtos" on public.produtos;

commit;
