(function(){
  function el(id){return document.getElementById(id);}
  function val(id){var e=el(id);return e?String(e.value||'').trim():'';}
  function num(v){var n=Number(v);return isFinite(n)?n:0;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function formula(){
    try{return Array.isArray(receita)?receita:[];}catch(e){return [];}
  }
  function origem(){
    try{return _prodOrigem||null;}catch(e){return null;}
  }
  function dirty(){
    try{return origem()?!!_receitaFoiAlterada():true;}catch(e){return true;}
  }
  function ptn(){
    try{var n=_calcPtnAtual();return (n==null||!isFinite(n))?null:Number(n);}catch(e){return null;}
  }
  function total(){
    return formula().reduce(function(s,r){return s+num(r&&r.qtde);},0);
  }
  function compliance(){
    var w=el('conformidadeWarning');
    if(w && getComputedStyle(w).display!=='none' && String(w.textContent||'').trim()){
      return {kind:'danger',title:'Atenção regulatória',detail:String(w.textContent||'').trim().replace(/\s+/g,' ').slice(0,145)};
    }
    var f=formula();
    if(!f.length) return {kind:'warn',title:'Formulação ainda vazia',detail:'Adicione ingredientes para avaliar composição e conformidade.'};
    var t=total();
    if(!t) return {kind:'warn',title:'Quantidade da fórmula não disponível',detail:'O sistema ainda não possui base suficiente para calcular o total.'};
    return {kind:'ok',title:'Sem bloqueio visível nesta tela',detail:'Estado informativo: a aprovação técnica continua sendo responsabilidade da Qualidade / RT.'};
  }
  function syncState(){
    var o=origem(), isDirty=dirty(), name=val('p_nome')||(o&&o.nome)||'Novo produto';
    var code=val('p_codigo')||(o&&o.codigo)||'sem código';
    var rev=val('p_revisao')||(o&&o.revisao)||'00';
    var f=formula(), t=total(), protein=ptn(), c=compliance();
    var n=el('i2wsName'),r=el('i2wsRev'),m=el('i2wsMeta'),state=el('i2wsState');
    if(n)n.textContent=name;
    if(r)r.textContent='REV '+rev;
    if(m)m.innerHTML='<span>Código: <b>'+esc(code)+'</b></span><span>Fonte: <b>GMF / Supabase</b></span><span id="i2wsState" class="'+(isDirty?'i2-ws-dirty':'i2-ws-clean')+'">'+(isDirty?'● alteração não salva':'● sincronizado com a revisão carregada')+'</span>';
    var a=el('i2wsIng'),b=el('i2wsTotal'),p=el('i2wsPtn'),s=el('i2wsSource');
    if(a){a.textContent=String(f.length);a.nextElementSibling.textContent=f.length===1?'ingrediente':'ingredientes';}
    if(b){b.textContent=t?((Math.round(t*100)/100).toLocaleString('pt-BR')+' g'):'—';b.nextElementSibling.textContent=t?'soma da composição':'sem base';}
    if(p){p.textContent=protein==null?'—':protein.toFixed(2)+' g';p.nextElementSibling.textContent=protein==null?'sem cálculo disponível':'proteína / 100 g';}
    if(s){s.textContent=val('p_registro')||'—';s.nextElementSibling.textContent=val('p_registro')?'registro informado':'registro não informado';}
    var sig=el('i2wsSignal'),ct=el('i2wsHealthTitle'),cd=el('i2wsHealthDetail');
    if(sig)sig.className='i2-ws-signal '+c.kind;
    if(ct)ct.textContent=c.title;
    if(cd)cd.textContent=c.detail;
  }
  function go(n){try{if(typeof goStep==='function')goStep(n);}catch(e){}}
  function create(){
    if(el('i2Workspace')||!el('wizardNav'))return;
    var wrap=document.createElement('section');wrap.className='i2-workspace';wrap.id='i2Workspace';
    wrap.setAttribute('aria-label','Contexto do produto');
    wrap.innerHTML='<div class="i2-ws-shell">'
      +'<div class="i2-ws-head"><div class="i2-ws-id"><div class="i2-ws-kicker">Workspace do produto</div>'
      +'<div class="i2-ws-title"><strong id="i2wsName">Novo produto</strong><span class="i2-ws-rev" id="i2wsRev">REV 00</span></div>'
      +'<div class="i2-ws-meta" id="i2wsMeta"></div></div>'
      +'<div class="i2-ws-actions"><button class="i2-ws-btn" type="button" data-i2-step="0">Portfólio</button>'
      +'<button class="i2-ws-btn" type="button" data-i2-step="2">Formulação</button>'
      +'<button class="i2-ws-btn" type="button" data-i2-step="4">Ficha técnica</button>'
      +'<button class="i2-ws-btn primary" type="button" id="i2wsSave">Salvar produto</button></div></div>'
      +'<div class="i2-ws-body"><div class="i2-ws-metrics">'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Composição</div><div class="i2-ws-value" id="i2wsIng">0</div><div class="i2-ws-sub">ingredientes</div></div>'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Total da fórmula</div><div class="i2-ws-value" id="i2wsTotal">—</div><div class="i2-ws-sub">sem base</div></div>'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Proteína</div><div class="i2-ws-value" id="i2wsPtn">—</div><div class="i2-ws-sub">proteína / 100 g</div></div>'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Registro</div><div class="i2-ws-value" id="i2wsSource">—</div><div class="i2-ws-sub">registro não informado</div></div>'
      +'</div><div class="i2-ws-health"><span class="i2-ws-signal" id="i2wsSignal"></span><div><strong id="i2wsHealthTitle">Verificando contexto</strong><span id="i2wsHealthDetail">O sistema está lendo apenas os dados já existentes na tela.</span></div></div></div>'
      +'</div>';
    var ctx=document.querySelector('.i2-context');
    (ctx||el('wizardNav')).insertAdjacentElement('afterend',wrap);
    wrap.querySelectorAll('[data-i2-step]').forEach(function(b){b.addEventListener('click',function(){go(Number(b.getAttribute('data-i2-step')));});});
    var save=el('i2wsSave');if(save)save.addEventListener('click',function(){try{if(typeof salvarProdutoAtual==='function')salvarProdutoAtual();}catch(e){console.error(e);}});
    document.addEventListener('input',syncState,true);
    document.addEventListener('change',syncState,true);
    var targets=['recTabela','conformidadeWarning','prodLista'].map(el).filter(Boolean);
    if(window.MutationObserver) targets.forEach(function(t){new MutationObserver(syncState).observe(t,{childList:true,subtree:true,attributes:true});});
    syncState();setInterval(syncState,2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create);else create();
})();