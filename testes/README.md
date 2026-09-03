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
