# Painel gerencial — primeira entrega

## Evolução para análise executiva

O painel agora calcula análises separadas de NC e SAC SGQ sobre a RPC existente, sem alterar banco, permissões ou integrações OMIE.

- Ocorrências no período comparadas com janela anterior do mesmo número de dias (ambos limites necessários; sem comparação de período futuro). Base anterior zero mostra variação percentual não aplicável.
- Encerradas na coorte: registros atualmente encerrados / registros da coorte com situação reconhecida. Não é SLA nem volume encerrado no período; não há histórico temporal de fechamento na RPC.
- Percentual vencido: abertas com prazo anterior a hoje / abertas com prazo válido. Estoque atual, independente do período de abertura. Sem prazo aparece separadamente.
- Idade mediana: mediana de dias corridos desde abertura das pendências atuais com data válida e não futura. Não mede tempo de resolução.
- Evolução de aberturas: até seis intervalos contíguos sem sobreposição; sem filtro, últimos 180 dias.
- Pareto por produto registrado: participação no volume da coorte e percentual acumulado. Nomes não são reconciliados por semelhança; inclui produto não informado e agrega excedentes em Demais produtos. Não mede reincidência da mesma causa ou defeitos por volume vendido.
- Faixas de idade e carga por responsável permitem abrir os registros correspondentes. Não constituem avaliação individual de desempenho.
- SLA, custos de não qualidade, taxa por unidades vendidas, conformidade de laudos e rondas permanecem dependentes de dados adicionais. Nenhuma meta ou nota global foi inventada.

Todos os dados dinâmicos são inseridos como texto; troca de conta e logout removem também análises e detalhamentos.

Base: gmf-formulador 7b59dbd207b4175f3fddc475a1e5b6d6df1b3433.

## Fontes e interpretação

- `laudos`: conta status `Emitido`; data de emissão informada, com fallback para os carimbos de emissão/criação. A contagem não atesta aprovação do resultado.
- `app_state.ncs`: abertas no período de abertura, excluindo `Fechada`.
- `app_state.sac`: tratativas no período de abertura, excluindo `Encerrada`.
- `sac_entrada`: apenas `NOVA`, separada das tratativas SGQ. Não somar as duas filas.
- `wa_atendimento`: apenas `ABERTO`, em separado. Acesso depende também de `sac_pode_ler()`.
- `app_state.licencas`: cadastro atual. Cadastro não comprova documento aprovado ou vigente.
- Alertas: prazos vencidos nas licenças, documentos, ações, NC e SAC; registros encerrados/obsoletos não entram. Sem prazo não significa em dia.
- Rondas, OPs e NF-e: CQ externo; integração pendente, sem números simulados.

Ausência de fonte não vira zero. Filtro de datas aplica-se à emissão/abertura, não às obrigações atuais. Última gravação de `app_state` refere-se à coleção; consulta ao banco não implica nova atualização operacional.

## Acesso

RPC `painel_admin_dados` usa SECURITY INVOKER, exige conta identificada e papel `admin` em `app_user_roles`. Não concede privilégios sobre fontes e não altera registros. O Comercial não recebe acesso a essa RPC. A página estática não contém dados empresariais.

## Preservação do OMIE

Nenhuma alteração em CQ, credenciais, agendamento, importação ou regras de OP/NF-e. As rotas existentes usam prévia e confirmação de importação. Teste local `testes/omie-somente-leitura.js` executado no código atual do CQ: 16 verificações passaram, sem chamadas reais ao ERP. Isso não comprova a disponibilidade em produção.

## Próximos portões

1. Integrar CQ por identidade autorizada e confirmar OP/NF-e reais, sem criar duplicidades.
2. Comercial: corrigir o acesso amplo legado a `app_state`/`laudos`; impedir alteração do próprio atributo de acesso; definir publicação explícita e armazenamento privado. Atualmente o bucket `anexos` é público. Não usar seus links como evidência de acesso restrito.
3. Publicar central de documentos somente com versões liberadas pela Qualidade; não aprovar documentos automaticamente a partir de um cadastro.
4. Validar uso real do painel com o Admin e o ciclo completo do SAC com a Qualidade.

Rollback da interface: reverter o PR. A RPC é somente leitura e pode ter EXECUTE revogado; nenhuma migração de dados é realizada.
