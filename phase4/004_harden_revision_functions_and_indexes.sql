-- FASE 4.1 — hardening pós-advisor
-- Migration aplicada no Supabase em 19/09/2026
-- Nome: phase4_1_harden_revision_functions_and_indexes

begin;

revoke execute on function public.produto_revisao_audit()
  from public, anon, authenticated;

revoke execute on function public.produto_revisao_guard()
  from public, anon, authenticated;

create index if not exists idx_produto_revisoes_criado_por
  on public.produto_revisoes(criado_por);

create index if not exists idx_produto_revisoes_aprovado_por
  on public.produto_revisoes(aprovado_por);

create index if not exists idx_produto_revisoes_rejeitada_por
  on public.produto_revisoes(rejeitada_por);

commit;
