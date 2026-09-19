# RESULTADO DE HOMOLOGAÇÃO — Interface 2.0

Data: 19/09/2026
Escopo: Central + GMF Formulador + SGQ
Status: CANDIDATO A GO — aguardando somente CI do último ajuste cosmético

## Evidências revisadas

Screenshots automatizados:
- Central desktop
- Central mobile
- Login GMF desktop
- Login GMF mobile
- Workspace GMF
- Gate SGQ
- Modal NC SGQ mobile

## Resultado da primeira revisão visual

### Achados
- P2: link "Central de Sistemas" duplicado no login.
- P2: link legado "Central de Sistemas" duplicado no GMF.
- P3: frase auxiliar do Fio Digital quebrava visualmente no mobile.
- P3: nomenclatura "GMF Lab" ainda aparecia no preview do workspace.

### Tratamento
- duplicidades removidas pela camada UI2;
- link legado permanece no código para rollback, mas fica oculto na Interface 2.0;
- mobile do Fio Digital corrigido;
- nomenclatura padronizada para GMF Formulador;
- testes visuais passaram a verificar ausência da duplicidade.

## Resultado funcional

Portões já comprovados nas rodadas anteriores:
- HTML GMF integralmente igual à baseline, exceto tags UI2;
- HTML SGQ integralmente igual à baseline, exceto tags UI2;
- funções críticas preservadas;
- regressão SGQ verde;
- concorrência B8 preservada;
- SAC/NC preservados;
- sintaxe dos assets UI2 verde;
- smoke desktop/mobile sem overflow e sem erros JS.

## Avaliação visual

### Central
APROVADA para homologação:
- três sistemas facilmente distinguíveis;
- fontes de verdade explícitas;
- Fio Digital compreensível;
- mobile em uma coluna;
- busca limitada ao escopo real.

### GMF
APROVADO para homologação:
- lifecycle claro;
- workspace contextual;
- completude não confundida com aprovação;
- ações administrativas separadas;
- Ingredientes direto;
- navegação corporativa;
- formulários e tabelas mais legíveis.

### SGQ
APROVADO para homologação:
- gestão por exceção;
- regras de leitura explícitas;
- modal NC utilizável no mobile;
- tabelas, toolbars e modais consistentes;
- ausência de dado permanece diferente de zero.

## Riscos herdados — fora da Interface 2.0

Estes pontos já existiam antes da branch e NÃO foram resolvidos dentro da reforma visual:

1. Login GMF ainda oferece "Criar conta".
2. Regra atual de senha do cadastro legado indica mínimo de 6 caracteres.
3. SGQ ainda possui módulos no modelo app_state/JSON.
4. Workflow formal de aprovação/vigência do GMF ainda não existe.
5. SSO corporativo ainda não existe.

Esses itens não devem ser tratados como entregues pela Interface 2.0.

## Gate

GO somente se:
- último CI da branch estiver verde;
- PR estiver mergeable;
- usuário autorizar explicitamente publicação.

## Onda A

Publicar primeiro:
- Central;
- GMF;
- SGQ.

Não publicar CQ simultaneamente.

## Rollback

Reverter o merge do PR e aguardar novo deploy do GitHub Pages.

Nenhuma migração de banco precisa ser revertida porque esta PR não altera schema.
