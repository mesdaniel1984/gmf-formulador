# Testes

Testes de regressao do Sistema de Gestao da Qualidade.

## Como rodar

Uma vez, para instalar o navegador de teste:

```
npm i -D playwright
npx playwright install chromium
```

Depois, a partir da raiz do repositorio:

```
node testes/b0-sessao-expirada.js
```

Sai com codigo `0` se tudo passar e `1` se algo falhar.

## b0-sessao-expirada.js

Protege a correcao do **B0** — perda silenciosa de alteracoes, encontrada em 03/09/2026
durante o portao (3) do S01.

**O defeito original:** a gravacao marcava cada bloco como "ja sincronizado" *antes* de
tentar salvar. Se o salvamento falhava — sessao expirada, queda de rede — a proxima
tentativa nao reenviava. A alteracao vivia so na memoria da aba e desaparecia no
recarregamento, sem aviso nenhum. A tela ainda mostrava "Online" com a sessao morta.

**O que o teste verifica**, em tres fases, com um Supabase simulado:

| Fase | Situacao | Esperado |
|---|---|---|
| A | sessao valida, gravacao normal | salva, nada pendente, indicador Online |
| B | sessao expirada, gravacao falha | alteracao **continua pendente**, dado permanece na tela, nada gravado no banco, tarja vermelha avisando, tela de login por cima |
| C | novo login | o pendente e gravado, tarja some, app volta ao normal |

O teste roda offline: Chart.js, XLSX, jsPDF e o proprio supabase-js sao substituidos por
dubles, e as requisicoes de CDN sao bloqueadas.

**Rodar contra outra versao** (para confirmar que o teste sabe detectar o defeito):

```
git show 1ca7965:sistema_qualidade_online.html > /tmp/antes.html
node testes/b0-sessao-expirada.js /tmp/antes.html
```

Na versao anterior a correcao, a fase B falha em cinco verificacoes e a fase C mostra o
registro desaparecendo do banco e da tela. E assim que se sabe que o teste tem valor.

## Limite conhecido

O banco e simulado. O teste prova a logica de "nao marcar como salvo antes do sucesso" e o
aviso ao usuario; nao prova o comportamento contra a rede real. Vale repetir uma vez o
roteiro manual depois de publicar: logar, rodar `await sb.auth.signOut()` no console,
editar algo e salvar.

## b4b6-etapa-e-vinculo.js

B4 — campo "etapa da falha" no SAC e na NC, com a lista fechada com a direcao em
06/09/2026, e campo de fornecedor separado da etapa.
B6 — vinculo SAC <-> NC nos dois sentidos, e o encaminhamento assistido que abre a
NC preenchida a partir do SAC sem gravar sozinho.

27 verificacoes. A que mais importa e a regra acordada: registrar nunca e bloqueado,
encerrar em "A apurar" e recusado.

    node testes/b4b6-etapa-e-vinculo.js

Este teste encontrou um defeito que ja existia: `openNCModal(null)` nao zerava tipo,
empresa e status, entao uma NC nova herdava os valores da NC aberta antes. Corrigido
no mesmo commit.

## central-gestao.js

A Central de Gestao da Qualidade — a tela executiva, construida a partir do painel
proposto em 06/09. A regra que ela implementa: todo numero sai de dado que existe,
e indicador sem fonte NAO vira zero — vai para o bloco "o que esta tela ainda nao
mostra", com o motivo.

23 verificacoes, em dois estados: com a base vazia (cada quadro tem de explicar por
que esta vazio, em vez de ficar em branco) e com dado real (contagem, ordenacao por
urgencia e soma de perdas).

    node testes/central-gestao.js

## ponte-ronda-nc.js

Protege **a ponte** — o caminho pelo qual um desvio detectado na ronda
(`qualidade-alimentos`) vira uma NC aqui.

Decidido em 08/09/2026: a NC oficial vive **so no SGQ**. O sistema de rondas
detecta; quem transforma desvio em nao conformidade e uma pessoa, nesta tela.
A ponte chega por parametro de URL (`?abrir=nc&desc=...&prod=...`) e faz
exatamente o que o `abrirNCdoSAC` ja fazia: **preenche e para**.

O que o teste garante:

| # | Verificacao |
|---|---|
| 1 | sem `?abrir=nc`, a tela nao muda de comportamento |
| 2 | com o parametro, o modal abre preenchido e **nenhuma NC e gravada** (comparado contra a mesma tela sem parametro, nao contra zero) |
| 3 | so depois do Salvar a NC existe, e recebe numero da sequencia do SGQ |
| 4 | valor que o `<select>` nao tem **nao apaga o campo em silencio** |
| 5 | a URL e limpa: F5 nao reabre o rascunho e nao gera NC duplicada |

## sac-sla.js

