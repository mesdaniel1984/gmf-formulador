-- Complemento do bootstrap da F4.1 para RBAC.
insert into auth.users(id) values
('22222222-2222-2222-2222-222222222222'),
('33333333-3333-3333-3333-333333333333');

create table public.perfis(
  id uuid primary key references auth.users(id),
  nome text not null,
  cargo text,
  readonly boolean not null default false
);

insert into public.perfis(id,nome,cargo,readonly) values
('11111111-1111-1111-1111-111111111111','Formulator','Usuário',false),
('22222222-2222-2222-2222-222222222222','Quality','Usuário',false),
('33333333-3333-3333-3333-333333333333','Readonly','Usuário',true);
