# FASE 4.2 — Interface de Revisões Controladas

Data: 20/09/2026  
Status: **DRAFT / NÃO MERGEAR AINDA**

## Objetivo

Expor no GMF o ciclo de vida controlado já implementado no Supabase, sem alterar a lógica de formulação existente.

## Entrada

O workspace do GMF ganha o botão **Revisões**.

Ao abrir o painel:

- identifica o produto salvo atualmente carregado;
- lê os papéis do usuário em `app_user_roles`;
- lê o campo `readonly` do próprio perfil;
- lista as revisões daquele `produto_id`;
- mostra status, revisão, motivo, datas e `lock_version`.

## Regra de fonte

O painel de Revisões não usa o campo textual `Aprovado por` do produto como permissão nem como status.

Papéis vêm exclusivamente de `app_user_roles`.

## Criação

Uma revisão só pode ser criada quando:

1. existe um produto salvo carregado;
2. o perfil não é readonly;
3. não há alteração local pendente no workspace;
4. o usuário informa:
   - código de revisão;
   - motivo da alteração.

A criação usa a RPC `criar_revisao_produto`.

O snapshot é do produto salvo no Supabase, não de valores ainda não persistidos na tela.

## Ações por status

### RASCUNHO
Criador, P&D ou Admin:
- Iniciar revisão.

### EM_REVISAO
Criador, P&D ou Admin:
- Enviar para aprovação.

### AGUARDANDO_APROVACAO
Quality, Regulatory ou Admin:
- Aprovar;
- Rejeitar com motivo obrigatório.

### REJEITADA
Criador, P&D ou Admin:
- Reabrir.

### APROVADA
Quality ou Admin:
- Colocar em vigência.

### VIGENTE / OBSOLETA / LEGADO / CANCELADA
Somente leitura nesta interface.

## Segurança

O JavaScript:

- não faz INSERT/UPDATE/DELETE direto em `produto_revisoes`;
- não faz INSERT/UPDATE/DELETE em `app_user_roles`;
- não contém service-role;
- só chama RPCs da allowlist da F4.2;
- passa `expected_lock_version` em todas as transições;
- trata `REVISION_CONFLICT` recarregando a lista.

## Papéis

A interface mostra apenas os papéis do usuário atual.

Nenhuma tela de atribuição de papel existe nesta fase.

A atribuição continua sendo decisão administrativa humana.

## Limitação consciente desta fase

O GMF legado ainda preserva produto salvo e, ao alterar uma fórmula existente, cria um novo item derivado.

Por isso esta interface:

- cria revisão controlada a partir de um produto já salvo;
- não transforma ainda o editor legado em editor direto do snapshot da revisão;
- não expõe `atualizar_snapshot_revisao` na UI.

A edição controlada do snapshot será tratada em fase posterior, para não misturar versionamento novo com a lógica legada de derivação sem testes específicos.

## Portões

Antes do merge:

- F4.1 schema CI verde;
- F4.2 RBAC CI verde;
- Security Gate verde;
- Interface 2.0 CI verde;
- teste estático garantindo zero escrita direta;
- smoke visual confirmando botão Revisões sem erro JS/overflow.
