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
