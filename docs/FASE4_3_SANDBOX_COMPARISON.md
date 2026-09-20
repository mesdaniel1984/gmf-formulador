# FASE 4.3 — Sandbox de P&D e comparação

Data: 20/09/2026  
Status: **DESENHO/MIGRATION DRAFT — NÃO APLICAR AINDA**

## Objetivo

Separar definitivamente três conceitos:

1. **produto atual** — cadastro operacional existente;
2. **sandbox** — cenário experimental de P&D, sem valor oficial;
3. **revisão controlada** — registro formal do ciclo de aprovação.

## Quem acessa

### Criar/alterar/promover sandbox
- P&D (`rd`)
- Admin

### Consultar sandbox
- P&D
- Admin
- Qualidade
- Regulatório

### Sem acesso aos cenários experimentais
- usuários sem esses papéis;
- Comercial;
- equipe genérica;
- anon.

## Estados do sandbox

- `ATIVO`
- `PROMOVIDO`
- `ARQUIVADO`

`PROMOVIDO` e `ARQUIVADO` são terminais.

## Base do cenário

Um sandbox pode nascer de:

- produto atual salvo;
- qualquer revisão existente do mesmo produto.

O snapshot é copiado no momento da criação.

Alterações futuras da fonte não alteram o sandbox.

## Promoção

Promover não transforma o sandbox no registro oficial.

A promoção:

1. valida papel e lock;
2. cria uma nova `produto_revisoes` em `RASCUNHO`;
3. grava `origem='sandbox_promotion'`;
4. mantém o snapshot do sandbox;
5. marca o sandbox `PROMOVIDO`;
6. congela o cenário experimental.

A revisão promovida ainda precisa seguir:
`RASCUNHO → EM_REVISAO → AGUARDANDO_APROVACAO → APROVADA → VIGENTE`.

## Comparação

A interface da F4.3 poderá comparar:

- sandbox × produto atual;
- sandbox × revisão;
- revisão × revisão.

A comparação será somente leitura e baseada nos snapshots.

Nenhuma comparação muda dados.

## Concorrência

Todo update/archive/promotion usa `expected_lock_version`.

Conflito gera `SANDBOX_CONFLICT`.

## Audit trail

Criação, alteração, promoção e arquivamento geram eventos em `audit_log` com:

- before;
- after;
- usuário;
- timestamp;
- entidade `produto_sandbox`.

## Segurança

- RLS habilitado;
- `anon` sem grant;
- frontend com SELECT condicionado por papel;
- sem INSERT/UPDATE/DELETE direto;
- mutações somente via RPC;
- helpers internos no schema `private`.

## Fora desta migration

- editor visual do sandbox;
- diff visual;
- cálculo de custo em cenário;
- publicação automática;
- alteração do produto oficial;
- atribuição de papel.


## Resultado da aplicação controlada em 20/09/2026

A migration F4.3 foi aplicada no Supabase após CI isolado 100% verde.

Estado após aplicação:

- sandboxes permanentes: 0;
- revisões controladas criadas pela aplicação: 0;
- papéis reais preservados: 4;
- RLS em `produto_sandboxes`: ativo;
- `anon`: sem acesso à tabela e sem EXECUTE nas RPCs;
- `authenticated`: somente SELECT condicionado por RLS;
- mutações: somente pelas 4 RPCs allowlisted.

Teste transacional no Supabase real:

- P&D criou sandbox: OK;
- P&D alterou sandbox com lock: OK;
- Qualidade consultou sandbox: OK;
- Qualidade não criou sandbox: OK;
- equipe sem papel não visualizou sandbox: OK;
- promoção para revisão RASCUNHO: OK;
- origem `sandbox_promotion`: OK;
- snapshot promovido idêntico: OK;
- rollback final: OK;
- registros de teste remanescentes: 0.

Advisories:

- as RPCs `SECURITY DEFINER` são intencionais, estão em allowlist, com `anon` bloqueado e `search_path` endurecido;
- `audit_log` permanece sem policy frontend por desenho;
- Leaked Password Protection continua como pendência separada de Auth.
