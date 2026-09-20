\set ON_ERROR_STOP on

-- Papéis explícitos do ambiente de teste.
insert into public.app_user_roles(user_id,role,assigned_by)
values
('11111111-1111-1111-1111-111111111111','rd','11111111-1111-1111-1111-111111111111'),
('22222222-2222-2222-2222-222222222222','quality','11111111-1111-1111-1111-111111111111');

-- P&D cria sandbox a partir do produto atual.
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  false
);

select public.criar_sandbox_produto(
  1,
  'Cenário A',
  'Teste de sandbox',
  null
) as sandbox_id \gset

do $$
declare
  v_status text;
  v_owner uuid;
  v_type text;
begin
  select status,criado_por,jsonb_typeof(snapshot)
    into v_status,v_owner,v_type
  from public.produto_sandboxes
  where id=:'sandbox_id'::uuid;

  if v_status <> 'ATIVO' then
    raise exception 'sandbox não iniciou ATIVO';
  end if;

  if v_owner <> '11111111-1111-1111-1111-111111111111'::uuid then
    raise exception 'owner incorreto';
  end if;

  if v_type <> 'object' then
    raise exception 'snapshot não é objeto';
  end if;
end $$;

-- P&D atualiza snapshot e lock precisa avançar.
select public.atualizar_sandbox_produto(
  :'sandbox_id'::uuid,
  (select lock_version from public.produto_sandboxes where id=:'sandbox_id'::uuid),
  '{"nome":"Produto A","classificacao":"TESTE","dados":{"ingredientes":[{"n":"Ingrediente 1","qtde":95},{"n":"Ingrediente 2","qtde":5}]}}'::jsonb,
  'Cenário A v2',
  'Alterado no sandbox'
);

do $$
declare
  v_lock integer;
  v_name text;
begin
  select lock_version,nome into v_lock,v_name
  from public.produto_sandboxes
  where id=:'sandbox_id'::uuid;

  if v_lock <= 1 then
    raise exception 'lock_version não avançou';
  end if;

  if v_name <> 'Cenário A v2' then
    raise exception 'nome do sandbox não atualizou';
  end if;
end $$;

-- Lock incorreto é bloqueado.
do $$
declare
  v_failed boolean:=false;
begin
  begin
    perform public.atualizar_sandbox_produto(
      (select id from public.produto_sandboxes where nome='Cenário A v2'),
      999,
      '{"nome":"x"}'::jsonb,
      null,
      null
    );
  exception when others then
    if position('SANDBOX_CONFLICT' in sqlerrm)>0 then
      v_failed:=true;
    else
      raise;
    end if;
  end;

  if not v_failed then
    raise exception 'lock incorreto não foi bloqueado';
  end if;
end $$;

-- Qualidade não pode criar sandbox.
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-2222-2222-222222222222',
  false
);

do $$
declare v_failed boolean:=false;
begin
  begin
    perform public.criar_sandbox_produto(1,'Quality sandbox','não deve criar',null);
  exception when others then
    if position('SANDBOX_ROLE_REQUIRED' in sqlerrm)>0 then
      v_failed:=true;
    else
      raise;
    end if;
  end;

  if not v_failed then
    raise exception 'quality criou sandbox indevidamente';
  end if;
end $$;

-- Readonly também não cria.
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-3333-3333-333333333333',
  false
);

do $$
declare v_failed boolean:=false;
begin
  begin
    perform public.criar_sandbox_produto(1,'Readonly sandbox','não deve criar',null);
  exception when others then
    if position('READONLY_USER' in sqlerrm)>0 then
      v_failed:=true;
    else
      raise;
    end if;
  end;

  if not v_failed then
    raise exception 'readonly criou sandbox indevidamente';
  end if;
end $$;

-- P&D promove explicitamente para revisão.
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  false
);

select public.promover_sandbox_revisao(
  :'sandbox_id'::uuid,
  (select lock_version from public.produto_sandboxes where id=:'sandbox_id'::uuid),
  '030',
  'Promovido a revisão controlada'
) as promoted_revision_id \gset

do $$
declare
  v_sb_status text;
  v_rev_status text;
  v_origin text;
  v_equal boolean;
begin
  select s.status,r.status,r.origem,(s.snapshot=r.snapshot)
  into v_sb_status,v_rev_status,v_origin,v_equal
  from public.produto_sandboxes s
  join public.produto_revisoes r on r.id=s.promovido_para_revisao_id
  where s.id=:'sandbox_id'::uuid;

  if v_sb_status <> 'PROMOVIDO' then
    raise exception 'sandbox não ficou PROMOVIDO';
  end if;

  if v_rev_status <> 'RASCUNHO' then
    raise exception 'revisão promovida não ficou RASCUNHO';
  end if;

  if v_origin <> 'sandbox_promotion' then
    raise exception 'origem incorreta: %',v_origin;
  end if;

  if not v_equal then
    raise exception 'snapshot promovido divergiu';
  end if;
end $$;

-- Sandbox promovido é terminal e imutável.
do $$
declare v_failed boolean:=false;
begin
  begin
    update public.produto_sandboxes
    set descricao='tentativa indevida'
    where id=:'sandbox_id'::uuid;
  exception when others then
    if position('SANDBOX_TERMINAL_IMMUTABLE' in sqlerrm)>0 then
      v_failed:=true;
    else
      raise;
    end if;
  end;

  if not v_failed then
    raise exception 'sandbox promovido aceitou update';
  end if;
end $$;

-- Segundo sandbox para testar arquivamento.
select public.criar_sandbox_produto(
  2,
  'Cenário B',
  'Será arquivado',
  null
) as sandbox2_id \gset

select public.arquivar_sandbox_produto(
  :'sandbox2_id'::uuid,
  (select lock_version from public.produto_sandboxes where id=:'sandbox2_id'::uuid)
);

do $$
declare
  v_status text;
begin
  select status into v_status
  from public.produto_sandboxes
  where id=:'sandbox2_id'::uuid;

  if v_status <> 'ARQUIVADO' then
    raise exception 'sandbox não foi arquivado';
  end if;
end $$;

-- Audit trail suficiente.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.audit_log
  where entity_type='produto_sandbox';

  if v_count < 5 then
    raise exception 'audit sandbox insuficiente: %',v_count;
  end if;
end $$;

select 'PHASE4_3_SANDBOX_ASSERTIONS_OK' as resultado;
