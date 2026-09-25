-- Histórico documental sem confirmação do estado atual não conta como demanda aberta.
alter table public.fiscalizacoes drop constraint if exists fiscalizacoes_situacao_check;
alter table public.fiscalizacoes add constraint fiscalizacoes_situacao_check
  check (situacao in ('Aberta', 'Em atendimento', 'Histórico a validar', 'Concluída'));
