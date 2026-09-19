# FASE 4.2 — RBAC e workflow de revisão controlada

Data: 19/09/2026  
Status: **DESENHO/MIGRATION DRAFT — NÃO APLICAR AINDA**

## Contexto

Os 5 perfis atuais não carregam papéis funcionais confiáveis:

- 4 usuários: cargo `Usuário`, readonly=false;
- 1 usuário: cargo `Usuário`, readonly=true.

Portanto nenhum papel de Qualidade/P&D/Admin será inferido automaticamente.

## Objetivo

Liberar o primeiro workflow controlado sobre a fundação da F4.1:

1. usuário editável cria RASCUNHO a partir do estado atual do produto;
2. o snapshot pode ser atualizado enquanto RASCUNHO/EM_REVISAO;
3. criador/P&D/Admin avança:
   - RASCUNHO → EM_REVISAO;
   - EM_REVISAO → AGUARDANDO_APROVACAO;
4. Quality/Regulatory/Admin:
   - aprova;
   - rejeita com motivo;
5. criador/P&D/Admin pode reabrir uma revisão rejeitada;
6. Quality/Admin coloca a revisão aprovada em VIGENTE;
7. se já houver VIGENTE, a anterior vira OBSOLETA na mesma transação.

## Separação de funções

Papéis previstos:

- `admin`
- `rd`
- `quality`
- `regulatory`
- `procurement`
- `production`
- `auditor`
- `executive`

Nesta fase:

- qualquer usuário autenticado **não-readonly** pode criar uma revisão;
- editar/avançar a própria revisão é permitido;
- `rd` e `admin` podem editar/avançar revisões de outros;
- aprovação: `quality | regulatory | admin`;
- vigência: `quality | admin`;
- usuário readonly não cria nem avança revisão.

## Acesso ao banco

### `produto_revisoes`
- SELECT: authenticated;
- INSERT/UPDATE/DELETE direto: continua bloqueado;
- escrita: somente RPC.

### `app_user_roles`
- usuário lê somente os próprios papéis;
- nenhuma escrita frontend;
- atribuição de papel é administrativa e auditada.

### `audit_log`
- continua sem acesso frontend nesta fase.

## Concorrência

Todas as RPCs de mutação recebem `expected_lock_version`.

Se o número não coincidir:
- operação falha com `REVISION_CONFLICT`;
- não ocorre sobrescrita silenciosa.

## Snapshot

O produto legado continua sendo a área de trabalho atual.

`criar_revisao_produto` captura um snapshot do produto.

`atualizar_snapshot_revisao` recaptura o produto atual somente se a revisão ainda estiver editável.

Após aprovação, o snapshot fica imutável pela F4.1.

Nesta fase, colocar uma revisão em vigência **não reescreve automaticamente `public.produtos`**. Essa troca de fonte de leitura será tratada em fase posterior para não apagar mudanças de trabalho em andamento.

## RPCs propostas

- `criar_revisao_produto`
- `atualizar_snapshot_revisao`
- `iniciar_revisao`
- `submeter_revisao_aprovacao`
- `aprovar_revisao_produto`
- `rejeitar_revisao_produto`
- `reabrir_revisao_produto`
- `colocar_revisao_vigente`

## Bootstrap de papéis

Nenhum papel será atribuído automaticamente.

Antes de homologar aprovação/vigência, é necessário indicar explicitamente:
- pelo menos 1 `admin`;
- pelo menos 1 responsável `quality` ou `regulatory`.

O arquivo `phase4/011_role_assignment_template.sql` serve somente como template.

## Próximo passo após CI

1. testar migration/RPCs em PostgreSQL isolado;
2. revisar security advisors;
3. aplicar migration no Supabase;
4. atribuir papéis reais de forma humana;
5. construir painel de Revisões no GMF;
6. testar dois usuários/duas abas e conflito de lock;
7. somente então disponibilizar aprovação real no UI.
