# FASE 3 — Interface 2.0 · Acabamento de produção

Data: 19/09/2026

## Objetivo

Levar a camada visual para padrão de uso diário em produção, sem introduzir regra nova de negócio.

## Central

- busca funcional apenas por sistemas, módulos e capacidades;
- o campo NÃO promete busca federada em produtos, documentos, NCs ou SAC;
- atalho "/" leva o foco para a busca;
- Enter direciona para o primeiro sistema encontrado;
- Escape limpa a busca.

## GMF Formulador

### Leitura e formulários
- foco visível;
- labels com maior contraste;
- placeholders mais discretos;
- estados disabled claros;
- grids mais consistentes;
- hover de campos sem alterar valor.

### Fórmula
- tabela com cabeçalho fixo;
- total fixo no rodapé;
- números tabulares;
- zebra e hover;
- linha de inclusão de ingrediente mais clara;
- responsividade preservada.

### Navegação e estados
- barra inferior tratada como action bar;
- empty states com contorno e orientação;
- lifecycle com aria-current;
- alertas de conformidade como aria-live/alert;
- workspace como região semântica.

## SGQ

- tabelas com cabeçalho fixo;
- zebra, hover e empty state mais claro;
- toolbar visualmente separada do conteúdo;
- modais com cabeçalho e rodapé fixos;
- foco visível;
- badges mais legíveis;
- modais recebem role=dialog, aria-modal e aria-labelledby quando possível;
- status de conexão recebe aria-live.

## Regras de segurança

1. Nenhuma alteração funcional no HTML operacional.
2. Nenhuma mudança em saveSAC, saveNC, concorrência, numeração ou persistência.
3. Nenhuma alteração nos cálculos do GMF.
4. Nenhum KPI novo.
5. Nenhuma busca corporativa fictícia.
6. Nenhum estado de aprovação inferido.

## Critério de aceite

- node --check em todos os assets JS da Interface 2.0;
- comparação integral GMF/SGQ contra baseline;
- suíte de regressão SGQ verde;
- PR permanece Draft até revisão visual final.
