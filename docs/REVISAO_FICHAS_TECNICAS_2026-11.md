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

## 18/11/2026 — Nutrientes opcionais na tabela nutricional

Pedido: vitaminas, minerais e demais nutrientes opcionais do cadastro do ingrediente (fibras específicas, gorduras mono/poli-insaturadas, lactose, galactose etc.) preenchidos com valor > 0 entram automaticamente na tabela, com 100 g, porção e %VD.

- Posição: ordem e recuo do **Anexo XI da IN 75/2020**. Lactose/galactose/polióis/polidextrose/amido logo abaixo dos açúcares; aminoácidos abaixo de proteínas (em mg); mono, poli-insaturadas (ômega 9/6/3, EPA, DHA) e colesterol abaixo de gorduras trans; fibras solúveis/insolúveis abaixo de fibras alimentares; vitaminas, minerais, colina, taurina e bioativos logo abaixo do sódio.
- %VD: VDR do **Anexo II da IN 75/2020** (alimentos em geral), na unidade do campo (ex.: vitamina A 800 µg RAE, cálcio 1000 mg). Sem VDR no Anexo II (lactose, aminoácidos, bioativos, boro, silício etc.): "—".
- Arredondamento do Anexo III (≥10 inteiro; 1 a <10 uma casa; <1 mg/µg duas casas). Valor zero não aparece. Café (bebida) segue com tudo zero.
- Se as linhas obrigatórias estiverem todas em QNS, continuam omitidas e os opcionais preenchidos aparecem.
- Muitas linhas: acima de 14 linhas a tabela reduz a altura/fonte; com cerca de 20 linhas opcionais a ficha ainda cabe em 1 página; com quase todos os campos preenchidos (~45 linhas) passa para 2 páginas.

**Para confirmar:** os %VD das linhas já existentes (proteínas 75 g, gorduras totais 55 g, saturadas 22 g, sódio 2300 mg) vêm de revisão anterior e diferem do Anexo II para alimentos em geral (proteínas 50 g, gorduras totais 65 g, saturadas 20 g, sódio 2000 mg). Não foram alterados.

## 18/11/2026 (2) — Correções do documento "Correções 18-11" (itens 2, 3, 4 e 5)

- **Item 2 — gramaturas:** novo campo "Outras gramaturas da ficha" (ex.: 300 g, 1 kg). A tabela nutricional mostra "Porções por embalagem: cerca de 25 kg: 962 · 300 g: 12 · 1 kg: 38". Com uma gramatura só, o texto é o de antes.
- **Item 3 — vitaminas:** na lista de ingredientes a letra da vitamina sai em maiúscula (vitamina A, B12; vitaminas C, D e E).
- **Item 4 — ingredientes:** editar e excluir já existiam para ingredientes cadastrados (usuários com permissão de escrita). Ao clicar em Editar, a "Composição completa" (macro e micronutrientes) agora abre já expandida.
- **Item 5 — %VD (alimentos em geral, IN 75/2020, Anexo II):** proteínas 50 g, gorduras totais 65 g, saturadas 20 g, sódio 2000 mg (antes 75/55/22/2300).
- **Item 1 — produto sem lactose:** novo campo "Produto sem lactose" na ficha. Quando marcado: a tabela traz Lactose, Galactose e Glicose (mesmo zeradas); Açúcares totais = valor cadastrado + glicose + galactose; físico-químicos ganham "Lactose: máx. 100 mg/100 g"; a frase de glúten/lactose passa de "CONTÉM LACTOSE" para "ISENTO DE LACTOSE (máx. 100 mg/100 g)". O ingrediente ganhou o campo Glicose (g/100 g) em Composição completa.
- **Item 6 — Anexo VIII (IN 75/2020):** novo campo "Grupo populacional" (0-6 m, 7-11 m, 1-3, 4-8, 9-18, ≥19 anos, gestantes, lactantes) para suplementos (padrão ≥19 anos) e alimentos para dietas com fins especiais (padrão: não informar = Anexo II). A tabela usa os VDR do Anexo VIII e informa o grupo na nota; onde o anexo não tem valor, "—".
- **Item 7 — categoria "Alimento para Dietas com Fins Especiais":** nova categoria, com a base legal do documento (Decreto-Lei 986/1969, Lei 13.305/2016, RDC 715/2022, RDC 727/2022, RDC 429/2020, IN 75/2020) e os critérios de lactose (isento ≤100 mg/100 g; baixo teor >100 mg a 1 g). Microbiologia, contaminantes e matérias estranhas seguem o "produto lácteo de base" escolhido na ficha (padrão: leite em pó integral).
- **Para confirmar:** a nova categoria não leva selo SIF nem registro; fabricante padrão DMS. Se for produto inspecionado (SIF 5460), basta incluir.

## 23/11/2026 — Correções do documento "Correções 23-11"

- **Porções por embalagem:** "Cerca de 8 (200 g), 12 (300 g) e 40 (1 kg)": primeiro o número de porções, depois o peso entre parênteses, em ordem crescente; "Cerca de" só antes das porções. Uma gramatura só: "Cerca de 50".
- **Biotina:** a Vitamina B7 aparece como "Biotina (µg)" na tabela nutricional.
- **Edição e exclusão de ingredientes:** a lista de ingredientes mostrava "—" na coluna Ações para todos (os cadastros novos eram tratados como base fixa), por isso Editar e Excluir sumiram. Agora todos os ingredientes, da base e cadastrados, têm Editar e Excluir.
  - Editar abre o formulário com a lista completa de macro e micronutrientes expandida e permite alterar nome, sublista (grupo), rótulo, referência e todos os valores.
  - Item da base fixa editado vira um cadastro "ajustado" (mesmo nome) na tabela do banco. Se o nome mudar, o antigo sai da lista.
  - Excluir de item da base grava uma marca de exclusão na tabela `ingredientes_custom` (`dados._excluido`); de item cadastrado, apaga a linha. Produtos já salvos não mudam.
  - Nova coluna "Conferência" aponta preenchimento suspeito por 100 g (açúcares > carboidratos, adicionados > totais, saturadas + trans > gorduras totais, macros somando mais de 100 g, kcal diferente do calculado) e filtro "mostrar só os com ⚠".

## 25/11 — %VD por público (Anexo II × grupo populacional)
- Padrão de todo produto: VDR do público geral/adulto (Anexo II da IN 75/2020).
- Caixa "Produto destinado a público específico?" (desmarcada). Marcada, habilita o menu: lactentes 0–6 m, lactentes 7–11 m, crianças 1–3 a, crianças 4–8 a, gestantes, lactantes (VDR do Anexo VIII).
- Desmarcar zera o grupo e volta ao adulto.
- Nutriente sem VDR (adulto ou grupo): célula "*" e nota "* Valor Diário de Referência não estabelecido." (antes "—").
- Suplemento deixa de assumir ≥19 anos por padrão (agora Anexo II).
