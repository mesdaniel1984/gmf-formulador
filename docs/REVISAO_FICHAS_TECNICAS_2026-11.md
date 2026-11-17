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

## Correções de 16/11/2026 (documento "CORREÇÕES NO FORMULADOR")

- **Embalagens:** opções **300 g** e **Outra** (quantidade digitada em g ou kg) em todas as listas de embalagem; a quantidade digitada atualiza peso, gramatura, embalagem primária/secundária e vai para a ficha.
- **Ingrediente:** 76 campos novos de composição (polióis, polidextrose, amido, galactose, lactose, gorduras mono/poli, ômega 3/6/9, EPA, DHA, colesterol, fibras solúveis/insolúveis, vitaminas, minerais, bioativos e aminoácidos), em seção recolhível "Composição completa". São salvos no ingrediente (chaves `x_*`) e somados na fórmula (`calcT`). **Ainda não aparecem na tabela nutricional da ficha.**
- **Porções por embalagem:** campo automático (peso ÷ porção, inteiro mais próximo, "cerca de N") na tela e na tabela.
- **Medida caseira** por porção; **várias porções** com título de coluna, porções por embalagem e medida caseira de cada bloco (espessante: Néctar 4 g, Mel 6 g, Pudim 8 g; coluna de referência "100 mL**").
- **Nutrientes suprimidos:** quando todos os "demais" (açúcares totais e adicionados, proteínas, gorduras totais/saturadas/trans, fibras, sódio) são não significativos em todas as colunas, as linhas são omitidas e aparece "Não contém quantidades significativas de …".
- **Café:** bebida (IN 75, Anexo V): porção 200 ml com o pó por porção (campo, padrão 20 g), colunas 100 ml**, 200 ml e %VD*, todos os nutrientes 0, linhas ocultas, frase obrigatória e nota "**No alimento pronto para o consumo".

Pontos a confirmar com a Qualidade: omissão só quando **todos** os demais nutrientes são não significativos (não omite linha a linha); arredondamento de porções por embalagem do café pelo inteiro mais próximo (Anexo VI não conferido); pó por porção do café = 20 g (exemplo do documento), editável.

## 17/11/2026 — Umidade, pH e acidez por produto
Campos **Umidade (%)**, **pH** e **Acidez total titulável** no preenchimento do produto, salvos por produto. Na ficha (seção "Padrões físico-químicos") cada item só aparece se preenchido. Antes, umidade e pH saíam com valores padrão ("Máx. 4,0" e "6,0 a 7,0") mesmo sem preenchimento; agora saem vazios até serem preenchidos.

## 17/11/2026 — Legislação do café, partículas queimadas e fabricante
- **Café** (moído e grão): base legal atualizada para Portaria MAPA 570/2022, RDC 716/2022 (que consolidou a RDC 277/2005), RDC 727/2022, RDC 429/2020 + IN 75/2020, Lei 10.674/2003 e Decreto 12.709/2025. Novos campos "Rotulagem do café": tipo (Tipo Único/Fora de Tipo), espécie e ponto de torra (obrigatórios; a ficha avisa quando não preenchidos) e grau de moagem (opcional, só moído). Padrões da ficha: matérias estranhas e impurezas máx. 1,0%; elementos estranhos ausência; extrato aquoso mín. 20%; cafeína mín. 0,5%.
- Removidos do café: "NÃO CONTÉM LACTOSE" (a Lei 10.674 trata só de glúten) e a frase "estabelecimento inspecionado pelo Mapa" (produto de origem vegetal, sem SIF). Removidos do texto de apoio os limites que não constam das fontes consultadas (umidade ≤5%, extrato aquoso 25–35%, cafeína ≥0,7%, tipos 1–8 da IN 16/2010).
- **Partículas queimadas:** aparecem só em leite e derivados (leite em pó, compostos lácteos, mistura e soro); ocultas nos demais produtos.
- **Fabricante** (razão social, CNPJ e endereço) em todas as fichas: DMS (padrão) ou MFPARIS (padrão no café), editável por produto.

A confirmar: Decreto 12.709/2025 foi lido só pela ementa (fiscalização de produtos de origem vegetal); endereço da DMS (Rua Beta 387) e da MFPARIS (Rua Beta 378) conforme o cadastro; fabricante dos tipos sem definição (cacau, chocolate em pó, maltodextrina, glicose, suplemento, espessante, pó para preparo) ficou como DMS.
