-- FASE 4.1 — Validação e reconciliação do legado
-- SOMENTE LEITURA.

-- 1) Deve haver exatamente 1 LEGADO por produto após o snapshot.
select
  p.id as produto_id,
  count(r.id) filter (where r.status='LEGADO') as snapshots_legado
from public.produtos p
left join public.produto_revisoes r on r.produto_id=p.id
group by p.id
having count(r.id) filter (where r.status='LEGADO') <> 1;

-- Esperado: zero linhas.

-- 2) Situação dos dados que NÃO podem ser inferidos automaticamente.
with p as (
  select
    id,
    nullif(trim(dados->>'codigo'),'') as codigo,
    nullif(trim(dados->>'revisao'),'') as revisao,
    jsonb_array_length(dados->'ingredientes') as n_ingredientes
  from public.produtos
),
dup as (
  select codigo,count(*) as qtd
  from p
  where codigo is not null
  group by codigo
  having count(*)>1
)
select
  count(*)::int as produtos,
  count(*) filter (where codigo is null)::int as codigo_ausente,
  count(*) filter (where revisao is null)::int as revisao_ausente,
  count(*) filter (where n_ingredientes=0)::int as formula_vazia,
  (select count(*) from dup)::int as codigos_duplicados
from p;

-- Baseline observada em 19/09/2026:
-- produtos = 43
-- codigo_ausente = 32
-- revisao_ausente = 28
-- formula_vazia = 0
-- codigos_duplicados = 2
--
-- Estes números são evidência do legado, não alvo para preenchimento automático.

-- 3) Laudos continuam ligados por produto_id.
select
  count(*)::int as laudos_total,
  count(*) filter (where produto_id is null)::int as laudos_sem_produto_id
from public.laudos;

-- Baseline observada:
-- laudos_total = 101
-- laudos_sem_produto_id = 0

-- 4) Nenhuma revisão controlada pode existir sem revisao_codigo.
select id,produto_id,status
from public.produto_revisoes
where status <> 'LEGADO'
  and revisao_codigo is null;

-- Esperado: zero linhas.

-- 5) Só pode existir uma revisão VIGENTE por produto.
select produto_id,count(*) as vigentes
from public.produto_revisoes
where status='VIGENTE'
group by produto_id
having count(*)>1;

-- Esperado: zero linhas.

-- 6) LEGADO nunca deve ser interpretado como aprovado.
select id,produto_id,legacy_revision_text
from public.produto_revisoes
where status='LEGADO'
  and (
    aprovado_em is not null
    or aprovado_por is not null
    or vigente_desde is not null
  );

-- Esperado: zero linhas.
