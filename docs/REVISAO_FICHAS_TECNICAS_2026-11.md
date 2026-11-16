# Revisão das Fichas Técnicas — nov/2026

Origem: documento "Revisão do Programa de Geração de Fichas Técnicas GMF Formulador" (Daniel, 11/11/2026).

## O que mudou
- Seções 5 (Microbiologia) e 7 (Contaminantes) da ficha deixaram de ser fixas e iguais para todos os produtos: agora saem de `REGRAS_REG`, por categoria.
- Referências a **IN MAPA nº 28/2007** removidas; leites em pó citam **IN MAPA nº 53/2018 + Decreto 9.013/2017**.
- Achocolatado e Cacau em Pó passam para a **Lei nº 15.404/2026**; Achocolatado: mínimo 15% (antes 32%).
- Mistura Láctea: lácteos **≥ 50%** (antes ≤ 50%) e nova denominação.
- Categorias novas: **Chocolate em Pó** e **Espessante Alimentar**.
- Soro: especificações do parcialmente desmineralizado. Maltodextrina/Glicose: parâmetros por produto (subtipo "Glicose / Dextrose").
- Pro-rata (composto com adição, mistura, pó para preparo): Σ (% do ingrediente × limite de partida), tabela `LIMITES_PARTIDA`; o teto fixo antigo foi removido.

## Decisões de implementação a confirmar
1. Ingrediente sem limite de partida para um parâmetro (ex.: açúcar para Cádmio) contribui com zero, o que deixa o limite mais restritivo. A ficha lista os ingredientes sem limite de partida.
2. Café em grão recebeu a microbiologia cat. 17.b (mesma categoria); o restante do texto legal do grão não foi alterado.
3. Cacau em Pó: os subtipos "magro (< 10% de manteiga)" conflitam com o novo mínimo de 10%.
4. Achocolatado: linhas de sacarose/G.tot/umidade (RDC 264/2005) foram mantidas; conferir se seguem vigentes sob a Lei 15.404/2026.
5. Leite em Pó Integral: umidade segue em ≤ 3,5% (o documento só trata a umidade do instantâneo e do desnatado, ≤ 5%).
6. Chocolate em Pó e Espessante: campos de aspecto, alergênicos, validade e preparo são valores iniciais para revisão.
