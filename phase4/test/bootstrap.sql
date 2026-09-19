create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
end $$;

create schema if not exists auth;

create table auth.users(
  id uuid primary key,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$$;

create table public.produtos(
  id bigint primary key,
  nome text not null,
  dados jsonb not null,
  classificacao text,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

insert into auth.users(id) values
('11111111-1111-1111-1111-111111111111');

insert into public.produtos(
  id,nome,dados,classificacao,criado_por
) values
(
  1,
  'Produto A',
  '{"codigo":"A-001","revisao":"001","ingredientes":[{"n":"Ingrediente 1","qtde":100}]}'::jsonb,
  'TESTE',
  '11111111-1111-1111-1111-111111111111'
),
(
  2,
  'Produto B',
  '{"ingredientes":[{"n":"Ingrediente 2","qtde":100}]}'::jsonb,
  'TESTE',
  '11111111-1111-1111-1111-111111111111'
);
