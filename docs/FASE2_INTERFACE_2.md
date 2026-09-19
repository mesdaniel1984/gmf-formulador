# FASE 2 — Interface 2.0 · Experiência gerencial

Data: 19/09/2026

## Objetivo

Evoluir a Interface 2.0 de uma camada visual comum para uma experiência de gestão orientada ao ciclo de vida do produto e à gestão por exceção, preservando integralmente as regras de negócio existentes.

## GMF Formulador

### O que foi adicionado

- navegação com linguagem de ciclo de vida:
  - Portfólio
  - Produto & revisão
  - Fórmula
  - Nutrição & compliance
  - Ficha técnica
  - Laudo técnico
  - Histórico de laudos
- workspace de produto com:
  - código e revisão;
  - modo novo/consulta protegida;
  - estado salvo/não salvo;
  - quantidade de ingredientes;
  - total da fórmula;
  - proteína calculada pela função existente;
  - indicação de aprovador preenchido sem converter isso em status de aprovação;
- completude dos campos-chave;
- próxima ação sugerida com base apenas em campos ausentes;
- separação entre ação operacional e ferramentas administrativas em massa;
- seletor corporativo GMF / SGQ / CQ.

### Regra de transparência

A interface NÃO deve chamar um produto de "aprovado" apenas porque o campo "Aprovado por" está preenchido.

O texto permitido é:
- aprovador informado;
- responsável preenchido;
- sem bloqueio visível nesta tela.

A aprovação técnica/regulatória continua sendo decisão humana da Qualidade / RT.

## SGQ

### O que foi adicionado

Faixa contextual por módulo com:
- total de registros;
- registros em atenção;
- atrasados/vencidos;
- regra explícita usada na leitura.

As regras reutilizam os estados e datas já existentes:
- documentos: próxima revisão;
- NC: status e prazo de tratativa;
- SAC: status e prazo combinado;
- licenças: vencimento;
- treinamentos: status e data;
- plano de ação: status e prazo;
- fornecedores: status de homologação;
- análises: status.

### Regra de transparência

Zero significa zero registros que atendem à regra calculada.
Ausência de campo ou regra não deve ser convertida em zero oficial.

## Segurança da interface

Ações em massa do GMF ficam visualmente separadas da ação principal "Novo produto".

Nenhuma função foi removida.

## Critério de aceite

1. HTML operacional GMF e SGQ deve continuar igual à baseline, exceto pelas tags que carregam a Interface 2.0.
2. Assets JS devem passar em node --check.
3. Suíte de regressão SGQ deve passar.
4. Nenhuma alteração em RLS, schema ou persistência.
5. Nenhum novo KPI sem fonte existente.
6. Nenhum estado de aprovação inferido a partir de preenchimento de campo.
