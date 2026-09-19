# FASE 4 — Maturidade funcional de qualidade e PLM

Data: 19/09/2026
Status: DESENHO — NÃO IMPLEMENTAR AINDA

## Por que esta fase é separada

As Fases 1–3 modernizaram a experiência sem alterar as regras e fontes de verdade existentes.

A partir desta fase, copiar apenas a aparência de um QMS/PLM maduro seria perigoso. Os recursos abaixo exigem persistência, histórico, autorização, versionamento e testes próprios.

## Referências de maturidade observadas

Padrões recorrentes em plataformas maduras de QMS/PLM de alimentos e indústria:

- qualidade em ciclo fechado;
- fórmula ligada a ingrediente, especificação e fornecedor;
- histórico de versão e data de vigência;
- aprovação controlada;
- eventos de qualidade ligados a documentos, ações e treinamento;
- dados de chão de fábrica ligados a desvios e ações;
- humano no controle das decisões críticas;
- indicadores baseados em fonte operacional, nunca digitados como verdade oficial.

## 1. GMF — revisão controlada do produto

### Lacuna atual

O GMF possui campo de revisão e responsáveis, mas isso ainda não constitui um workflow controlado.

Preencher "Aprovado por" não prova:
- que houve aprovação;
- quando ocorreu;
- qual versão foi aprovada;
- quem estava autenticado;
- quando a versão entrou em vigor.

### Modelo alvo

Estados propostos:
- RASCUNHO
- EM_REVISAO
- AGUARDANDO_APROVACAO
- APROVADA
- VIGENTE
- OBSOLETA
- REJEITADA
- CANCELADA

### Regra

Versão aprovada deve ficar imutável.
Alteração posterior gera nova revisão.

### Dados mínimos

- id UUID;
- produto_id;
- numero_revisao;
- status;
- motivo_alteracao;
- criado_por;
- criado_em;
- enviado_aprovacao_em;
- aprovado_por;
- aprovado_em;
- vigente_desde;
- obsoleta_em;
- hash/conteúdo da versão.

## 2. GMF — especificação conectada

Separar conceitualmente:
- produto comercial;
- fórmula;
- especificação de produto acabado;
- especificação de ingrediente;
- especificação de embalagem;
- fornecedor aprovado;
- documento de origem.

Cada parâmetro deve poder responder:
- valor;
- unidade;
- fonte;
- revisão;
- vigência;
- responsável;
- evidência.

## 3. Sandbox / cenário

Formulações experimentais não devem parecer revisão oficial.

Criar dois modos:
- CENÁRIO / SANDBOX;
- REVISÃO CONTROLADA.

Sandbox pode variar formulação sem afetar versão vigente.

Promoção de cenário para revisão deve ser ação explícita.

## 4. SGQ — CAPA em ciclo fechado

### Lacuna

Plano de ação existente não equivale sozinho a CAPA fechada.

Modelo alvo:
Evento -> contenção -> análise de causa -> ação -> implementação -> verificação de eficácia -> fechamento.

### Campos mínimos adicionais

- origem;
- causa confirmada;
- ação corretiva;
- ação preventiva quando aplicável;
- responsável;
- prazo;
- implementada_em;
- criterio_eficacia;
- eficacia_avaliada_em;
- eficacia_resultado;
- verificador;
- evidências.

Uma ação concluída não deve ser considerada eficaz automaticamente.

## 5. SGQ — change control

Mudanças relevantes devem poder disparar análise de impacto.

Exemplos:
- alteração de fórmula;
- troca de fornecedor;
- mudança de especificação;
- alteração de POP;
- mudança de parâmetro crítico;
- mudança regulatória.

Impactos possíveis:
- documento;
- treinamento;
- rótulo;
- ficha técnica;
- fornecedor;
- produção;
- estoque;
- cliente.

## 6. Documentos -> treinamento

Quando um documento controlado muda, o sistema deve permitir identificar:
- quem precisa ser treinado;
- prazo;
- versão do documento treinada;
- conclusão;
- evidência.

Não marcar colaborador como treinado apenas porque o documento foi publicado.

## 7. CQ -> SGQ

CQ detecta e preserva a evidência operacional.

SGQ decide e mantém a NC oficial.

Integração proposta:
- CQ cria sinal/desvio;
- guarda origin_system, origin_id e snapshot;
- Qualidade decide "abrir NC";
- SGQ devolve nc_id/nc_numero;
- CQ mostra vínculo, mas não vira fonte da NC.

## 8. Fio digital de entidades

Identificadores a reconciliar:

- produto técnico GMF;
- produto comercial OMIE;
- produto operacional CQ;
- fornecedor OMIE;
- fornecedor homologado SGQ;
- ingrediente GMF;
- matéria-prima CQ;
- lote CQ;
- OP;
- SAC;
- NC;
- CAPA.

Nunca usar apenas texto/nome como relacionamento oficial.

## 9. My Work / Minha fila

Depois da migração relacional, criar fila corporativa por usuário:

- revisões aguardando aprovação;
- SAC com prazo;
- NCs sob responsabilidade;
- CAPAs vencendo;
- documentos para revisar;
- treinamentos pendentes;
- licenças próximas do vencimento;
- desvios do CQ aguardando decisão.

A fila deve mostrar origem e prazo, sem duplicar o registro.

## 10. Audit trail

Toda mudança crítica deve registrar:
- entidade;
- ID;
- ação;
- antes;
- depois;
- usuário autenticado;
- data/hora;
- origem.

Audit log append-only, gerado no backend/DB.

## 11. Ordem segura de implantação

### F4.1 — modelo e migrações
Sem alterar telas de produção.

### F4.2 — revisão formal GMF
Primeiro rascunho/revisão/aprovação.

### F4.3 — CAPA + eficácia SGQ
Depois que NC estiver relacional.

### F4.4 — change control
Liga produto/documentos/treinamento.

### F4.5 — vínculo CQ -> SGQ
Sinal operacional e NC oficial.

### F4.6 — My Work corporativo
Somente depois que os IDs e relações forem confiáveis.

## Portões antes de implementar

1. SGQ relacional para os módulos envolvidos.
2. RLS testado.
3. audit_log funcionando.
4. usuário autenticado em toda ação crítica.
5. backup + restore testado.
6. migração reversível.
7. sem dual write indefinido.
8. testes de autorização.
9. histórico legado preservado.
10. aprovação explícita do desenho funcional.

## O que NÃO fazer

- não transformar campo "Aprovado por" em workflow por CSS/JS;
- não criar CAPA "automática" ao fechar NC;
- não duplicar NC entre CQ e SGQ;
- não usar nome de produto como chave;
- não migrar app_state junto com mudança visual;
- não inventar data de aprovação para versões antigas;
- não converter ausência de dado em zero;
- não permitir que frontend gere audit trail crítico sozinho.
