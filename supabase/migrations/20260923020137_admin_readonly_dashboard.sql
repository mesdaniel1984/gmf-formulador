-- Read-only dashboard. Invoker privileges preserve source RLS.
create or replace function public.painel_admin_dados()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  fontes jsonb;
  laudos_json jsonb;
  entrada_json jsonb;
  atendimento_json jsonb;
begin
  if auth.uid() is null
     or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false'
     or not exists (select 1 from public.app_user_roles where user_id=auth.uid() and role='admin') then
    raise exception 'Acesso exclusivo da Administração' using errcode='42501';
  end if;

  select coalesce(jsonb_object_agg(s.key, jsonb_build_object(
    'atualizado_em',s.updated_at,
    'registros',case when jsonb_typeof(s.data)='array' then
      (select coalesce(jsonb_agg(jsonb_build_object(
        'id',x->>'id','numero',coalesce(x->>'num',x->>'codigo'),
        'titulo',case s.key when 'licencas' then x->>'doc' when 'docs' then x->>'titulo'
          when 'planoacao' then x->>'oque' else x->>'prod' end,
        'empresa',x->>'empresa','status',x->>'status','data',x->>'data',
        'prazo',case s.key when 'licencas' then x->>'venc' when 'docs' then x->>'proxRev' else x->>'prazo' end,
        'responsavel',coalesce(x->>'resp',x->>'quem',x->>'responsavel')
      )),'[]'::jsonb) from jsonb_array_elements(s.data) x)
      else null end
    )),'{}'::jsonb) into fontes
  from public.app_state s where s.key in ('ncs','sac','licencas','planoacao','docs');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'numero',coalesce(nullif(numero_laudo,''),nullif(num_laudo,''),id),
    'titulo',produto_nome,'status',status,'lote',lote,
    'data',coalesce(nullif(data_emissao,''),to_char(emitido_em at time zone 'America/Sao_Paulo','YYYY-MM-DD'),
      to_char(criado_em at time zone 'America/Sao_Paulo','YYYY-MM-DD'))
  )),'[]'::jsonb) into laudos_json from public.laudos;

  -- A denied SAC source must not be presented as an empty queue.
  if public.sac_pode_ler() then
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'numero',protocolo,
      'titulo',assunto,'status',situacao,'sac_id',sac_id,
      'data',to_char(criado_em at time zone 'America/Sao_Paulo','YYYY-MM-DD'))),'[]'::jsonb)
      into entrada_json from public.sac_entrada;
    select coalesce(jsonb_agg(jsonb_build_object('status',situacao,
      'data',to_char(aberto_em at time zone 'America/Sao_Paulo','YYYY-MM-DD'))),'[]'::jsonb)
      into atendimento_json from public.wa_atendimento;
  end if;
  return jsonb_build_object('consultado_em',now(),'fontes',fontes,
    'laudos',laudos_json,'entrada_sac',entrada_json,'atendimento_humano',atendimento_json,
    'rondas',null,'omie',null);
end;
$$;
revoke all on function public.painel_admin_dados() from public,anon,authenticated;
grant execute on function public.painel_admin_dados() to authenticated;
comment on function public.painel_admin_dados() is 'Admin-only read model. No writes, no OMIE requests; preserves source RLS and separates SAC queues.';