Protege o **item 11.7** — os seis estados do SAC e os cinco campos de prazo do
DOC-SAC-001 rev. 02 (secoes 3, 4 e 5). Prazos aprovados em 08/09/2026:
**1 dia util** para o primeiro retorno, **7 dias corridos** para a conclusao,
**30 dias** quando ha laudo.

| # | Verificacao |
|---|---|
| 1 | os 6 estados existem, e o estado antigo gravado nao some da tela |
| 2 | `abertoEm` e carimbado uma vez e nunca reescrito |
| 3 | "Aguardando cliente" **pausa** o relogio, e a pausa empurra o prazo de conclusao |
| 4 | com laudo o prazo vai a 30 dias, e desmarcar depois **nao encolhe** prazo ja prometido |
| 5 | nao se encerra sem o primeiro retorno registrado (regra 4.5) |
| 6 | "Aguardando laudo / acao" exige pessoa e data (regra 4.4) |
| 7 | `conclusaoEm` e carimbado ao encerrar e **sai** se o SAC for reaberto |

Registro anterior a esta versao nao tem `abertoEm`: aparece como **"sem SLA"** na
lista, e continua podendo ser encerrado pela regra antiga. Prazo inventado para
tras seria historico fabricado.

Feriado nao entra no calculo do dia util — so sabado e domingo. Uma tabela de
feriados mantida a mao e, desatualizada, daria prazo errado com cara de certo.

## b8-concorrencia-e-numero.js

Protege **o numero de protocolo do SAC** e, mais importante, a gravacao com duas
pessoas usando o sistema ao mesmo tempo.

**Como o defeito apareceu.** Em 14/09/2026 a tela do SAC mostrava **dois "SAC-003"**
e **nenhum "SAC-001"**. A primeira hipotese era cosmetica — a tela usava
`s.num || 'SAC-'+(i+1)`, isto e, inventava numero a partir da posicao da linha.
O console descartou: os quatro numeros estavam gravados. O defeito era mais fundo,
e eram dois empilhados:

1. `proximoNum` devolvia **maior+1 da lista que aquela aba tinha na memoria**.
   Lista velha, numero repetido.
2. Cada chave de `ARRAY_KEYS` e **um array inteiro em uma unica linha** de
   `app_state`, e `pushChanges` faz `upsert` dessa linha. Salvar nao "adicionava o
   meu": **trocava a lista do servidor pela lista daquela aba**. Se a aba estava
   dormindo — notebook fechado, realtime caido —, o SAC que a outra pessoa
   registrou nesse meio-tempo **sumia, sem erro nenhum na tela**.

A (2) nao e numeracao. E reclamacao de cliente que desaparece sem ninguem saber que
existiu — e num canal de WhatsApp com SIF isso e o pior defeito da lista.

**O remedio.** `pushChanges` passa a reler e **juntar** antes de gravar, com merge de
tres vias. A base do merge e `_snap[k]`, o retrato do servidor que a aba viu pela
ultima vez. So com a base da para distinguir as duas coisas que, sem ela, sao
identicas: *"sumiu da minha lista porque EU apaguei"* (apaga mesmo) e *"nao esta na
minha lista porque eu NUNCA vi"* (mantem). Empate: quem mexeu, ganha.

| # | Verificacao |
|---|---|
| 1 | a aba que dormiu **nao apaga** o registro criado por outra pessoa, e o numero novo sai do maior que existe **no servidor** |
| 2 | apagar aqui continua apagando la — o merge nao ressuscita registro |
| 3 | duas pessoas editando registros **diferentes**: as duas edicoes sobrevivem |
| 4 | `proximoNum` nunca devolve numero que ja existe (e B3 continua valendo: maior+1, nao quantidade) |
| 5 | a tela **nao inventa numero pela posicao da linha** — registro sem numero mostra `s/n`, e numero repetido ganha marca vermelha |
| 6 | numero carimbado uma vez e nunca recalculado: editar um SAC nao troca o protocolo dele |
| 7 | clique duplo no Salvar gera **um** registro, nao dois |

    node testes/b8-concorrencia-e-numero.js

**Rodar contra a versao anterior** para ver o defeito acontecer:

    git show 43e65f6:sistema_qualidade_online.html > /tmp/antes.html
    node testes/b8-concorrencia-e-numero.js /tmp/antes.html

Na versao anterior o cenario 1 mostra o registro da outra pessoa desaparecendo do
servidor e o numero dela sendo reemitido — exatamente o que produziu os dois
SAC-003 em producao.

## Limite conhecido deste teste

O merge resolve **lista contra lista**. Duas pessoas editando o **mesmo** registro ao
mesmo tempo continua sendo ultimo-a-salvar-vence — mas ai o que se perde e um campo
de um registro, nao a lista inteira. Resolver isso exigiria gravar cada SAC em sua
propria linha, o que e uma mudanca de esquema, nao um patch.
