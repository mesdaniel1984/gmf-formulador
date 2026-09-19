# FASE 0 — Interface 2.0 · Grupo MF Paris

Data: 19/09/2026  
Branch: `feature/interface-2-0`  
Baseline: `edab6d185312d5e82d80a7737d8cc2a05d8de7f9`

## Regra do projeto

A reforma de interface não pode alterar regras de negócio, persistência, numeração, SLA, cálculos, RLS, schemas ou integrações sem uma fase própria e testes específicos.

## Aplicações existentes

| Aplicação | Arquivo / destino | Tamanho atual | Papel |
|---|---|---:|---|
| Central | `index.html` | ~4 KB | Porta de entrada |
| GMF Formulador | `gmf_formulador_wizard.html` | ~543 KB / 4.226 linhas | Formulação, especificação, nutrição, FTP, ingredientes e laudos |
| GMF Lab legado | `gmf_lab.html` | ~515 KB / 3.554 linhas | Versão anterior/relacionada do GMF |
| SGQ | `sistema_qualidade_online.html` | ~550 KB / 4.666 linhas | Documentos, indicadores, fornecedores, análises, NC, SAC, licenças, treinamentos e planos de ação |
| CQ Produção | Railway externo | app independente | NF-e, recebimento, produção e controle operacional |

## Fontes de dados observadas

GMF: Supabase — `perfis`, `produtos`, `ingredientes_custom`, `laudos`.

SGQ: Supabase com estado principal ainda concentrado em `app_state`; anexos usam estrutura própria. A migração relacional NÃO faz parte da reforma visual.

CQ: aplicação externa no Railway/PostgreSQL; não será reescrita nesta branch.

## Funções críticas — NÃO alterar na fase visual

### SGQ
- `pushChanges`
- `_mergeArray`
- `_sincronizarChave`
- `numeroNovo`
- `saveSAC`
- `saveNC`
- `sacPrazoPrimeiroRetorno`
- `sacPrazoConclusao`
- `vincularSACNC`
- fluxo de ponte ronda -> NC
- autenticação/persistência

### GMF
- autenticação Supabase
- `salvarProdutoAtual`
- `salvarIngrediente`
- `recalc`
- `calcT`
- cálculos regulatórios/contaminantes
- geração de FTP
- geração e persistência de laudos
- restauração de receitas e produtos

## Baseline de testes do SGQ

O último commit declara 191 verificações e 0 falhas.

Testes existentes:
- `b0-sessao-expirada.js`
- `b3b5-numeracao-e-lote.js`
- `b4b6-etapa-e-vinculo.js`
- `b7-autoria.js`
- `b8-concorrencia-e-numero.js`
- `central-gestao.js`
- `ponte-ronda-nc.js`
- `sac-fila-central.js`
- `sac-sla.js`

Nenhuma alteração no SGQ será aceita se reduzir essa baseline.

## Achados de interface

1. Os três ambientes têm linguagens visuais e acessos diferentes.
2. GMF usa wizard horizontal; SGQ usa sidebar; a Central usa cards de landing page.
3. GMF e SGQ são arquivos monolíticos grandes. Reescrita total na primeira fase aumentaria risco de regressão.
4. Existem login/cadastro duplicados (`gmf_login.html`, `login.html`, `register.html`).
5. O cadastro aberto e senha mínima de 6 caracteres devem ser tratados numa fase de segurança separada, sem misturar com CSS.
6. A interface do SGQ já segue um princípio correto: não inventar KPI sem fonte.
7. O GMF já tem forte inteligência regulatória, mas ela está escondida por uma navegação orientada a etapas em vez de ciclo de vida do produto.

## Benchmark aplicado

Padrões observados em plataformas maduras de QMS/PLM e food-tech:
- qualidade em circuito fechado: evento -> análise -> causa -> ação -> eficácia;
- gestão por exceção e risco;
- fonte única de verdade e dados conectados;
- versionamento, vigência e aprovação;
- documentos e treinamentos ligados a mudanças;
- fornecedor ligado a especificações, desvios e desempenho;
- formulação ligada a ingredientes, especificações, claims, custo e compliance;
- histórico e trilha de auditoria visíveis ao usuário;
- colaboração com humano no controle das decisões críticas.

Referências de produto estudadas nesta rodada: MasterControl Quality Excellence, ETQ Reliance, Siemens Teamcenter Quality e TraceGains Formula/Specification Management.

## Arquitetura visual alvo

### Shell corporativo
- marca Grupo MF Paris;
- seletor de sistema;
- pesquisa contextual;
- central de pendências;
- identidade do usuário;
- padrão único de cor, tipografia, tabela, formulário, modal e status.

### Estados semânticos
- vermelho: bloqueio/risco crítico;
- âmbar: atenção/prazo;
- verde: conforme/concluído;
- azul: navegação/informação;
- cinza: sem dado/não aplicável.

### Transparência
Todo indicador futuro deve declarar:
- origem;
- período/data de atualização;
- cobertura;
- regra;
- responsável;
- estado "sem dado" distinto de zero.

## Sequência aprovada

1. Central + design system — sem tocar regras de negócio.
2. GMF: shell e navegação; preservar cálculos.
3. SGQ: shell e navegação; preservar os 191 testes.
4. CQ: aplicar identidade visual no repositório próprio quando o código-fonte correspondente estiver disponível.
5. Só depois: autenticação unificada, versionamento formal de fórmula, workflow e migração relacional.

## Critério de rollback

Cada etapa entra em commit próprio. Em caso de regressão, reverter somente o commit visual correspondente. O `main` não é alterado até revisão do PR.
