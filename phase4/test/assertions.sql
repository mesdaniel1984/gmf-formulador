\set ON_ERROR_STOP on

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  false
);

-- Snapshot legado idempotente.
\i phase4/002_legacy_snapshot.sql
\i phase4/002_legacy_snapshot.sql

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.produto_revisoes
  where status='LEGADO';

  if v_count <> 2 then
    raise exception 'esperado 2 snapshots LEGADO, encontrado %', v_count;
  end if;
end $$;

-- LEGADO precisa permanecer imutável.
do $$
declare
  v_failed boolean := false;
begin
  begin
    update public.produto_revisoes
       set snapshot = snapshot || '{"alterado":true}'::jsonb
     where status='LEGADO'
       and produto_id=1;
  exception
    when others then
      if position('snapshot imutável' in sqlerrm) > 0 then
        v_failed := true;
      else
        raise;
      end if;
  end;

  if not v_failed then
    raise exception 'mutação de snapshot LEGADO deveria falhar';
  end if;
end $$;

-- Cria revisão controlada.
insert into public.produto_revisoes(
  produto_id,
  revisao_codigo,
  status,
  snapshot,
  motivo_alteracao,
  origem,
  criado_por
) values (
  1,
  '010',
  'RASCUNHO',
  '{"nome":"Produto A","dados":{"ingredientes":[{"n":"Ingrediente 1","qtde":100}]}}'::jsonb,
  'Teste de fluxo',
  'manual',
  '11111111-1111-1111-1111-111111111111'
);

update public.produto_revisoes
   set status='EM_REVISAO'
 where produto_id=1
   and revisao_codigo='010';

update public.produto_revisoes
   set status='AGUARDANDO_APROVACAO',
       enviado_aprovacao_em=now()
 where produto_id=1
   and revisao_codigo='010';

-- Não pode alterar snapshot no mesmo UPDATE que aprova.
do $$
declare
  v_failed boolean := false;
begin
  begin
    update public.produto_revisoes
       set status='APROVADA',
           snapshot=snapshot || '{"mudou_na_aprovacao":true}'::jsonb,
           aprovado_por='11111111-1111-1111-1111-111111111111',
           aprovado_em=now()
     where produto_id=1
       and revisao_codigo='010';
  exception
    when others then
      if position('snapshot imutável' in sqlerrm) > 0 then
        v_failed := true;
      else
        raise;
      end if;
  end;

  if not v_failed then
    raise exception 'aprovação com alteração simultânea do snapshot deveria falhar';
  end if;
end $$;

-- Aprovação sem alterar conteúdo.
update public.produto_revisoes
   set status='APROVADA',
       aprovado_por='11111111-1111-1111-1111-111111111111',
       aprovado_em=now()
 where produto_id=1
   and revisao_codigo='010';

update public.produto_revisoes
   set status='VIGENTE',
       vigente_desde=now()
 where produto_id=1
   and revisao_codigo='010';

-- Uma segunda revisão pode existir, mas não pode virar VIGENTE enquanto outra já estiver vigente.
insert into public.produto_revisoes(
  produto_id,
  revisao_codigo,
  status,
  snapshot,
  motivo_alteracao,
  origem,
  criado_por
) values (
  1,
  '011',
  'RASCUNHO',
  '{"nome":"Produto A","dados":{"ingredientes":[{"n":"Ingrediente 1","qtde":100}]}}'::jsonb,
  'Segunda revisão',
  'manual',
  '11111111-1111-1111-1111-111111111111'
);

update public.produto_revisoes
   set status='EM_REVISAO'
 where produto_id=1 and revisao_codigo='011';

update public.produto_revisoes
   set status='AGUARDANDO_APROVACAO',
       enviado_aprovacao_em=now()
 where produto_id=1 and revisao_codigo='011';

update public.produto_revisoes
   set status='APROVADA',
       aprovado_por='11111111-1111-1111-1111-111111111111',
       aprovado_em=now()
 where produto_id=1 and revisao_codigo='011';

do $$
declare
  v_failed boolean := false;
begin
  begin
    update public.produto_revisoes
       set status='VIGENTE',
           vigente_desde=now()
     where produto_id=1
       and revisao_codigo='011';
  exception
    when unique_violation then
      v_failed := true;
  end;

  if not v_failed then
    raise exception 'segunda revisão VIGENTE deveria falhar';
  end if;
end $$;

-- Lock version precisa ter avançado.
do $$
declare
  v_lock integer;
begin
  select lock_version into v_lock
  from public.produto_revisoes
  where produto_id=1 and revisao_codigo='010';

  if v_lock <= 1 then
    raise exception 'lock_version não avançou: %', v_lock;
  end if;
end $$;

-- Audit log precisa ter sido alimentado pelo trigger.
do $$
declare
  v_audit integer;
begin
  select count(*) into v_audit
  from public.audit_log
  where entity_type='produto_revisao';

  if v_audit < 8 then
    raise exception 'audit_log insuficiente: %', v_audit;
  end if;
end $$;

-- Revisão controlada não aceita código vazio.
do $$
declare
  v_failed boolean := false;
begin
  begin
    insert into public.produto_revisoes(
      produto_id,revisao_codigo,status,snapshot,motivo_alteracao,origem,criado_por
    ) values (
      2,'','RASCUNHO','{}'::jsonb,'Código vazio','manual',
      '11111111-1111-1111-1111-111111111111'
    );
  exception
    when check_violation then
      v_failed := true;
  end;

  if not v_failed then
    raise exception 'revisao_codigo vazio deveria falhar';
  end if;
end $$;

-- Snapshot não pode ser array.
do $$
declare
  v_failed boolean := false;
begin
  begin
    insert into public.produto_revisoes(
      produto_id,revisao_codigo,status,snapshot,motivo_alteracao,origem,criado_por
    ) values (
      2,'001','RASCUNHO','[]'::jsonb,'Snapshot inválido','manual',
      '11111111-1111-1111-1111-111111111111'
    );
  exception
    when check_violation then
      v_failed := true;
  end;

  if not v_failed then
    raise exception 'snapshot array deveria falhar';
  end if;
end $$;

select 'PHASE4_1_SCHEMA_ASSERTIONS_OK' as resultado;
