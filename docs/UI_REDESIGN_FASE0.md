# GMF Corporate UI — Fase 0 e direção de produto

Branch: `feature/gmf-corporate-ui-v1`  
Baseline: `edab6d185312d5e82d80a7737d8cc2a05d8de7f9`  
Escopo desta fase: interface e arquitetura de informação. Sem migração de banco e sem alteração das regras operacionais.

## 1. Inventário verificado

| Componente | Arquivo / destino | Observação |
|---|---|---|
| Central de Sistemas | `index.html` | Portal estático, sem regra de negócio |
| GMF Formulador | `gmf_formulador_wizard.html` | HTML monolítico ~555 KB |
| GMF Lab legado/alternativo | `gmf_lab.html` | HTML monolítico ~527 KB |
| Login GMF | `gmf_login.html` | Supabase Auth; ainda permite cadastro público |
| SGQ | `sistema_qualidade_online.html` | HTML monolítico ~564 KB; app_state + Supabase |
| CQ / Produção | Railway externo | Login próprio; código não está neste repositório |
| Testes SGQ | `testes/` | Protegem sessão, numeração, concorrência, SAC, NC e central |

## 2. Regras de preservação

1. Não alterar `main` diretamente.
2. Não misturar reforma visual com migração de `app_state`.
3. Preservar integralmente a correção B8: `pushChanges`, `_snap`, merge de três vias, `numeroNovo`, `saveSAC`, `saveNC` e proteção contra clique duplo.
4. Não mudar regras de SAC/NC/CAPA durante a reforma visual.
5. Não inventar KPI. Sem fonte = não mostrar como medido.
6. Mudanças de interface devem ser pequenas, reversíveis e revisáveis por diff.

## 3. Benchmark de produto

Padrões observados em plataformas maduras de QMS e formulação:

- **MasterControl**: QMS conectado entre eventos, documentos, change control, treinamento, auditoria, risco e fornecedores.
- **Veeva Quality Cloud**: QMS + QualityDocs + Training + LIMS, com processos e conteúdo integrados, workflows e trilha de auditoria.
- **ETQ Reliance**: módulos de nonconformance, CAPA, change, supplier, risk, release e analytics sobre uma plataforma comum.
- **TraceGains Formula Management**: fórmulas digitais, variantes, versionamento, ingredientes, documentos, custo, nutrição, alergênicos e histórico de desenvolvimento.
- **FDA Part 11 (referência de desenho, quando aplicável)**: registros confiáveis, mudanças que não obscureçam entradas anteriores e controles/audit trail baseados em risco.

## 4. Princípios de UX

### 4.1 Exceção primeiro
A primeira tela deve responder:
- o que exige ação;
- o que está atrasado;
- o que vence em breve;
- qual registro tem risco;
- quem é responsável;
- qual é o próximo passo.

### 4.2 Uma linguagem para três sistemas
Mesma gramática visual para GMF, SGQ e CQ:
- cabeçalho corporativo;
- sidebar;
- cards;
- tabelas;
- filtros;
- chips de status;
- estados vazios;
- modais;
- ações primárias/secundárias;
- cores com significado.

### 4.3 Cor tem função
- Azul: navegação / ação.
- Verde: conforme / concluído.
- Âmbar: atenção / vence em breve.
- Vermelho: vencido / bloqueante / risco real.
- Cinza: informativo / neutro.

### 4.4 Transparência do dado
Sempre que aplicável, o registro deve poder explicar:
- fonte;
- data/hora;
- usuário;
- método/regra;
- revisão;
- histórico;
- dependência ausente.

## 5. Arquitetura de informação alvo

### Central Corporativa
Entrada única para os sistemas e explicação clara de responsabilidade de cada domínio.

### GMF Formulador
- Visão geral
- Produtos
- Formulações
- Ingredientes
- Especificações
- Custos
- Regulatório
- Simulações
- Laudos
- Histórico / Revisões
- Administração

Evolução funcional posterior:
- sandbox vs revisão controlada;
- comparação lado a lado;
- impacto de alteração;
- versão aprovada imutável;
- motivo de revisão;
- aprovação por papel;
- proveniência do custo/dado.

### SGQ
- Central de Gestão
- Não Conformidades
- SAC / Reclamações
- CAPA / Planos de Ação
- Documentos
- Auditorias
- Treinamentos
- Fornecedores
- Licenças / Regulatório
- Indicadores
- Riscos
- Administração

### CQ / Produção
- Ordens de Produção
- Lotes
- Recebimento / NF-e
- Controle em Processo
- Rastreabilidade
- Análises / Laudos
- Liberação
- Desvios
- Indicadores

## 6. Fluxo de qualidade alvo

```
Evento / desvio / reclamação
          ↓
Triagem e classificação
          ↓
Investigação / causa
          ↓
NC (quando aplicável)
          ↓
CAPA / mudança / treinamento
          ↓
Verificação de eficácia
          ↓
Encerramento
          ↓
Tendência e aprendizado
```

A automação pode apoiar triagem e preenchimento; decisão de NC permanece humana.

## 7. Fases

1. Central Corporativa — visual novo, zero alteração de regra.
2. Design system comum.
3. GMF — shell e navegação sem alterar cálculo.
4. SGQ — shell e navegação preservando todos os testes.
5. CQ — alinhar interface via projeto/repositório próprio.
6. Revisões, aprovações, comparação e proveniência do GMF.
7. Acesso unificado e permissões.
8. Migração relacional do SGQ em projeto separado.

## 8. Gates de aceite

Antes de qualquer merge:
- links existentes continuam funcionando;
- nenhuma regra operacional foi removida;
- nenhum KPI foi inventado;
- interface responsiva;
- foco de teclado visível;
- estados hover/focus/disabled claros;
- sem alteração não planejada de Supabase;
- testes existentes do SGQ preservados;
- diff revisado antes do PR;
- rollback = reverter commits da branch.
