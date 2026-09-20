(function(){
  'use strict';

  function el(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function db(){try{return _sb||null;}catch(e){return null;}}
  function user(){try{return _currentUser||null;}catch(e){return null;}}
  function product(){try{return _prodOrigem||null;}catch(e){return null;}}
  function dirty(){try{return typeof _receitaFoiAlterada==='function'?!!_receitaFoiAlterada():false;}catch(e){return false;}}
  function hasRole(ctx,role){return !!(ctx&&ctx.roles&&ctx.roles.indexOf(role)>-1);}
  function isEditor(ctx,rev){
    var u=user();
    return !!u && !!rev && (rev.criado_por===u.id || hasRole(ctx,'rd') || hasRole(ctx,'admin'));
  }
  function canApprove(ctx){return hasRole(ctx,'quality')||hasRole(ctx,'regulatory')||hasRole(ctx,'admin');}
  function canEffective(ctx){return hasRole(ctx,'quality')||hasRole(ctx,'admin');}
  function fmtDate(v){
    if(!v)return '—';
    try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}
    catch(e){return String(v);}
  }
  function statusMeta(s){
    var m={
      LEGADO:['Legado','legacy'],
      RASCUNHO:['Rascunho','draft'],
      EM_REVISAO:['Em revisão','review'],
      AGUARDANDO_APROVACAO:['Aguardando aprovação','waiting'],
      APROVADA:['Aprovada','approved'],
      VIGENTE:['Vigente','effective'],
      OBSOLETA:['Obsoleta','obsolete'],
      REJEITADA:['Rejeitada','rejected'],
      CANCELADA:['Cancelada','cancelled']
    };
    return m[s]||[s||'—','neutral'];
  }
  function roleLabel(r){
    return {
      admin:'Admin',
      rd:'P&D',
      quality:'Qualidade',
      regulatory:'Regulatório',
      procurement:'Compras',
      production:'Produção',
      auditor:'Auditoria',
      executive:'Executivo'
    }[r]||r;
  }
  function errorText(error){
    var raw=String((error&&error.message)||error||'Erro desconhecido');
    var map=[
      ['REVISION_CONFLICT','A revisão foi alterada por outra sessão. A lista foi recarregada.'],
      ['READONLY_USER','Seu perfil é somente leitura.'],
      ['APPROVER_ROLE_REQUIRED','Esta ação exige papel de Qualidade, Regulatório ou Admin.'],
      ['EFFECTIVE_ROLE_REQUIRED','Colocar em vigência exige papel de Qualidade ou Admin.'],
      ['FORBIDDEN','Seu usuário não pode editar esta revisão.'],
      ['INVALID_STATUS','A revisão não está no estado esperado para esta ação.'],
      ['REVISION_NOT_EDITABLE','A revisão não pode mais ter seu conteúdo atualizado.'],
      ['REVISION_CODE_REQUIRED','Informe o código da revisão.'],
      ['CHANGE_REASON_REQUIRED','Informe o motivo da alteração.'],
      ['REJECTION_REASON_REQUIRED','Informe o motivo da rejeição.'],
      ['AUTH_REQUIRED','Sua sessão expirou. Entre novamente.']
    ];
    for(var i=0;i<map.length;i++)if(raw.indexOf(map[i][0])>-1)return map[i][1];
    if(raw.indexOf('duplicate key')>-1||raw.indexOf('ux_produto_revisao_controlada')>-1)return 'Já existe uma revisão com esse código para este produto.';
    return raw.replace(/^.*?:\s*/,'').slice(0,220);
  }

  var state={open:false,loading:false,ctx:null,revisions:[],productId:null,message:null,messageKind:'info'};

  function ensureUi(){
    var ws=el('i2Workspace');
    if(!ws)return false;
    var actions=ws.querySelector('.i2-ws-actions');
    if(actions&&!el('i2wsRevisions')){
      var b=document.createElement('button');
      b.type='button';b.className='i2-ws-btn';b.id='i2wsRevisions';
      b.innerHTML='Revisões <span class="i2-rev-btn-dot" aria-hidden="true"></span>';
      b.addEventListener('click',openPanel);
      actions.insertBefore(b,actions.firstChild);
    }
    if(!el('i2RevisionOverlay')){
      var overlay=document.createElement('div');
      overlay.className='i2-rev-overlay';overlay.id='i2RevisionOverlay';overlay.hidden=true;
      overlay.innerHTML='<section class="i2-rev-drawer" role="dialog" aria-modal="true" aria-labelledby="i2RevTitle">'
        +'<header class="i2-rev-head"><div><span class="i2-rev-kicker">Ciclo de vida controlado</span><h2 id="i2RevTitle">Revisões do produto</h2><p id="i2RevSubtitle">Carregue um produto salvo para consultar revisões.</p></div>'
        +'<button type="button" class="i2-rev-close" id="i2RevClose" aria-label="Fechar">×</button></header>'
        +'<div class="i2-rev-identity" id="i2RevIdentity"></div>'
        +'<div class="i2-rev-message" id="i2RevMessage" hidden></div>'
        +'<div class="i2-rev-content" id="i2RevContent"></div>'
        +'</section>';
      document.body.appendChild(overlay);
      el('i2RevClose').addEventListener('click',closePanel);
      overlay.addEventListener('click',function(e){if(e.target===overlay)closePanel();});
      overlay.addEventListener('click',handleAction);
      overlay.addEventListener('submit',handleSubmit);
    }
    return true;
  }

  function closePanel(){
    var o=el('i2RevisionOverlay');if(o)o.hidden=true;
    state.open=false;
  }
  function setMessage(text,kind){
    state.message=text||null;state.messageKind=kind||'info';
    var m=el('i2RevMessage');if(!m)return;
    if(!text){m.hidden=true;m.textContent='';return;}
    m.hidden=false;m.className='i2-rev-message '+state.messageKind;m.textContent=text;
  }
  function setLoading(on){
    state.loading=!!on;
    var c=el('i2RevContent');
    if(on&&c)c.innerHTML='<div class="i2-rev-loading"><span class="spinner"></span><span>Carregando revisões…</span></div>';
  }

  async function loadContext(){
    var s=db(),u=user();
    if(!s||!u)throw new Error('AUTH_REQUIRED');
    var results=await Promise.all([
      s.from('app_user_roles').select('role').eq('user_id',u.id),
      s.from('perfis').select('readonly').eq('id',u.id).single()
    ]);
    if(results[0].error)throw results[0].error;
    if(results[1].error)throw results[1].error;
    return {
      roles:(results[0].data||[]).map(function(x){return x.role;}),
      readonly:!!(results[1].data&&results[1].data.readonly)
    };
  }

  async function loadRevisions(productId){
    var s=db();
    var q=await s.from('produto_revisoes')
      .select('id,produto_id,revisao_codigo,legacy_revision_text,status,motivo_alteracao,origem,criado_por,criado_em,atualizado_em,enviado_aprovacao_em,aprovado_por,aprovado_em,vigente_desde,obsoleta_em,rejeitada_em,rejeicao_motivo,lock_version')
      .eq('produto_id',productId)
      .order('criado_em',{ascending:false});
    if(q.error)throw q.error;
    return q.data||[];
  }

  async function openPanel(){
    if(!ensureUi())return;
    var overlay=el('i2RevisionOverlay');overlay.hidden=false;state.open=true;
    setMessage(null);setLoading(true);
    var p=product();
    state.productId=p&&p.id!=null?Number(p.id):null;
    var sub=el('i2RevSubtitle');
    if(!state.productId){
      state.ctx=null;state.revisions=[];
      if(sub)sub.textContent='Nenhum produto salvo está carregado no workspace.';
      render();
      return;
    }
    if(sub)sub.textContent=(p.nome||'Produto')+' · ID '+state.productId;
    try{
      state.ctx=await loadContext();
      state.revisions=await loadRevisions(state.productId);
      render();
    }catch(e){
      state.ctx=null;state.revisions=[];
      render();
      setMessage(errorText(e),'danger');
    }
  }

  function renderIdentity(){
    var box=el('i2RevIdentity');if(!box)return;
    if(!state.ctx){box.innerHTML='<span>Permissões indisponíveis</span>';return;}
    var roles=state.ctx.roles.length?state.ctx.roles.map(roleLabel).join(' · '):'sem papel de aprovação';
    box.innerHTML='<span class="i2-rev-id-item"><b>Perfil</b> '+(state.ctx.readonly?'Somente leitura':'Editável')+'</span>'
      +'<span class="i2-rev-id-item"><b>Papéis</b> '+esc(roles)+'</span>'
      +'<span class="i2-rev-id-note">Papéis vêm do banco e não são inferidos pelo cargo.</span>';
  }

  function renderCreate(){
    var p=product(),ctx=state.ctx;
    if(!p||!state.productId)return '<div class="i2-rev-empty"><strong>Carregue um produto salvo</strong><span>A revisão controlada precisa estar vinculada a um produto existente.</span></div>';
    if(!ctx)return '';
    if(ctx.readonly)return '<div class="i2-rev-callout warn"><strong>Perfil somente leitura</strong><span>Você pode consultar revisões, mas não criar ou avançar o workflow.</span></div>';
    var isDirty=dirty();
    return '<div class="i2-rev-create">'
      +'<div class="i2-rev-section-title"><div><strong>Nova revisão controlada</strong><span>Captura um snapshot do produto já salvo no Supabase.</span></div></div>'
      +(isDirty?'<div class="i2-rev-callout warn"><strong>Há alteração local não salva</strong><span>A revisão usa o produto salvo no banco. Salve/derive o produto antes de criar a revisão para evitar divergência.</span></div>':'')
      +'<form id="i2RevCreateForm" class="i2-rev-form">'
      +'<label><span>Código da revisão</span><input name="revision" maxlength="40" placeholder="Ex.: 003" autocomplete="off" '+(isDirty?'disabled':'')+' required></label>'
      +'<label class="wide"><span>Motivo da alteração</span><textarea name="reason" rows="2" maxlength="500" placeholder="Descreva o motivo da revisão" '+(isDirty?'disabled':'')+' required></textarea></label>'
      +'<button class="i2-ws-btn primary" type="submit" '+(isDirty?'disabled':'')+'>Criar rascunho</button>'
      +'</form></div>';
  }

  function actionButtons(rev){
    var ctx=state.ctx;if(!ctx||ctx.readonly||rev.status==='LEGADO')return '';
    var out=[],editable=isEditor(ctx,rev);
    if(rev.status==='RASCUNHO'&&editable)out.push(['start','Iniciar revisão','']);
    if(rev.status==='EM_REVISAO'&&editable)out.push(['submit','Enviar para aprovação','primary']);
    if(rev.status==='AGUARDANDO_APROVACAO'&&canApprove(ctx)){
      out.push(['approve','Aprovar','success']);
      out.push(['reject','Rejeitar','danger']);
    }
    if(rev.status==='REJEITADA'&&editable)out.push(['reopen','Reabrir','']);
    if(rev.status==='APROVADA'&&canEffective(ctx))out.push(['effective','Colocar vigente','success']);
    if(!out.length)return '';
    return '<div class="i2-rev-actions">'+out.map(function(a){
      return '<button type="button" class="i2-rev-action '+a[2]+'" data-rev-action="'+a[0]+'" data-rev-id="'+esc(rev.id)+'" data-rev-lock="'+esc(rev.lock_version)+'">'+esc(a[1])+'</button>';
    }).join('')+'</div>';
  }

  function revisionCard(rev){
    var sm=statusMeta(rev.status);
    var code=rev.status==='LEGADO'?(rev.legacy_revision_text||'sem revisão no legado'):(rev.revisao_codigo||'—');
    var meta=[];
    meta.push('Criada '+fmtDate(rev.criado_em));
    if(rev.aprovado_em)meta.push('Aprovada '+fmtDate(rev.aprovado_em));
    if(rev.vigente_desde)meta.push('Vigente desde '+fmtDate(rev.vigente_desde));
    if(rev.obsoleta_em)meta.push('Obsoleta '+fmtDate(rev.obsoleta_em));
    return '<article class="i2-rev-card '+sm[1]+'">'
      +'<div class="i2-rev-card-head"><div><span class="i2-rev-code">'+esc(code)+'</span><strong>'+esc(sm[0])+'</strong></div><span class="i2-rev-lock">v'+esc(rev.lock_version)+'</span></div>'
      +'<div class="i2-rev-card-meta">'+meta.map(function(x){return '<span>'+esc(x)+'</span>';}).join('')+'</div>'
      +(rev.motivo_alteracao?'<p class="i2-rev-reason">'+esc(rev.motivo_alteracao)+'</p>':'')
      +(rev.rejeicao_motivo?'<div class="i2-rev-callout danger"><strong>Motivo da rejeição</strong><span>'+esc(rev.rejeicao_motivo)+'</span></div>':'')
      +(rev.status==='LEGADO'?'<div class="i2-rev-legacy-note">Snapshot histórico. Não representa aprovação ou vigência.</div>':'')
      +actionButtons(rev)
      +'</article>';
  }

  function render(){
    renderIdentity();
    var c=el('i2RevContent');if(!c)return;
    var create=renderCreate();
    var list='<div class="i2-rev-list-head"><div><strong>Histórico de revisões</strong><span>'+state.revisions.length+' registro'+(state.revisions.length===1?'':'s')+'</span></div><button type="button" class="i2-rev-refresh" data-rev-action="refresh">Atualizar</button></div>';
    if(state.revisions.length){
      list+='<div class="i2-rev-list">'+state.revisions.map(revisionCard).join('')+'</div>';
    }else if(state.productId){
      list+='<div class="i2-rev-empty"><strong>Nenhuma revisão disponível</strong><span>O produto ainda não possui snapshot no ciclo controlado.</span></div>';
    }
    c.innerHTML=create+list;
  }

  async function reload(message,kind){
    try{
      state.revisions=state.productId?await loadRevisions(state.productId):[];
      render();setMessage(message||null,kind||'ok');
    }catch(e){render();setMessage(errorText(e),'danger');}
  }

  async function callRpc(name,args,success){
    if(state.loading)return;
    state.loading=true;setMessage('Processando…','info');
    try{
      var s=db();if(!s)throw new Error('AUTH_REQUIRED');
      var r=await s.rpc(name,args||{});
      if(r.error)throw r.error;
      state.loading=false;
      await reload(success||'Ação concluída.','ok');
    }catch(e){
      state.loading=false;
      var msg=errorText(e);
      if(String((e&&e.message)||e).indexOf('REVISION_CONFLICT')>-1){
        try{state.revisions=await loadRevisions(state.productId);}catch(_){}
        render();
      }
      setMessage(msg,'danger');
    }
  }

  async function handleSubmit(e){
    if(e.target&&e.target.id==='i2RevCreateForm'){
      e.preventDefault();
      if(!state.productId||dirty())return;
      var fd=new FormData(e.target),code=String(fd.get('revision')||'').trim(),reason=String(fd.get('reason')||'').trim();
      if(!code||!reason){setMessage('Informe código da revisão e motivo da alteração.','warn');return;}
      await callRpc('criar_revisao_produto',{
        p_produto_id:state.productId,
        p_revisao_codigo:code,
        p_motivo:reason
      },'Rascunho criado a partir do produto salvo.');
    }
  }

  async function handleAction(e){
    var b=e.target.closest('[data-rev-action]');if(!b)return;
    var action=b.getAttribute('data-rev-action');
    if(action==='refresh'){await reload('Lista atualizada.','info');return;}
    var id=b.getAttribute('data-rev-id'),lock=Number(b.getAttribute('data-rev-lock'));
    if(!id||!isFinite(lock))return;

    if(action==='start'){
      await callRpc('iniciar_revisao',{p_revisao_id:id,p_expected_lock_version:lock},'Revisão iniciada.');
    }else if(action==='submit'){
      if(!confirm('Enviar esta revisão para aprovação? O snapshot fica sujeito ao fluxo controlado.'))return;
      await callRpc('submeter_revisao_aprovacao',{p_revisao_id:id,p_expected_lock_version:lock},'Revisão enviada para aprovação.');
    }else if(action==='approve'){
      if(!confirm('Aprovar esta revisão? A aprovação ficará registrada no audit trail.'))return;
      await callRpc('aprovar_revisao_produto',{p_revisao_id:id,p_expected_lock_version:lock},'Revisão aprovada.');
    }else if(action==='reject'){
      var reason=prompt('Informe o motivo da rejeição:','');
      if(reason===null)return;
      reason=String(reason).trim();
      if(!reason){setMessage('A rejeição exige motivo.','warn');return;}
      await callRpc('rejeitar_revisao_produto',{p_revisao_id:id,p_expected_lock_version:lock,p_motivo:reason},'Revisão rejeitada com motivo registrado.');
    }else if(action==='reopen'){
      await callRpc('reabrir_revisao_produto',{p_revisao_id:id,p_expected_lock_version:lock},'Revisão reaberta como rascunho.');
    }else if(action==='effective'){
      if(!confirm('Colocar esta revisão em VIGÊNCIA? Se existir outra revisão vigente do produto, ela ficará obsoleta.'))return;
      await callRpc('colocar_revisao_vigente',{p_revisao_id:id,p_expected_lock_version:lock},'Revisão colocada em vigência.');
    }
  }

  function boot(){
    if(!ensureUi()){
      var tries=0,t=setInterval(function(){tries++;if(ensureUi()||tries>30)clearInterval(t);},250);
    }
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&state.open)closePanel();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();