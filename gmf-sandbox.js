(function(){
  'use strict';

  function el(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function db(){try{return _sb||null;}catch(e){return null;}}
  function user(){try{return _currentUser||null;}catch(e){return null;}}
  function product(){try{return _prodOrigem||null;}catch(e){return null;}}
  function dirty(){try{return typeof _receitaFoiAlterada==='function'?!!_receitaFoiAlterada():false;}catch(e){return false;}}
  function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
  function hasRole(ctx,role){return !!(ctx&&ctx.roles&&ctx.roles.indexOf(role)>-1);}
  function canView(ctx){
    return hasRole(ctx,'rd')||hasRole(ctx,'admin')||hasRole(ctx,'quality')||hasRole(ctx,'regulatory');
  }
  function canMaintain(ctx){
    return !!ctx&&!ctx.readonly&&(hasRole(ctx,'rd')||hasRole(ctx,'admin'));
  }
  function roleLabel(r){
    return {admin:'Admin',rd:'P&D',quality:'Qualidade',regulatory:'Regulatório'}[r]||r;
  }
  function fmtDate(v){
    if(!v)return '—';
    try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v));}
    catch(e){return String(v);}
  }
  function fmtNum(v){
    var n=Number(v);
    if(!isFinite(n))return '—';
    return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(n);
  }
  function statusMeta(s){
    return {
      ATIVO:['Ativo','active'],
      PROMOVIDO:['Promovido','promoted'],
      ARQUIVADO:['Arquivado','archived']
    }[s]||[s||'—','neutral'];
  }
  function errorText(error){
    var raw=String((error&&error.message)||error||'Erro desconhecido');
    var map=[
      ['AUTH_REQUIRED','Sua sessão expirou. Entre novamente.'],
      ['PRODUCT_NOT_FOUND','Selecione um produto cadastrado antes de abrir o Sandbox.'],
      ['READONLY_USER','Seu perfil é somente leitura.'],
      ['SANDBOX_ROLE_REQUIRED','Esta ação exige papel de P&D ou Admin.'],
      ['SANDBOX_CONFLICT','O cenário foi alterado por outra sessão. A lista foi recarregada.'],
      ['SANDBOX_NOT_EDITABLE','Este cenário não pode mais ser alterado.'],
      ['SANDBOX_TERMINAL_IMMUTABLE','Cenário promovido/arquivado é imutável.'],
      ['SANDBOX_NAME_REQUIRED','Informe um nome para o cenário.'],
      ['SANDBOX_SNAPSHOT_INVALID','O snapshot do cenário é inválido.'],
      ['BASE_REVISION_NOT_FOUND','A revisão-base não foi encontrada para este produto.'],
      ['REVISION_CODE_REQUIRED','Informe o código da nova revisão.'],
      ['CHANGE_REASON_REQUIRED','Informe o motivo da promoção.']
    ];
    for(var i=0;i<map.length;i++)if(raw.indexOf(map[i][0])>-1)return map[i][1];
    if(raw.indexOf('duplicate key')>-1)return 'Já existe um registro com essa identificação.';
    return raw.replace(/^.*?:\s*/,'').slice(0,240);
  }

  function ingredients(snapshot){
    var d=snapshot&&snapshot.dados;
    return d&&Array.isArray(d.ingredientes)?d.ingredientes:[];
  }
  function formulaTotal(snapshot){
    return ingredients(snapshot).reduce(function(sum,x){
      var n=Number(x&&x.qtde);
      return sum+(isFinite(n)?n:0);
    },0);
  }
  function formulaCount(snapshot){return ingredients(snapshot).length;}
  function formulaBalanced(snapshot){return Math.abs(formulaTotal(snapshot)-1000)<=0.001;}
  function ingredientKey(x,i){
    if(x&&x.ref)return 'ref:'+String(x.ref);
    if(x&&x.nome)return 'nome:'+String(x.nome);
    if(x&&x.nomeExib)return 'exib:'+String(x.nomeExib);
    return 'idx:'+i;
  }
  function ingredientLabel(x){
    return String((x&&(x.nomeExib||x.nome||x.ref))||'Ingrediente');
  }
  function ingredientMap(snapshot){
    var m={};
    ingredients(snapshot).forEach(function(x,i){
      var k=ingredientKey(x,i);
      m[k]={key:k,label:ingredientLabel(x),qty:Number(x&&x.qtde)||0,raw:x,index:i};
    });
    return m;
  }
  function formulaDiff(a,b){
    var am=ingredientMap(a),bm=ingredientMap(b),keys={};
    Object.keys(am).forEach(function(k){keys[k]=1;});
    Object.keys(bm).forEach(function(k){keys[k]=1;});
    return Object.keys(keys).map(function(k){
      var x=am[k],y=bm[k];
      var before=x?x.qty:null,after=y?y.qty:null,status='same';
      if(!x)status='added';
      else if(!y)status='removed';
      else if(Math.abs(before-after)>0.000001)status='changed';
      return {
        key:k,
        label:(y&&y.label)||(x&&x.label)||k,
        before:before,
        after:after,
        delta:(before==null||after==null)?null:after-before,
        status:status
      };
    }).sort(function(x,y){
      var order={changed:0,added:1,removed:2,same:3};
      return order[x.status]-order[y.status]||x.label.localeCompare(y.label,'pt-BR');
    });
  }
  function flattenScalars(value,prefix,out){
    if(prefix==='dados.ingredientes')return;
    if(value===null||value===undefined||typeof value!=='object'){
      out[prefix||'(raiz)']=value;
      return;
    }
    if(Array.isArray(value)){
      out[prefix||'(raiz)']=JSON.stringify(value);
      return;
    }
    Object.keys(value).sort().forEach(function(k){
      var p=prefix?prefix+'.'+k:k;
      if(p==='dados.ingredientes')return;
      flattenScalars(value[k],p,out);
    });
  }
  function scalarDiff(a,b){
    var x={},y={},keys={};
    flattenScalars(a,'',x);flattenScalars(b,'',y);
    Object.keys(x).forEach(function(k){keys[k]=1;});
    Object.keys(y).forEach(function(k){keys[k]=1;});
    return Object.keys(keys).filter(function(k){
      return JSON.stringify(x[k])!==JSON.stringify(y[k]);
    }).map(function(k){return {path:k,before:x[k],after:y[k]};});
  }
  function shortValue(v){
    if(v===undefined)return '—';
    if(v===null)return 'null';
    var s=typeof v==='string'?v:JSON.stringify(v);
    if(s.length>90)s=s.slice(0,87)+'…';
    return s;
  }

  var state={
    open:false,
    loading:false,
    ctx:null,
    productId:null,
    currentSnapshot:null,
    sandboxes:[],
    revisions:[],
    tab:'scenarios',
    editId:null,
    editSnapshot:null,
    compareA:null,
    compareB:'current',
    promotionId:null,
    missingProduct:false
  };

  function ensureUi(){
    var ws=el('i2Workspace');
    if(!ws)return false;
    var actions=ws.querySelector('.i2-ws-actions');
    if(actions&&!el('i2wsSandbox')){
      var b=document.createElement('button');
      b.type='button';
      b.className='i2-ws-btn i2-sb-launch';
      b.id='i2wsSandbox';
      b.hidden=true;
      b.innerHTML='Sandbox <span class="i2-sb-dot" aria-hidden="true"></span>';
      b.title='Cenários experimentais de P&D — não oficiais';
      b.addEventListener('click',openPanel);
      actions.insertBefore(b,actions.firstChild);
    }
    if(!el('i2SandboxOverlay')){
      var overlay=document.createElement('div');
      overlay.className='i2-sb-overlay';
      overlay.id='i2SandboxOverlay';
      overlay.hidden=true;
      overlay.innerHTML=
        '<section class="i2-sb-drawer" role="dialog" aria-modal="true" aria-labelledby="i2SbTitle">'
        +'<header class="i2-sb-head"><div><span class="i2-sb-kicker">Ambiente experimental · não oficial</span><h2 id="i2SbTitle">Sandbox de P&D</h2><p id="i2SbSubtitle">Cenários isolados do produto oficial.</p></div>'
        +'<button type="button" class="i2-sb-close" id="i2SbClose" aria-label="Fechar">×</button></header>'
        +'<nav class="i2-sb-tabs" aria-label="Sandbox"><button type="button" data-sb-tab="scenarios" class="active">Cenários</button><button type="button" data-sb-tab="compare">Comparar</button></nav>'
        +'<div class="i2-sb-identity" id="i2SbIdentity"></div>'
        +'<div class="i2-sb-message" id="i2SbMessage" hidden></div>'
        +'<div class="i2-sb-content" id="i2SbContent"></div>'
        +'</section>';
      document.body.appendChild(overlay);
      el('i2SbClose').addEventListener('click',closePanel);
      overlay.addEventListener('click',handleClick);
      overlay.addEventListener('submit',handleSubmit);
      overlay.addEventListener('input',handleInput);
      overlay.addEventListener('change',handleChange);
      overlay.addEventListener('click',function(e){if(e.target===overlay)closePanel();});
    }
    return true;
  }

  async function loadContext(){
    var s=db(),u=user();
    if(!s||!u)throw new Error('AUTH_REQUIRED');
    var out=await Promise.all([
      s.from('app_user_roles').select('role').eq('user_id',u.id),
      s.from('perfis').select('readonly').eq('id',u.id).single()
    ]);
    if(out[0].error)throw out[0].error;
    if(out[1].error)throw out[1].error;
    return {
      roles:(out[0].data||[]).map(function(x){return x.role;}),
      readonly:!!(out[1].data&&out[1].data.readonly)
    };
  }
  async function loadCurrentSnapshot(id){
    var s=db();
    var q=await s.from('produtos').select('id,nome,classificacao,dados').eq('id',id).single();
    if(q.error)throw q.error;
    return {nome:q.data.nome,classificacao:q.data.classificacao,dados:q.data.dados};
  }
  async function loadRevisions(id){
    var q=await db().from('produto_revisoes')
      .select('id,revisao_codigo,legacy_revision_text,status,snapshot,criado_em,vigente_desde')
      .eq('produto_id',id)
      .order('criado_em',{ascending:false});
    if(q.error)throw q.error;
    return q.data||[];
  }
  async function loadSandboxes(id){
    var q=await db().from('produto_sandboxes')
      .select('id,produto_id,base_revisao_id,nome,descricao,snapshot,status,criado_por,criado_em,atualizado_em,promovido_para_revisao_id,promovido_em,arquivado_em,lock_version')
      .eq('produto_id',id)
      .order('criado_em',{ascending:false});
    if(q.error)throw q.error;
    return q.data||[];
  }

  async function refreshAccess(){
    var b=el('i2wsSandbox');
    if(!b)return;
    try{
      var ctx=await loadContext();
      state.ctx=ctx;
      b.hidden=!canView(ctx);
    }catch(e){b.hidden=true;}
  }
  async function loadAll(){
    var p=product();
    state.productId=p&&p.id!=null?Number(p.id):null;
    if(!state.productId)throw new Error('PRODUCT_NOT_FOUND');
    var results=await Promise.all([
      loadContext(),
      loadCurrentSnapshot(state.productId),
      loadRevisions(state.productId),
      loadSandboxes(state.productId)
    ]);
    state.ctx=results[0];
    if(!canView(state.ctx))throw new Error('FORBIDDEN');
    state.currentSnapshot=results[1];
    state.revisions=results[2];
    state.sandboxes=results[3];
  }

  function setMessage(text,kind){
    var m=el('i2SbMessage');if(!m)return;
    if(!text){m.hidden=true;m.textContent='';return;}
    m.hidden=false;m.className='i2-sb-message '+(kind||'info');m.textContent=text;
  }
  function setLoading(on){
    state.loading=!!on;
    var c=el('i2SbContent');
    if(on&&c)c.innerHTML='<div class="i2-sb-loading"><span class="spinner"></span><span>Carregando Sandbox…</span></div>';
  }
  function closePanel(){
    var o=el('i2SandboxOverlay');if(o)o.hidden=true;
    state.open=false;state.editId=null;state.editSnapshot=null;state.promotionId=null;
  }
  async function openPanel(){
    if(!ensureUi())return;
    var o=el('i2SandboxOverlay');o.hidden=false;state.open=true;state.tab='scenarios';
    setMessage(null);setLoading(true);
    try{
      var selected=product();
      if(!selected||selected.id==null){
        state.missingProduct=true;
        state.ctx=await loadContext();
        state.productId=null;state.sandboxes=[];state.revisions=[];state.currentSnapshot=null;
        var missingSubtitle=el('i2SbSubtitle');
        if(missingSubtitle)missingSubtitle.textContent='Selecione um produto salvo para consultar cenários experimentais.';
        render();
        setMessage('Selecione um produto cadastrado antes de abrir o Sandbox.','info');
        return;
      }
      state.missingProduct=false;
      await loadAll();
      var p=product(),sub=el('i2SbSubtitle');
      if(sub)sub.textContent=(p&&p.nome?p.nome:'Produto')+' · cenários isolados do registro oficial';
      render();
    }catch(e){
      state.missingProduct=false;
      state.ctx=null;state.sandboxes=[];state.revisions=[];state.currentSnapshot=null;
      render();setMessage(errorText(e),'danger');
    }
  }
  async function reload(message,kind){
    try{
      await loadAll();
      render();
      if(message)setMessage(message,kind||'ok');
    }catch(e){render();setMessage(errorText(e),'danger');}
  }

  function renderIdentity(){
    var box=el('i2SbIdentity');if(!box)return;
    if(!state.ctx){box.innerHTML='<span>Permissões indisponíveis</span>';return;}
    var rs=state.ctx.roles.filter(function(r){return ['rd','admin','quality','regulatory'].indexOf(r)>-1;});
    box.innerHTML=
      '<span class="i2-sb-id"><b>Acesso</b> '+esc(rs.length?rs.map(roleLabel).join(' · '):'sem papel de Sandbox')+'</span>'
      +'<span class="i2-sb-id"><b>Modo</b> '+(canMaintain(state.ctx)?'Editar cenários':'Somente consulta')+'</span>'
      +'<span class="i2-sb-id-note">Sandbox não representa aprovação, vigência ou fórmula oficial.</span>';
  }
  function syncTabs(){
    document.querySelectorAll('#i2SandboxOverlay [data-sb-tab]').forEach(function(b){
      b.classList.toggle('active',b.getAttribute('data-sb-tab')===state.tab);
    });
  }
  function render(){
    renderIdentity();syncTabs();
    var c=el('i2SbContent');if(!c)return;
    if(state.missingProduct){
      c.innerHTML='<div class="i2-sb-empty"><strong>Nenhum produto selecionado</strong><span>Feche este painel e escolha um item em Produtos cadastrados. O Sandbox só trabalha com produtos já salvos.</span></div>';
      return;
    }
    if(state.editId){c.innerHTML=renderEditor();return;}
    if(state.promotionId){c.innerHTML=renderPromotion();return;}
    c.innerHTML=state.tab==='compare'?renderCompare():renderScenarios();
  }

  function baseOptions(){
    var opts=[{id:'current',label:'Produto atual salvo'}];
    state.revisions.forEach(function(r){
      var code=r.status==='LEGADO'?(r.legacy_revision_text||'Legado sem revisão'):(r.revisao_codigo||'—');
      opts.push({id:'revision:'+r.id,label:'Revisão '+code+' · '+r.status});
    });
    return opts;
  }
  function renderCreate(){
    if(!canMaintain(state.ctx))return '<div class="i2-sb-callout info"><strong>Consulta de cenários</strong><span>Qualidade/Regulatório podem comparar cenários, mas criação e alteração são exclusivas de P&D/Admin.</span></div>';
    var opts=baseOptions().map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.label)+'</option>';}).join('');
    return '<section class="i2-sb-create"><div class="i2-sb-section-head"><div><strong>Novo cenário experimental</strong><span>Cria uma cópia isolada. Nada muda no produto oficial.</span></div></div>'
      +'<form id="i2SbCreateForm" class="i2-sb-create-grid">'
      +'<label><span>Nome do cenário</span><input name="name" maxlength="100" placeholder="Ex.: Redução de açúcar v1" required></label>'
      +'<label><span>Base</span><select name="base">'+opts+'</select></label>'
      +'<label class="wide"><span>Objetivo/descrição</span><textarea name="description" rows="2" maxlength="500" placeholder="O que será testado neste cenário?"></textarea></label>'
      +'<button type="submit" class="i2-ws-btn primary">Criar cenário</button>'
      +'</form></section>';
  }
  function sandboxCard(sb){
    var sm=statusMeta(sb.status),total=formulaTotal(sb.snapshot),count=formulaCount(sb.snapshot);
    var actions='<button type="button" data-sb-action="compare" data-sb-id="'+esc(sb.id)+'">Comparar</button>';
    if(canMaintain(state.ctx)&&sb.status==='ATIVO'){
      actions='<button type="button" data-sb-action="edit" data-sb-id="'+esc(sb.id)+'">Editar cenário</button>'
        +actions
        +'<button type="button" class="promote" data-sb-action="promote" data-sb-id="'+esc(sb.id)+'">Promover</button>'
        +'<button type="button" class="archive" data-sb-action="archive" data-sb-id="'+esc(sb.id)+'" data-sb-lock="'+esc(sb.lock_version)+'">Arquivar</button>';
    }
    return '<article class="i2-sb-card '+sm[1]+'">'
      +'<div class="i2-sb-card-top"><div><span class="i2-sb-status '+sm[1]+'">'+esc(sm[0])+'</span><strong>'+esc(sb.nome)+'</strong></div><span class="i2-sb-lock">v'+esc(sb.lock_version)+'</span></div>'
      +(sb.descricao?'<p>'+esc(sb.descricao)+'</p>':'')
      +'<div class="i2-sb-metrics"><span><b>'+count+'</b> ingredientes</span><span class="'+(formulaBalanced(sb.snapshot)?'ok':'warn')+'"><b>'+fmtNum(total)+'</b> total da fórmula</span><span>Atualizado '+fmtDate(sb.atualizado_em)+'</span></div>'
      +(sb.status==='PROMOVIDO'?'<div class="i2-sb-terminal-note">Promovido para revisão controlada. Este cenário está congelado.</div>':'')
      +(sb.status==='ARQUIVADO'?'<div class="i2-sb-terminal-note">Cenário arquivado e imutável.</div>':'')
      +'<div class="i2-sb-card-actions">'+actions+'</div></article>';
  }
  function renderScenarios(){
    var html=renderCreate();
    html+='<div class="i2-sb-list-head"><div><strong>Cenários deste produto</strong><span>'+state.sandboxes.length+' cenário'+(state.sandboxes.length===1?'':'s')+'</span></div><button type="button" data-sb-action="refresh" class="i2-sb-link">Atualizar</button></div>';
    if(!state.sandboxes.length){
      html+='<div class="i2-sb-empty"><strong>Nenhum cenário experimental</strong><span>O produto continua apenas no fluxo oficial/legado.</span></div>';
    }else{
      html+='<div class="i2-sb-list">'+state.sandboxes.map(sandboxCard).join('')+'</div>';
    }
    return html;
  }

  function findSandbox(id){return state.sandboxes.find(function(x){return x.id===id;})||null;}
  function renderEditor(){
    var sb=findSandbox(state.editId);
    if(!sb){state.editId=null;return renderScenarios();}
    var editable=canMaintain(state.ctx)&&sb.status==='ATIVO';
    var snap=state.editSnapshot||clone(sb.snapshot);
    var arr=ingredients(snap),total=formulaTotal(snap),balanced=formulaBalanced(snap);
    var rows=arr.map(function(x,i){
      var label=ingredientLabel(x),ref=x&&x.ref?String(x.ref):'—',q=Number(x&&x.qtde)||0;
      return '<tr><td><strong>'+esc(label)+'</strong><small>'+esc(ref)+'</small></td><td class="qty">'
        +(editable?'<input type="number" min="0" step="0.001" data-sb-qty="'+i+'" value="'+esc(q)+'">':'<span>'+fmtNum(q)+'</span>')
        +'</td></tr>';
    }).join('');
    return '<div class="i2-sb-editor-head"><button type="button" class="i2-sb-back" data-sb-action="back">← Cenários</button><div><span>Editor experimental</span><strong>'+esc(sb.nome)+'</strong></div></div>'
      +'<div class="i2-sb-callout warn"><strong>Não oficial</strong><span>Alterações aqui não mudam o produto salvo nem uma revisão oficial. Promoção é uma etapa separada.</span></div>'
      +'<div class="i2-sb-editor-meta">'
      +'<label><span>Nome</span><input id="i2SbEditName" value="'+esc(sb.nome)+'" maxlength="100" '+(editable?'':'disabled')+'></label>'
      +'<label><span>Descrição</span><textarea id="i2SbEditDesc" rows="2" maxlength="500" '+(editable?'':'disabled')+'>'+esc(sb.descricao||'')+'</textarea></label>'
      +'</div>'
      +'<div class="i2-sb-total '+(balanced?'ok':'warn')+'" id="i2SbFormulaTotal"><span>Total da fórmula</span><strong>'+fmtNum(total)+'</strong><small>'+(balanced?'Alinhado ao baseline atual de 1000.':'Diferente do baseline atual de 1000 — revisar antes de promover.')+'</small></div>'
      +'<div class="i2-sb-formula"><table><thead><tr><th>Ingrediente</th><th>Quantidade</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'<div class="i2-sb-editor-actions">'
      +(editable?'<button type="button" class="i2-ws-btn primary" data-sb-action="save-edit" data-sb-id="'+esc(sb.id)+'" data-sb-lock="'+esc(sb.lock_version)+'">Salvar cenário</button>':'')
      +'<button type="button" class="i2-ws-btn" data-sb-action="compare" data-sb-id="'+esc(sb.id)+'">Comparar</button>'
      +(editable?'<button type="button" class="i2-ws-btn" data-sb-action="promote" data-sb-id="'+esc(sb.id)+'">Promover para revisão</button>':'')
      +'</div>';
  }

  function sourceOptions(){
    var out=[];
    if(state.currentSnapshot)out.push({id:'current',label:'Produto atual salvo',snapshot:state.currentSnapshot});
    state.revisions.forEach(function(r){
      var code=r.status==='LEGADO'?(r.legacy_revision_text||'Legado sem revisão'):(r.revisao_codigo||'—');
      out.push({id:'revision:'+r.id,label:'Revisão '+code+' · '+r.status,snapshot:r.snapshot});
    });
    state.sandboxes.forEach(function(sb){
      out.push({id:'sandbox:'+sb.id,label:'Sandbox · '+sb.nome+' · '+sb.status,snapshot:sb.snapshot});
    });
    return out;
  }
  function sourceById(id){return sourceOptions().find(function(x){return x.id===id;})||null;}
  function renderCompare(){
    var sources=sourceOptions();
    if(!sources.length)return '<div class="i2-sb-empty"><strong>Sem fontes para comparação</strong></div>';
    if(!state.compareA||!sourceById(state.compareA))state.compareA=state.sandboxes[0]?'sandbox:'+state.sandboxes[0].id:(sources[1]?sources[1].id:sources[0].id);
    if(!state.compareB||!sourceById(state.compareB))state.compareB='current';
    if(state.compareA===state.compareB&&sources.length>1)state.compareB=sources.find(function(x){return x.id!==state.compareA;}).id;
    var a=sourceById(state.compareA),b=sourceById(state.compareB);
    var optsA=sources.map(function(x){return '<option value="'+esc(x.id)+'" '+(x.id===state.compareA?'selected':'')+'>'+esc(x.label)+'</option>';}).join('');
    var optsB=sources.map(function(x){return '<option value="'+esc(x.id)+'" '+(x.id===state.compareB?'selected':'')+'>'+esc(x.label)+'</option>';}).join('');
    var fd=formulaDiff(a&&a.snapshot,b&&b.snapshot),changed=fd.filter(function(x){return x.status!=='same';}),same=fd.length-changed.length;
    var rows=changed.map(function(x){
      return '<tr class="'+x.status+'"><td><strong>'+esc(x.label)+'</strong><small>'+esc(x.status==='added'?'Adicionado':x.status==='removed'?'Removido':'Alterado')+'</small></td>'
        +'<td>'+fmtNum(x.before)+'</td><td>'+fmtNum(x.after)+'</td><td>'+fmtNum(x.delta)+'</td></tr>';
    }).join('');
    var md=scalarDiff(a&&a.snapshot,b&&b.snapshot);
    var meta=md.slice(0,24).map(function(x){
      return '<div class="i2-sb-diff-item"><code>'+esc(x.path)+'</code><span>'+esc(shortValue(x.before))+'</span><b>→</b><span>'+esc(shortValue(x.after))+'</span></div>';
    }).join('');
    return '<div class="i2-sb-compare-head"><div><strong>Comparação de snapshots</strong><span>Somente leitura. Nenhum dado é alterado.</span></div></div>'
      +'<div class="i2-sb-compare-selects"><label><span>Origem A</span><select data-sb-compare="a">'+optsA+'</select></label><label><span>Origem B</span><select data-sb-compare="b">'+optsB+'</select></label></div>'
      +'<div class="i2-sb-compare-summary">'
      +'<div><span>Total A</span><strong>'+fmtNum(formulaTotal(a&&a.snapshot))+'</strong></div>'
      +'<div><span>Total B</span><strong>'+fmtNum(formulaTotal(b&&b.snapshot))+'</strong></div>'
      +'<div><span>Ingredientes alterados</span><strong>'+changed.length+'</strong></div>'
      +'<div><span>Ingredientes iguais</span><strong>'+same+'</strong></div>'
      +'</div>'
      +'<section class="i2-sb-diff-section"><div class="i2-sb-section-head"><div><strong>Diferenças da fórmula</strong><span>Quantidade por ingrediente</span></div></div>'
      +(changed.length?'<div class="i2-sb-diff-table"><table><thead><tr><th>Ingrediente</th><th>A</th><th>B</th><th>Δ</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<div class="i2-sb-empty compact"><strong>Fórmula sem diferença de quantidade</strong></div>')
      +'</section>'
      +'<section class="i2-sb-diff-section"><div class="i2-sb-section-head"><div><strong>Outros campos alterados</strong><span>'+md.length+' caminho'+(md.length===1?'':'s')+' diferente'+(md.length===1?'':'s')+'</span></div></div>'
      +(meta?'<div class="i2-sb-diff-list">'+meta+(md.length>24?'<div class="i2-sb-more">+'+(md.length-24)+' diferenças não exibidas</div>':'')+'</div>':'<div class="i2-sb-empty compact"><strong>Sem outras diferenças</strong></div>')
      +'</section>';
  }

  function renderPromotion(){
    var sb=findSandbox(state.promotionId);
    if(!sb){state.promotionId=null;return renderScenarios();}
    return '<div class="i2-sb-editor-head"><button type="button" class="i2-sb-back" data-sb-action="back">← Cenários</button><div><span>Promoção explícita</span><strong>'+esc(sb.nome)+'</strong></div></div>'
      +'<div class="i2-sb-callout danger"><strong>Esta ação muda o status do cenário para PROMOVIDO</strong><span>Será criada uma nova revisão oficial em RASCUNHO. O cenário ficará congelado e a revisão ainda precisará passar por revisão, aprovação e vigência.</span></div>'
      +'<div class="i2-sb-total '+(formulaBalanced(sb.snapshot)?'ok':'warn')+'"><span>Total da fórmula do cenário</span><strong>'+fmtNum(formulaTotal(sb.snapshot))+'</strong><small>'+(formulaBalanced(sb.snapshot)?'Alinhado ao baseline atual de 1000.':'Diferente do baseline atual de 1000 — a promoção não é bloqueada, mas exige revisão.')+'</small></div>'
      +'<form id="i2SbPromoteForm" class="i2-sb-promote-form" data-sb-id="'+esc(sb.id)+'" data-sb-lock="'+esc(sb.lock_version)+'">'
      +'<label><span>Código da nova revisão</span><input name="revision" maxlength="40" placeholder="Ex.: 003" required></label>'
      +'<label><span>Motivo da promoção</span><textarea name="reason" rows="3" maxlength="500" placeholder="Por que este cenário deve entrar no fluxo controlado?" required></textarea></label>'
      +'<div><button type="button" class="i2-ws-btn" data-sb-action="back">Cancelar</button><button type="submit" class="i2-ws-btn primary">Criar revisão RASCUNHO</button></div>'
      +'</form>';
  }

  async function callRpc(name,args,success){
    if(state.loading)return null;
    state.loading=true;setMessage('Processando…','info');
    try{
      var r=await db().rpc(name,args||{});
      if(r.error)throw r.error;
      state.loading=false;
      await reload(success||'Ação concluída.','ok');
      return r.data;
    }catch(e){
      state.loading=false;
      var conflict=String((e&&e.message)||e).indexOf('SANDBOX_CONFLICT')>-1;
      if(conflict){try{await loadAll();}catch(_){} render();}
      setMessage(errorText(e),'danger');
      return null;
    }
  }

  async function handleSubmit(e){
    if(e.target&&e.target.id==='i2SbCreateForm'){
      e.preventDefault();
      var fd=new FormData(e.target),name=String(fd.get('name')||'').trim(),desc=String(fd.get('description')||'').trim(),base=String(fd.get('base')||'current');
      if(!name){setMessage('Informe o nome do cenário.','warn');return;}
      if(base==='current'&&dirty()){
        setMessage('Há alteração local não salva. Salve o produto ou use uma revisão como base para não perder rastreabilidade.','warn');return;
      }
      var baseId=base.indexOf('revision:')===0?base.slice(9):null;
      await callRpc('criar_sandbox_produto',{
        p_produto_id:state.productId,
        p_nome:name,
        p_descricao:desc||null,
        p_base_revisao_id:baseId
      },'Cenário experimental criado. O produto oficial não foi alterado.');
    }
    if(e.target&&e.target.id==='i2SbPromoteForm'){
      e.preventDefault();
      var fd2=new FormData(e.target),rev=String(fd2.get('revision')||'').trim(),reason=String(fd2.get('reason')||'').trim();
      if(!rev||!reason){setMessage('Informe código da revisão e motivo da promoção.','warn');return;}
      var id=e.target.getAttribute('data-sb-id'),lock=Number(e.target.getAttribute('data-sb-lock'));
      if(!confirm('Criar uma revisão oficial em RASCUNHO a partir deste cenário? O sandbox ficará congelado.'))return;
      state.promotionId=null;
      await callRpc('promover_sandbox_revisao',{
        p_sandbox_id:id,
        p_expected_lock_version:lock,
        p_revisao_codigo:rev,
        p_motivo:reason
      },'Sandbox promovido. Uma nova revisão RASCUNHO foi criada.');
    }
  }

  function handleInput(e){
    var input=e.target.closest('[data-sb-qty]');
    if(!input||!state.editSnapshot)return;
    var idx=Number(input.getAttribute('data-sb-qty')),n=Number(input.value);
    var arr=ingredients(state.editSnapshot);
    if(arr[idx])arr[idx].qtde=isFinite(n)?n:0;
    var total=el('i2SbFormulaTotal');
    if(total){
      var t=formulaTotal(state.editSnapshot),ok=Math.abs(t-1000)<=0.001;
      total.className='i2-sb-total '+(ok?'ok':'warn');
      total.innerHTML='<span>Total da fórmula</span><strong>'+fmtNum(t)+'</strong><small>'+(ok?'Alinhado ao baseline atual de 1000.':'Diferente do baseline atual de 1000 — revisar antes de promover.')+'</small>';
    }
  }
  function handleChange(e){
    var sel=e.target.closest('[data-sb-compare]');
    if(!sel)return;
    if(sel.getAttribute('data-sb-compare')==='a')state.compareA=sel.value;else state.compareB=sel.value;
    render();
  }

  async function handleClick(e){
    var tab=e.target.closest('[data-sb-tab]');
    if(tab){
      state.tab=tab.getAttribute('data-sb-tab');state.editId=null;state.editSnapshot=null;state.promotionId=null;render();return;
    }
    var b=e.target.closest('[data-sb-action]');if(!b)return;
    var action=b.getAttribute('data-sb-action'),id=b.getAttribute('data-sb-id');
    if(action==='refresh'){await reload('Cenários atualizados.','info');return;}
    if(action==='back'){state.editId=null;state.editSnapshot=null;state.promotionId=null;render();return;}
    if(action==='edit'){
      var sb=findSandbox(id);if(!sb)return;
      state.editId=id;state.editSnapshot=clone(sb.snapshot);state.promotionId=null;render();return;
    }
    if(action==='compare'){
      state.compareA='sandbox:'+id;state.compareB='current';state.tab='compare';state.editId=null;state.editSnapshot=null;state.promotionId=null;render();return;
    }
    if(action==='promote'){
      if(!canMaintain(state.ctx)){setMessage('A promoção exige P&D ou Admin.','danger');return;}
      state.promotionId=id;state.editId=null;state.editSnapshot=null;render();return;
    }
    if(action==='archive'){
      var lock=Number(b.getAttribute('data-sb-lock'));
      if(!confirm('Arquivar este cenário? Ele ficará imutável e não poderá ser reaberto.'))return;
      await callRpc('arquivar_sandbox_produto',{p_sandbox_id:id,p_expected_lock_version:lock},'Cenário arquivado e congelado.');
      return;
    }
    if(action==='save-edit'){
      var sb2=findSandbox(id);if(!sb2||!state.editSnapshot)return;
      var lock2=Number(b.getAttribute('data-sb-lock'));
      var name=String((el('i2SbEditName')||{}).value||'').trim();
      var desc=String((el('i2SbEditDesc')||{}).value||'').trim();
      var arr=ingredients(state.editSnapshot),invalid=arr.some(function(x){var q=Number(x&&x.qtde);return !isFinite(q)||q<0;});
      if(invalid){setMessage('Há quantidade inválida. Use somente valores numéricos maiores ou iguais a zero.','warn');return;}
      var savedId=id;
      var result=await callRpc('atualizar_sandbox_produto',{
        p_sandbox_id:id,
        p_expected_lock_version:lock2,
        p_snapshot:state.editSnapshot,
        p_nome:name||null,
        p_descricao:desc||''
      },'Cenário salvo. Nenhum dado oficial foi alterado.');
      if(result!==null){
        state.editId=savedId;
        var updated=findSandbox(savedId);
        state.editSnapshot=updated?clone(updated.snapshot):null;
        render();
        setMessage('Cenário salvo. Nenhum dado oficial foi alterado.','ok');
      }
    }
  }

  function boot(){
    if(!ensureUi()){
      var tries=0,t=setInterval(function(){tries++;if(ensureUi()||tries>30)clearInterval(t);},250);
    }
    var attempts=0,access=setInterval(function(){
      attempts++;
      refreshAccess().finally(function(){
        var b=el('i2wsSandbox');
        if((b&&!b.hidden)||attempts>30)clearInterval(access);
      });
    },350);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&state.open)closePanel();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
