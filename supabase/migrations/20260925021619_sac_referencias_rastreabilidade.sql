-- Referências documentais conferidas pela Qualidade. Não implica consulta
-- automática ao CQ/Omie nem prova, por si só, a correspondência lote-OP.
create table public.sac_caso_referencia (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.sac_entrada(id) on delete restrict,
  tipo text not null check (tipo in
    ('OP_OMIE','RONDA_CQ','NFE','LAUDO','FICHA_TECNICA','OUTRO')),
  referencia text not null check (length(btrim(referencia)) between 2 and 160),
  fonte text not null check (length(btrim(fonte)) between 5 and 300),
  observacao text not null default '' check (length(observacao) <= 500),
  registrado_por uuid not null default auth.uid(),
  registrado_em timestamptz not null default now()
);
create index sac_caso_referencia_caso on public.sac_caso_referencia(caso_id,registrado_em desc);
alter table public.sac_caso_referencia enable row level security;
revoke all on public.sac_caso_referencia from public, anon, authenticated;
grant select,insert on public.sac_caso_referencia to authenticated;
create policy sac_caso_referencia_ler on public.sac_caso_referencia for select to authenticated
  using ((select public.sac_pode_ler()));
create policy sac_caso_referencia_criar on public.sac_caso_referencia for insert to authenticated
  with check ((select public.sac_pode_atender()) and registrado_por = (select auth.uid()));
