-- Tratativa por protocolo: a mesma pessoa pode abrir mais de uma manifestacao.
-- Nenhuma linha existente em sac_entrada ou wa_triagem e alterada.
create table public.sac_caso_tratativa (
  caso_id uuid primary key references public.sac_entrada(id) on delete restrict,
  area text not null check (area in
    ('QUALIDADE','PRODUCAO','LOGISTICA','COMERCIAL','FINANCEIRO','REGULATORIO','OUTROS')),
  responsavel text not null check (length(btrim(responsavel)) between 2 and 160),
  prazo date not null,
  prioridade text not null default 'NORMAL' check (prioridade in ('NORMAL','ALTA')),
  situacao text not null default 'ENCAMINHADO' check (situacao in
    ('ENCAMINHADO','EM_ANALISE','AGUARDANDO_CLIENTE','CONCLUIDO')),
  nc_decisao text not null default 'AVALIAR' check (nc_decisao in
    ('AVALIAR','NECESSARIA','NAO_APLICA')),
  resumo text not null check (length(btrim(resumo)) between 5 and 2000),
  retorno text not null default '' check (length(retorno) <= 2000),
  nc_id text,
  nc_numero text,
  atualizado_por uuid not null default auth.uid(),
  atualizado_em timestamptz not null default now(),
  constraint caso_nc_par check
    ((nc_id is null and nc_numero is null) or (nc_id is not null and nc_numero is not null)),
  constraint caso_nc_decisao check (nc_id is null or nc_decisao = 'NECESSARIA'),
  constraint caso_conclusao check
    (situacao <> 'CONCLUIDO' or
      (length(btrim(retorno)) >= 5 and nc_decisao <> 'AVALIAR'
       and (nc_decisao <> 'NECESSARIA' or nc_id is not null)))
);
create index sac_caso_tratativa_area_prazo on public.sac_caso_tratativa(area,prazo)
  where situacao <> 'CONCLUIDO';
create unique index sac_caso_tratativa_nc on public.sac_caso_tratativa(nc_id)
  where nc_id is not null;
alter table public.sac_caso_tratativa enable row level security;
revoke all on public.sac_caso_tratativa from public, anon, authenticated;
grant select,insert,update on public.sac_caso_tratativa to authenticated;
create policy sac_caso_ler on public.sac_caso_tratativa for select to authenticated
  using ((select public.sac_pode_ler()));
create policy sac_caso_inserir on public.sac_caso_tratativa for insert to authenticated
  with check ((select public.sac_pode_atender()) and atualizado_por = (select auth.uid()));
create policy sac_caso_atualizar on public.sac_caso_tratativa for update to authenticated
  using ((select public.sac_pode_atender()))
  with check ((select public.sac_pode_atender()) and atualizado_por = (select auth.uid()));
