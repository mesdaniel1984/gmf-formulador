-- FASE 4.1 — Snapshot inicial do legado
-- STATUS: DRAFT / NÃO APLICADA
--
-- Cria exatamente UM snapshot LEGADO por produto existente.
-- Não inventa código de produto.
-- Não inventa número de revisão.
-- Não afirma aprovação, vigência ou conformidade.
--
-- Pré-requisito: 001_product_revision_foundation.sql aplicado.

begin;

insert into public.produto_revisoes(
  produto_id,
  revisao_codigo,
  legacy_revision_text,
  status,
  snapshot,
  motivo_alteracao,
  origem,
  criado_por,
  criado_em,
  atualizado_em
)
select
  p.id,
  null,
  nullif(trim(p.dados->>'revisao'),''),
  'LEGADO',
  jsonb_build_object(
    'nome', p.nome,
    'classificacao', p.classificacao,
    'dados', p.dados
  ),
  'Snapshot inicial do legado; não implica aprovação, vigência ou conformidade.',
  'legacy_snapshot',
  p.criado_por,
  coalesce(p.criado_em, now()),
  coalesce(p.atualizado_em, p.criado_em, now())
from public.produtos p
where not exists (
  select 1
  from public.produto_revisoes r
  where r.produto_id = p.id
    and r.status = 'LEGADO'
);

commit;
