# Acesso central — plano incremental

1. Navegação direta: Central com Formulador, SGQ, SAC, CQ, P&D e Administração; retorno à Central. Sessões e permissões continuam nos sistemas de origem.
2. Login único: integrar identidades do CQ e P&D, preservando papéis e revogação de sessão.
3. Conferência e integração dos indicadores de CQ/OMIE (rondas, OP e NF-e).
4. Validação do SAC de ponta a ponta.
5. Portal Comercial somente leitura: espelho dos documentos autorizados pela Qualidade, sem duplicação de cadastros ou anexos.

## Requisitos confirmados para a etapa 5

- Laudos e análises laboratoriais separados por tipo de produto (café, leite e demais categorias cadastradas).
- Filtros por categoria, produto, lote quando aplicável e tipo de análise.
- Mostrar datas de coleta/análise/emissão quando disponíveis, laboratório, versão e documento original autorizado.
- Alertas de vencimento e próxima revisão conforme datas/prazos definidos pela Qualidade; ausência de prazo não é vencimento nem validade presumida.
- Documento revogado ou substituído deve deixar de ser apresentado como vigente; histórico conforme permissão.
- Qualidade anexa e mantém a fonte. Comercial consulta apenas o conteúdo liberado, sem editar dados e sem acesso a fórmulas.
- Validar autorização também no banco/API e nos arquivos, não apenas ocultar botões.

A navegação não implica login único já implementado. O CQ tem autenticação própria e o P&D usa outro projeto.
