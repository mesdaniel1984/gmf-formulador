# GATE DE HOMOLOGAÇÃO — Interface 2.0

Data: 19/09/2026
Status inicial: EM HOMOLOGAÇÃO
PR: Interface 2.0 — Central, GMF Formulador e SGQ

## Objetivo

Validar a Interface 2.0 antes de qualquer merge no main.

Este gate valida experiência, navegação, responsividade e regressão.
Ele NÃO autoriza mudanças funcionais da Fase 4.

---

## 1. Critérios automáticos obrigatórios

Todos devem estar verdes:

- [ ] sintaxe dos assets UI2
- [ ] HTML operacional GMF igual à baseline, exceto tags UI2
- [ ] HTML operacional SGQ igual à baseline, exceto tags UI2
- [ ] regressão SGQ completa
- [ ] smoke visual Central desktop
- [ ] smoke visual Central mobile
- [ ] smoke visual Login desktop
- [ ] smoke visual Login mobile
- [ ] smoke visual GMF workspace
- [ ] smoke visual SGQ gate
- [ ] smoke visual modal NC mobile
- [ ] artefato de screenshots gerado no CI

---

## 2. Revisão visual — Central

### Desktop
- [ ] identidade Grupo MF Paris clara
- [ ] três sistemas reconhecíveis em menos de 5 segundos
- [ ] Fio Digital compreensível
- [ ] busca filtra apenas sistemas/módulos/capacidades
- [ ] nenhum texto promete busca federada que não existe
- [ ] sem overflow horizontal
- [ ] hierarquia de informação equilibrada

### Mobile
- [ ] cards em uma coluna
- [ ] títulos sem corte crítico
- [ ] navegação utilizável
- [ ] sem overflow horizontal
- [ ] conteúdo principal visível sem zoom

---

## 3. Revisão visual — GMF Formulador

### Portfólio
- [ ] Novo Produto é a ação principal
- [ ] ferramentas administrativas ficam separadas
- [ ] Corrigir Todos não parece ação cotidiana
- [ ] cards de produtos continuam operacionais

### Workspace
- [ ] Produto e revisão ficam evidentes
- [ ] alteração não salva fica visível
- [ ] Ingredientes tem acesso direto
- [ ] lifecycle é a navegação principal
- [ ] wizard legado não aparece
- [ ] Histórico aparece como destino separado
- [ ] completude não é apresentada como aprovação
- [ ] campo "Aprovado por" aparece apenas como aprovador informado
- [ ] próxima ação deixa claro que é sugestão de preenchimento

### Fórmula
- [ ] inclusão de ingrediente clara
- [ ] tabela legível
- [ ] total da fórmula visível
- [ ] números alinhados
- [ ] cabeçalho e total permanecem legíveis em listas longas
- [ ] nenhuma regra de cálculo mudou

### Compliance
- [ ] alerta regulatório continua visível
- [ ] alertas não são suavizados pelo novo CSS
- [ ] "sem bloqueio visível" não é confundido com aprovação

### Mobile
- [ ] lifecycle navegável horizontalmente
- [ ] workspace não estoura viewport
- [ ] formulário vira uma coluna
- [ ] fórmula continua utilizável
- [ ] action bar não cobre conteúdo crítico

---

## 4. Revisão visual — SGQ

### Central
- [ ] prioridade é risco/ação, não decoração
- [ ] ausência de dado não aparece como zero oficial
- [ ] cards e listas não duplicam informação desnecessariamente

### SAC
- [ ] fila continua operacional
- [ ] SLA continua legível
- [ ] status e atrasos têm contraste suficiente

### NC
- [ ] modal Geral / Causa / Ações continua navegável
- [ ] modal cabe em desktop e mobile
- [ ] foto/anexo continua acessível
- [ ] status continua funcional
- [ ] SAC vinculado continua funcional

### Gestão por exceção
- [ ] total / atenção / atrasados usam regra explícita
- [ ] regra está legível
- [ ] nenhum número manual foi criado

### Modais
- [ ] título permanece visível durante scroll
- [ ] ações permanecem visíveis no rodapé
- [ ] não há campo encoberto
- [ ] fechamento por clique externo continua funcionando

---

## 5. Segurança e comportamento

- [ ] login funciona
- [ ] logout funciona pelo shell corporativo
- [ ] troca GMF / SGQ / CQ funciona
- [ ] reload não perde dado salvo
- [ ] duas abas SGQ continuam protegidas pela lógica B8
- [ ] SAC mantém numeração correta
- [ ] NC mantém numeração correta
- [ ] nenhuma alteração automática ocorre ao apenas navegar
- [ ] console sem erros novos

---

## 6. Gate de publicação

Só promover quando:

1. todos os testes automáticos estiverem verdes;
2. nenhuma pendência P0 ou P1 existir;
3. revisão visual desktop/mobile estiver aprovada;
4. rollback estiver identificado;
5. PR continuar mergeable.

Classificação:
- P0 = perda/corrupção de dado, acesso indevido ou sistema indisponível
- P1 = fluxo crítico quebrado
- P2 = problema relevante de usabilidade sem bloquear operação
- P3 = refinamento visual

---

## 7. Ordem de produção

### Onda A — GMF + SGQ
1. merge do PR;
2. validar GitHub Pages;
3. login;
4. abrir GMF;
5. abrir produto;
6. abrir fórmula;
7. abrir SGQ;
8. criar/navegar fluxo de teste sem persistir dado indevido;
9. observar erros de console;
10. monitorar por 30–60 minutos.

Rollback:
reverter o commit de merge do PR.

### Onda B — CQ
Somente após Onda A estável.

1. merge PR do CQ;
2. aguardar deploy Railway;
3. validar /health;
4. login;
5. Dashboard;
6. Recebimento;
7. OP;
8. Lotes;
9. Rondas;
10. OMIE leitura;
11. observar logs por 30–60 minutos.

Rollback:
reverter o commit de merge e redeploy da versão anterior.

---

## 8. O que fica fora deste gate

Não implementar aqui:
- revisão formal/aprovação/vigência;
- migração SGQ relacional;
- CAPA com eficácia;
- change control;
- SSO;
- busca federada;
- My Work corporativo;
- mudanças de RLS/schema.
