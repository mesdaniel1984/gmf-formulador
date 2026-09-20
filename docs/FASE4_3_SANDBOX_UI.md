# FASE 4.3 — Interface Sandbox + Comparação

Data: 20/09/2026  
Status: **DRAFT / NÃO MERGEAR AINDA**

## Objetivo

Dar ao P&D uma área experimental claramente separada do produto oficial e permitir que Qualidade/Regulatório comparem cenários sem editar dados.

## Acesso

### P&D / Admin
- criar cenário;
- editar quantidades;
- comparar;
- arquivar;
- promover para revisão RASCUNHO.

### Qualidade / Regulatório
- consultar cenários;
- comparar snapshots;
- sem criação/edição/promoção.

### Demais usuários
- botão Sandbox oculto;
- RLS também bloqueia leitura.

## Editor

A primeira versão do editor de Sandbox altera somente `qtde` dos ingredientes.

Campos preservados:

- `ref`;
- `nome`;
- `nomeExib`;
- objeto técnico `dados` do ingrediente.

Isso reduz risco de corromper identidade técnica do cadastro.

## Total da fórmula

Auditoria do legado em 20/09/2026 mostrou:

- 43 produtos;
- 43 fórmulas com total 1000;
- menor total: 1000;
- maior total: 1000.

A interface usa 1000 como **baseline visual de consistência**, não como regra regulatória nem aprovação automática.

Se o cenário divergir de 1000:

- aparece alerta;
- o cenário continua editável;
- a promoção não é bloqueada pelo frontend;
- Qualidade/P&D devem revisar a causa.

## Base de um cenário

Pode ser:

- produto atual salvo no Supabase;
- qualquer revisão existente do mesmo produto.

Se houver alteração local não salva no GMF, criar a partir de "produto atual salvo" é bloqueado para evitar captura de estado divergente.

## Comparação

Fontes disponíveis:

- produto atual salvo;
- revisões LEGADO/controladas;
- sandboxes acessíveis ao usuário.

A comparação mostra:

1. total da fórmula A/B;
2. ingredientes alterados;
3. ingredientes iguais;
4. quantidade antes/depois;
5. delta;
6. adicionados/removidos;
7. outros caminhos escalares diferentes do snapshot.

A comparação é somente leitura.

## Promoção

A promoção:

1. exige P&D/Admin;
2. exige código da nova revisão;
3. exige motivo;
4. chama apenas `promover_sandbox_revisao`;
5. cria revisão oficial em `RASCUNHO`;
6. congela o sandbox;
7. não aprova e não coloca em vigência automaticamente.

## Segurança de frontend

O módulo:

- não faz INSERT/UPDATE/DELETE direto em `produto_sandboxes`;
- não escreve em `produto_revisoes`;
- não escreve em `app_user_roles`;
- não escreve em `produtos`;
- não contém service-role;
- usa somente as RPCs allowlisted:
  - `criar_sandbox_produto`;
  - `atualizar_sandbox_produto`;
  - `arquivar_sandbox_produto`;
  - `promover_sandbox_revisao`.

## Testes

### Estático
`testes/phase4-3-sandbox-ui.js`

Valida:

- ausência de escrita direta;
- allowlist de RPC;
- edição apenas de `qtde`;
- ausência de alteração de `ref/nome/nomeExib`;
- separação de papéis;
- tratamento de alteração local não salva;
- comparação somente leitura.

### Visual
`testes/phase4-3-sandbox-visual-smoke.js`

Usa Supabase totalmente simulado em memória.

Cenários:

- P&D desktop:
  - botão visível;
  - criação visível;
  - cenário listado;
  - comparação abre;
  - sem erro JS/overflow.
- Qualidade mobile:
  - botão visível;
  - criação ausente;
  - modo consulta;
  - comparação disponível;
  - sem erro JS/overflow.

Nenhum teste visual toca no Supabase real.

## Limitações conscientes

Ainda não entram nesta interface:

- adicionar ingrediente novo ao sandbox;
- remover ingrediente;
- cálculo de custo específico do cenário;
- comparação nutricional dedicada;
- simulação de rotulagem;
- edição direta da revisão controlada.

Esses pontos podem ser adicionados depois, com testes específicos, sem ampliar risco nesta primeira entrega.
