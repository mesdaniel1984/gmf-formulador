\set ON_ERROR_STOP on

-- Nenhum papel é inferido automaticamente.
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.app_user_roles;
  if v_count <> 0 then
    raise exception 'app_user_roles deveria iniciar vazio';
  end if;
end $$;

-- Atribuição explícita de Quality pelo administrador do banco.
insert into public.app_user_roles(user_id,role,assigned_by)
values(
  '22222222-2222-2222-2222-222222222222',
  'quality',
  '22222222-2222-2222-2222-222222222222'
);

-- Usuário formulator.
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  false
);

select public.criar_revisao_produto(
  1,
  '020',
  'Nova revisão de teste'
) as revision_id \gset

do $$
declare
  v_status text;
  v_creator uuid;
begin
  select status,criado_por into v_status,v_creator
  from public.produto_revisoes
  where revisao_codigo='020' and produto_id=1;

  if v_status <> 'RASCUNHO' then
    raise exception 'status inicial inesperado: %',v_status;
  end if;

  if v_creator <> '11111111-1111-1111-1111-111111111111'::uuid then
    raise exception 'criador incorreto';
  end if;
end $$;

select public.iniciar_revisao(
  :'revision_id'::uuid,
  (select lock_version from public.produto_revisoes where id=:'revision_id'::uuid)
);

select public.submeter_revisao_aprovacao(
  :'revision_id'::uuid,
  (select lock_version from public.produto_revisoes where id=:'revision_id'::uuid)
);

-- Formulator não pode aprovar.
do $$
declare
  v_failed boolean := false;
  v_id uuid;
  v_lock integer;
begin
  select id,lock_version into v_id,v_lock
  from public.produto_revisoes
  where produto_id=1 and revisao_codigo='020';

  begin
    perform public.aprovar_revisao_produto(v_id,v_lock);
  exception
    when others then
      if position('APPROVER_ROLE_REQUIRED' in sqlerrm)>0 then
        v_failed := true;
      else
        raise;
      end if;
  end;

  if not v_failed then
    raise exception 'formulator sem papel aprovou indevidamente';
  end if;
end $$;

-- Quality aprova e coloca em vigência.
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-2222-2222-222222222222',
  false
);

select public.aprovar_revisao_produto(
  :'revision_id'::uuid,
  (select lock_version from public.produto_revisoes where id=:'revision_id'::uuid)
);

select public.colocar_revisao_vigente(
  :'revision_id'::uuid,
  (select lock_version from public.produto_revisoes where id=:'revision_id'::uuid)
);

do $$
declare
  v_status text;
  v_approver uuid;
begin
  select status,aprovado_por into v_status,v_approver
  from public.produto_revisoes
  where id=:'revision_id'::uuid;

  if v_status <> 'VIGENTE' then
    raise exception 'revisão não ficou vigente: %',v_status;
  end if;

  if v_approver <> '22222222-2222-2222-2222-222222222222'::uuid then
    raise exception 'aprovador incorreto';
  end if;
end $$;

-- Readonly não pode criar revisão.
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-3333-3333-333333333333',
  false
);

do $$
declare v_failed boolean := false;
begin
  begin
    perform public.criar_revisao_produto(2,'001','Readonly tentando criar');
  exception
    when others then
      if position('READONLY_USER' in sqlerrm)>0 then
        v_failed := true;
      else
        raise;
      end if;
  end;

  if not v_failed then
    raise exception 'readonly criou revisão indevidamente';
  end if;
end $$;

-- Segundo rascunho do formulator para testar lock e segregação de edição.
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  false
);

select public.criar_revisao_produto(
  2,
  '002',
  'Teste de lock'
) as revision2_id \gset

-- Lock incorreto falha.
do $$
declare v_failed boolean := false;
begin
  begin
    perform public.iniciar_revisao(:'revision2_id'::uuid,999);
  exception
    when others then
      if position('REVISION_CONFLICT' in sqlerrm)>0 then
        v_failed := true;
      else
        raise;
      end if;
  end;

  if not v_failed then
    raise exception 'lock incorreto não foi bloqueado';
  end if;
end $$;

-- Quality não ganha permissão de edição só por ser aprovador.
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-2222-2222-222222222222',
  false
);

do $$
declare
  v_failed boolean := false;
  v_lock integer;
begin
  select lock_version into v_lock
  from public.produto_revisoes
  where id=:'revision2_id'::uuid;

  begin
    perform public.atualizar_snapshot_revisao(:'revision2_id'::uuid,v_lock);
  exception
    when others then
      if position('FORBIDDEN' in sqlerrm)>0 then
        v_failed := true;
      else
        raise;
      end if;
  end;

  if not v_failed then
    raise exception 'quality editou rascunho de outro usuário';
  end if;
end $$;

-- Audit trail precisa conter atribuição de papel e ações de revisão.
do $$
declare
  v_roles integer;
  v_revs integer;
begin
  select count(*) into v_roles
  from public.audit_log
  where entity_type='app_user_role';

  select count(*) into v_revs
  from public.audit_log
  where entity_type='produto_revisao';

  if v_roles < 1 then
    raise exception 'audit de papel ausente';
  end if;

  if v_revs < 6 then
    raise exception 'audit de revisão insuficiente: %',v_revs;
  end if;
end $$;

select 'PHASE4_2_RBAC_ASSERTIONS_OK' as resultado;
