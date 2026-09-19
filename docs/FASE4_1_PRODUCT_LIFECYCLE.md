# FASE 4.1 — Ciclo de vida controlado do produto

Data: 19/09/2026  
Status: **DESENHO/MIGRATIONS DRAFT — NÃO APLICAR EM PRODUÇÃO AINDA**

## Objetivo

Criar a fundação de versionamento controlado do GMF sem quebrar o modelo atual de `public.produtos`.

A Fase 4.1 não muda a tela, não muda o cálculo e não altera o JSON legado.

Ela cria uma nova camada controlada ao lado do legado.

## Evidência do estado atual

Auditoria do Supabase em 19/09/2026:

- 43 produtos;
- 32 sem código preenchido;
- 28 sem revisão preenchida;
- 2 códigos duplicados;
- 0 fórmulas vazias;
- 0 produtos sem `criado_por`;
- 101 laudos;
- 0 laudos sem `produto_id`.

Distribuição de revisão observada:

- ausente: 28;
- `00`: 3;
- `001`: 9;
- `002`: 3.

Conclusão: código e revisão NÃO podem ser reconstruídos automaticamente sem inventar informação.

## Decisão de migração

Cada produto atual recebe, futuramente, um único snapshot com:

- `status = LEGADO`;
- `revisao_codigo = NULL`;
- `legacy_revision_text` preservando literalmente o valor atual quando existir;
- snapshot completo de `nome + classificação + dados`;
- texto explícito de que o snapshot não representa aprovação, vigência ou conformidade.

O registro LEGADO é imutável e não muda de status.

Para entrar no fluxo controlado, deve ser criada uma **nova revisão RASCUNHO** com número escolhido/validado humanamente.

## Estados controlados

Fluxo proposto:

`RASCUNHO → EM_REVISAO → AGUARDANDO_APROVACAO → APROVADA → VIGENTE → OBSOLETA`

Caminhos auxiliares:

- `RASCUNHO → CANCELADA`
- `EM_REVISAO → RASCUNHO | CANCELADA`
- `AGUARDANDO_APROVACAO → EM_REVISAO | REJEITADA | CANCELADA`
- `REJEITADA → RASCUNHO | CANCELADA`
- `APROVADA → CANCELADA`

`LEGADO`, `OBSOLETA` e `CANCELADA` são estados terminais para aquele registro.

## Imutabilidade

O snapshot não pode ser alterado quando a revisão estiver:

- LEGADO;
- APROVADA;
- VIGENTE;
- OBSOLETA;
- CANCELADA.

Mudança de produto após aprovação exige nova revisão.

## Concorrência

Cada revisão possui `lock_version`.

Toda atualização incrementa a versão.

Na F4.2 o frontend deverá enviar a versão esperada; divergência bloqueará sobrescrita silenciosa.

## Audit trail

`audit_log` é:

- append-only para a aplicação;
- alimentado pelo banco;
- independente do JavaScript do navegador;
- registra before/after, ator, ação, entidade e timestamp.

Nenhuma policy de frontend é criada para o audit log nesta fase.

## Segurança

As novas tabelas entram com RLS habilitado e **sem policy de frontend**.

Portanto, se alguém aplicasse apenas a migration de fundação, o aplicativo atual continuaria funcionando porque não usa essas tabelas — e nenhum usuário do frontend poderia manipulá-las.

A F4.2 deverá criar o modelo de papéis e RPCs/policies explícitas antes de liberar escrita controlada.

## Arquivos

- `phase4/001_product_revision_foundation.sql`
- `phase4/002_legacy_snapshot.sql`
- `phase4/003_validation_queries.sql`
- `phase4/004_harden_revision_functions_and_indexes.sql`

## Portões antes de aplicar

1. Security Gate P0 concluído — **OK**.
2. Backup/restore vigente.
3. Revisão humana do modelo.
4. Teste SQL em ambiente isolado.
5. Zero alteração de `public.produtos`.
6. Zero alteração de `public.laudos`.
7. Snapshot legado idempotente.
8. Rollback definido.
9. F4.2 aprovada antes de expor write access.

## Rollback previsto

Antes da UI usar as tabelas novas:

1. remover triggers da F4.1;
2. remover `produto_revisoes`;
3. remover `audit_log`.

Como o legado permanece intacto, não há perda de dados operacionais atuais.

Depois que F4.2 começar a gravar revisões, rollback deixa de ser simples DROP e passa a exigir exportação/auditoria das revisões criadas.

## Fora desta fase

- aprovação por papel;
- RBAC;
- sandbox/cenários;
- change control;
- CAPA;
- My Work;
- migração de `app_state`;
- integração CQ → SGQ;
- SSO.


## Resultado da aplicação controlada em 19/09/2026

A F4.1 foi aplicada de forma aditiva no Supabase após CI verde.

Resultado observado:

- produtos: 43;
- revisões totais: 43;
- LEGADO: 43;
- revisões controladas: 0;
- LEGADO sem texto de revisão original: 28;
- registros com aprovação/vigência: 0;
- eventos de audit trail de revisão: 43;
- laudos preservados: 101;
- app_state preservado: 12.

Hardening pós-advisor:

- EXECUTE revogado de `produto_revisao_audit()` para frontend;
- EXECUTE revogado de `produto_revisao_guard()` para frontend;
- índices adicionados para `criado_por`, `aprovado_por` e `rejeitada_por`.

Advisories restantes:

- RLS sem policy nas duas tabelas novas: **intencional**, porque F4.1 ainda não expõe acesso ao frontend;
- Leaked Password Protection: pendência de Auth separada da F4.1.
