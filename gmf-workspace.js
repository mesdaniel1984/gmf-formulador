(function(){
  function el(id){return document.getElementById(id);}
  function val(id){var e=el(id);return e?String(e.value||'').trim():'';}
  function num(v){var n=Number(v);return isFinite(n)?n:0;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function formula(){try{return Array.isArray(receita)?receita:[];}catch(e){return [];}}
  function origem(){try{return _prodOrigem||null;}catch(e){return null;}}
  function tipo(){try{return tipoSel||'';}catch(e){return '';}}
  function dirty(){try{return origem()?!!_receitaFoiAlterada():true;}catch(e){return true;}}
  function ptn(){try{var n=_calcPtnAtual();return (n==null||!isFinite(n))?null:Number(n);}catch(e){return null;}}
  function total(){return formula().reduce(function(s,r){return s+num(r&&r.qtde);},0);}

  function setButtonLabel(id,label){
    var b=el(id);if(!b)return;
    var span=b.querySelector('.step-num');
    Array.prototype.slice.call(b.childNodes).forEach(function(n){if(n!==span)b.removeChild(n);});
    b.appendChild(document.createTextNode(' '+label));
    b.setAttribute('aria-label',label);
  }


  function enhancePortfolio(){
    var step=el('step0');if(!step||el('i2PortfolioTools'))return;
    var card=step.querySelector('.card');if(!card)return;
    var title=card.querySelector('.card-title');if(!title)return;
    var actions=title.children[1];if(!actions)return;

    var tools=document.createElement('details');tools.id='i2PortfolioTools';tools.className='i2-portfolio-tools';
    tools.innerHTML='<summary>Ferramentas <span>▾</span></summary><div class="i2-portfolio-menu"></div>';
    var menu=tools.querySelector('.i2-portfolio-menu');

    var selectors=['exportarJSON()','abrirRevisaoMassa()','migrarProdutosMassa()'];
    Array.prototype.slice.call(actions.querySelectorAll('button')).forEach(function(b){
      var oc=String(b.getAttribute('onclick')||'');
      var isImport=oc.indexOf("importJsonInput")>-1;
      var move=isImport||selectors.some(function(x){return oc.indexOf(x)>-1;});
      if(move){
        b.classList.add('i2-admin-tool');
        if(oc.indexOf('migrarProdutosMassa')>-1){
          b.classList.add('danger');
          b.setAttribute('title','Ação em massa. Revise antes de executar.');
        }
        menu.appendChild(b);
      }
    });
    actions.insertBefore(tools,actions.firstChild);

    var note=document.createElement('div');note.className='i2-portfolio-note';note.id='i2PortfolioNote';
    note.innerHTML='<span class="i2-portfolio-dot"></span><div><strong>Portfólio técnico</strong><span>Novo produto fica como ação principal. Importação, revisão e correções em massa ficam separadas para reduzir clique acidental.</span></div>';
    card.insertBefore(note,title.nextSibling);
  }

  function renameNavigation(){
    setButtonLabel('s0btn','Portfólio');
    setButtonLabel('s1btn','Produto & revisão');
    setButtonLabel('s2btn','Fórmula');
    setButtonLabel('s3btn','Nutrição & compliance');
    setButtonLabel('s4btn','Ficha técnica');
    setButtonLabel('s5btn','Laudo técnico');
    setButtonLabel('s7btn','Histórico de laudos');
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

  function keyFields(){
    return [
      {id:'ident',label:'Identificação',ok:!!(val('p_nome')&&val('p_codigo')),step:1,detail:'nome + código'},
      {id:'class',label:'Classificação',ok:!!tipo(),step:1,detail:'tipo técnico'},
      {id:'formula',label:'Formulação',ok:formula().length>0&&total()>0,step:2,detail:'ingredientes + quantidade'},
      {id:'rotulo',label:'Rotulagem',ok:!!(val('p_alergenicos')&&val('p_glutenlactose')),step:1,detail:'alergênicos + glúten/lactose'},
      {id:'resp',label:'Responsáveis',ok:!!(val('p_elaborado')&&val('p_revisado')&&val('p_aprovado')),step:1,detail:'elabora + revisa + aprovador informado'}
    ];
  }

  function nextAction(fields){
    var miss=fields.find(function(x){return !x.ok;});
    if(!miss) return {step:3,label:'Revisar nutrição & compliance',detail:'Os campos-chave estão preenchidos. Revise os cálculos e alertas antes de emitir documentos.'};
    var labels={
      ident:'Completar identificação do produto',
      class:'Confirmar classificação técnica',
      formula:'Montar a fórmula',
      rotulo:'Revisar declarações de rotulagem',
      resp:'Informar responsáveis técnicos'
    };
    return {step:miss.step,label:labels[miss.id]||'Completar dados',detail:'Falta: '+miss.detail+'. Esta indicação é de preenchimento, não de aprovação regulatória.'};
  }

  function currentStage(){
    var a=document.querySelector('.panel.active');
    if(a&&/^step\d+$/.test(a.id))return Number(a.id.replace('step',''));
    return null;
  }

  function syncMode(){
    var st=currentStage(),wrap=el('i2Workspace'),ctx=document.querySelector('.i2-context');
    if(wrap)wrap.classList.toggle('i2-catalog-mode',st===6);
    if(ctx)ctx.classList.toggle('i2-catalog-mode',st===6);
  }

  function syncLifecycle(){
    var st=currentStage();
    document.querySelectorAll('[data-i2-life]').forEach(function(b){
      var n=Number(b.getAttribute('data-i2-life'));
      b.classList.toggle('active',n===st);
    });
  }

  function syncState(){
    var o=origem(), isDirty=dirty(), name=val('p_nome')||(o&&o.nome)||'Novo produto';
    var code=val('p_codigo')||(o&&o.codigo)||'sem código';
    var rev=val('p_revisao')||(o&&o.revisao)||'00';
    var f=formula(), t=total(), protein=ptn(), c=compliance(), fields=keyFields();
    var done=fields.filter(function(x){return x.ok;}).length;
    var pct=Math.round((done/fields.length)*100);
    var next=nextAction(fields);

    var n=el('i2wsName'),r=el('i2wsRev'),m=el('i2wsMeta');
    if(n)n.textContent=name;
    if(r)r.textContent='REV '+rev;
    if(m)m.innerHTML='<span>Código: <b>'+esc(code)+'</b></span>'
      +'<span>Fonte: <b>GMF / Supabase</b></span>'
      +'<span>Modo: <b>'+(o?'consulta protegida':'novo produto')+'</b></span>'
      +'<span id="i2wsState" class="'+(isDirty?'i2-ws-dirty':'i2-ws-clean')+'">'+(isDirty?'● alteração não salva':'● sincronizado com a revisão carregada')+'</span>';

    var a=el('i2wsIng'),b=el('i2wsTotal'),p=el('i2wsPtn'),s=el('i2wsSource');
    if(a){a.textContent=String(f.length);a.nextElementSibling.textContent=f.length===1?'ingrediente':'ingredientes';}
    if(b){b.textContent=t?((Math.round(t*100)/100).toLocaleString('pt-BR')+' g'):'—';b.nextElementSibling.textContent=t?'soma da composição':'sem base';}
    if(p){p.textContent=protein==null?'—':protein.toFixed(2)+' g';p.nextElementSibling.textContent=protein==null?'sem cálculo disponível':'proteína / 100 g';}
    if(s){s.textContent=val('p_aprovado')?'Informado':'—';s.nextElementSibling.textContent=val('p_aprovado')?'aprovador preenchido; não é status de aprovação':'aprovador não informado';}

    var sig=el('i2wsSignal'),ct=el('i2wsHealthTitle'),cd=el('i2wsHealthDetail');
    if(sig)sig.className='i2-ws-signal '+c.kind;
    if(ct)ct.textContent=c.title;
    if(cd)cd.textContent=c.detail;

    var score=el('i2wsScore'),bar=el('i2wsScoreBar'),scoreSub=el('i2wsScoreSub');
    if(score)score.textContent=done+'/'+fields.length;
    if(bar)bar.style.width=pct+'%';
    if(scoreSub)scoreSub.textContent=pct+'% dos campos-chave preenchidos';

    var checklist=el('i2wsChecklist');
    if(checklist)checklist.innerHTML=fields.map(function(x){
      return '<button type="button" class="i2-check '+(x.ok?'ok':'miss')+'" data-i2-step="'+x.step+'">'
        +'<span class="i2-check-dot">'+(x.ok?'✓':'•')+'</span><span>'+esc(x.label)+'</span></button>';
    }).join('');

    var nextTitle=el('i2wsNextTitle'),nextDetail=el('i2wsNextDetail'),nextBtn=el('i2wsNextBtn');
    if(nextTitle)nextTitle.textContent=next.label;
    if(nextDetail)nextDetail.textContent=next.detail;
    if(nextBtn)nextBtn.setAttribute('data-i2-step',String(next.step));

    syncLifecycle();
    syncMode();
  }

  function go(n){try{if(typeof goStep==='function')goStep(n);}catch(e){}}
  function openHistory(){try{if(typeof abrirListaLaudos==='function')abrirListaLaudos();}catch(e){}}

  function create(){
    if(el('i2Workspace')||!el('wizardNav'))return;
    renameNavigation();
    enhancePortfolio();
    var nativeNav=el('wizardNav');if(nativeNav)nativeNav.classList.add('i2-native-wizard');

    var wrap=document.createElement('section');wrap.className='i2-workspace';wrap.id='i2Workspace';
    wrap.setAttribute('aria-label','Contexto do produto');
    wrap.innerHTML='<div class="i2-life" aria-label="Ciclo de vida do produto">'
      +'<button type="button" data-i2-life="0" data-i2-step="0"><b>01</b><span>Portfólio</span></button>'
      +'<button type="button" data-i2-life="1" data-i2-step="1"><b>02</b><span>Produto & revisão</span></button>'
      +'<button type="button" data-i2-life="2" data-i2-step="2"><b>03</b><span>Fórmula</span></button>'
      +'<button type="button" data-i2-life="3" data-i2-step="3"><b>04</b><span>Compliance</span></button>'
      +'<button type="button" data-i2-life="4" data-i2-step="4"><b>05</b><span>Ficha técnica</span></button>'
      +'<button type="button" data-i2-life="5" data-i2-step="5"><b>06</b><span>Laudo</span></button>'
      +'<button type="button" id="i2wsHistory"><b>07</b><span>Histórico</span></button></div>'
      +'<div class="i2-ws-shell">'
      +'<div class="i2-ws-head"><div class="i2-ws-id"><div class="i2-ws-kicker">Workspace do produto</div>'
      +'<div class="i2-ws-title"><strong id="i2wsName">Novo produto</strong><span class="i2-ws-rev" id="i2wsRev">REV 00</span></div>'
      +'<div class="i2-ws-meta" id="i2wsMeta"></div></div>'
      +'<div class="i2-ws-actions"><button class="i2-ws-btn" type="button" data-i2-step="0">Portfólio</button>'
      +'<button class="i2-ws-btn" type="button" data-i2-step="2">Fórmula</button>'
      +'<button class="i2-ws-btn" type="button" data-i2-step="4">Ficha técnica</button>'
      +'<button class="i2-ws-btn primary" type="button" id="i2wsSave">Salvar produto</button></div></div>'
      +'<div class="i2-ws-body"><div class="i2-ws-metrics">'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Composição</div><div class="i2-ws-value" id="i2wsIng">0</div><div class="i2-ws-sub">ingredientes</div></div>'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Total da fórmula</div><div class="i2-ws-value" id="i2wsTotal">—</div><div class="i2-ws-sub">sem base</div></div>'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Proteína</div><div class="i2-ws-value" id="i2wsPtn">—</div><div class="i2-ws-sub">proteína / 100 g</div></div>'
      +'<div class="i2-ws-metric"><div class="i2-ws-label">Aprovação documental</div><div class="i2-ws-value" id="i2wsSource">—</div><div class="i2-ws-sub">aprovador não informado</div></div>'
      +'</div><div class="i2-ws-health"><span class="i2-ws-signal" id="i2wsSignal"></span><div><strong id="i2wsHealthTitle">Verificando contexto</strong><span id="i2wsHealthDetail">O sistema está lendo apenas os dados já existentes na tela.</span></div></div></div>'
      +'<div class="i2-ws-progress"><div class="i2-ws-progress-head"><div><span>Completude dos campos-chave</span><strong id="i2wsScore">0/5</strong></div><small id="i2wsScoreSub">0% dos campos-chave preenchidos</small></div>'
      +'<div class="i2-progress-track"><span id="i2wsScoreBar"></span></div><div class="i2-checklist" id="i2wsChecklist"></div></div>'
      +'<div class="i2-next"><div><span>Próxima ação sugerida</span><strong id="i2wsNextTitle">Completar identificação do produto</strong><small id="i2wsNextDetail">Indicação baseada apenas nos campos desta tela.</small></div>'
      +'<button type="button" class="i2-ws-btn primary" id="i2wsNextBtn" data-i2-step="1">Ir para ação →</button></div>'
      +'</div>';

    var ctx=document.querySelector('.i2-context');
    (ctx||el('wizardNav')).insertAdjacentElement('afterend',wrap);

    wrap.addEventListener('click',function(ev){
      var b=ev.target.closest('[data-i2-step]');
      if(!b)return;
      var n=Number(b.getAttribute('data-i2-step'));
      if(isFinite(n))go(n);
    });
    var h=el('i2wsHistory');if(h)h.addEventListener('click',openHistory);
    var save=el('i2wsSave');if(save)save.addEventListener('click',function(){try{if(typeof salvarProdutoAtual==='function')salvarProdutoAtual();}catch(e){console.error(e);}});

    document.addEventListener('input',syncState,true);
    document.addEventListener('change',syncState,true);
    var targets=['recTabela','conformidadeWarning','prodLista','wizardNav','step6'].map(el).filter(Boolean);
    if(window.MutationObserver) targets.forEach(function(t){new MutationObserver(syncState).observe(t,{childList:true,subtree:true,attributes:true});});
    syncState();setInterval(syncState,2000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create);else create();
})();