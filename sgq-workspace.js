(function(){
  var defs={
    central:{title:'Central de Gestão',action:'',label:''},
    dashboard:{title:'Dashboard',action:'',label:''},
    documentos:{title:'Documentos e controle de versão',action:'openDocModal',label:'Novo documento'},
    indicadores:{title:'Indicadores',action:'openIndModal',label:'Lançar indicador'},
    fornecedores:{title:'Qualidade de fornecedores',action:'openFornModal',label:'Novo fornecedor'},
    analises:{title:'Análises e obrigações',action:'openAnalModal',label:'Registrar análise'},
    ncs:{title:'Não Conformidades',action:'openNCModal',label:'Nova NC'},
    sac:{title:'SAC e reclamações',action:'openSACModal',label:'Nova reclamação'},
    licencas:{title:'Licenças e alvarás',action:'openLicModal',label:'Nova licença'},
    treinamentos:{title:'Treinamentos',action:'openTreinModal',label:'Novo treinamento'},
    planoacao:{title:'Planos de ação / CAPA',action:'openPAModal',label:'Nova ação'}
  };

  function current(){
    var s=document.querySelector('.section.active');
    return s && defs[s.id] ? s.id : 'central';
  }
  function state(){try{return db||{};}catch(e){return {};}}
  function arr(k){var x=state()[k];return Array.isArray(x)?x:[];}
  function days(v){try{return typeof daysUntil==='function'?daysUntil(v):999;}catch(e){return 999;}}
  function isClosed(v,closed){
    var s=String(v||'').toLowerCase();
    return closed.some(function(x){return s===x;});
  }

  function stats(id){
    var all=[], attention=[], overdue=[], note='';
    if(id==='documentos'){
      all=arr('docs');
      attention=all.filter(function(x){return x.status!=='Obsoleto'&&days(x.proxRev)<=30;});
      overdue=all.filter(function(x){return x.status!=='Obsoleto'&&days(x.proxRev)<0;});
      note='Atenção = revisão em até 30 dias; vencido = próxima revisão no passado.';
    }else if(id==='ncs'){
      all=arr('ncs');
      attention=all.filter(function(x){return !isClosed(x.status,['fechada']);});
      overdue=attention.filter(function(x){return x.prazo&&days(x.prazo)<0;});
      note='Em atenção = NC não fechada; atrasada = prazo de tratativa vencido.';
    }else if(id==='sac'){
      all=arr('sac');
      attention=all.filter(function(x){return !isClosed(x.status,['encerrada']);});
      overdue=attention.filter(function(x){return x.prazo&&days(x.prazo)<0;});
      note='Em atenção = SAC não encerrado; atrasado = prazo combinado vencido.';
    }else if(id==='licencas'){
      all=arr('licencas');
      attention=all.filter(function(x){return days(x.venc)<=60;});
      overdue=all.filter(function(x){return days(x.venc)<0;});
      note='Atenção = vencimento em até 60 dias; vencido = data de vencimento no passado.';
    }else if(id==='treinamentos'){
      all=arr('treinamentos');
      attention=all.filter(function(x){return String(x.status||'').toLowerCase()==='agendado';});
      overdue=attention.filter(function(x){return x.data&&days(x.data)<0;});
      note='Em atenção = treinamento agendado; atrasado = data agendada já passou.';
    }else if(id==='planoacao'){
      all=arr('planoacao');
      attention=all.filter(function(x){return !isClosed(x.status,['concluída','concluida']);});
      overdue=attention.filter(function(x){return x.prazo&&days(x.prazo)<0;});
      note='Em atenção = ação não concluída; atrasada = prazo vencido.';
    }else if(id==='fornecedores'){
      all=arr('fornecedores');
      attention=all.filter(function(x){return String(x.status||'').toLowerCase()!=='homologado';});
      overdue=all.filter(function(x){return x.venc&&days(x.venc)<0;});
      note='Em atenção = fornecedor fora do status Homologado. Vencido usa data cadastral quando disponível.';
    }else if(id==='analises'){
      all=arr('analises');
      attention=all.filter(function(x){var s=String(x.status||'').toLowerCase();return s==='pendente'||s==='em andamento';});
      overdue=[];
      note='Em atenção = análise pendente ou em andamento. Sem regra adicional de atraso nesta faixa.';
    }else if(id==='indicadores'){
      all=arr('indicadores');
      attention=[];overdue=[];
      note='Indicadores são exibidos conforme os lançamentos existentes; ausência de dado não é zero.';
    }else{
      return null;
    }
    return {total:all.length,attention:attention.length,overdue:overdue.length,note:note};
  }

  function renderStats(id){
    var box=document.getElementById('i2qStats'),st=stats(id);
    if(!box)return;
    if(!st){box.hidden=true;box.innerHTML='';return;}
    box.hidden=false;
    box.innerHTML='<button type="button" class="i2-qms-stat neutral"><span>Total no módulo</span><strong>'+st.total+'</strong></button>'
      +'<button type="button" class="i2-qms-stat '+(st.attention?'warn':'ok')+'"><span>Em atenção</span><strong>'+st.attention+'</strong></button>'
      +'<button type="button" class="i2-qms-stat '+(st.overdue?'danger':'ok')+'"><span>Atrasados / vencidos</span><strong>'+st.overdue+'</strong></button>'
      +'<div class="i2-qms-rule"><b>Regra da leitura</b><span>'+st.note+'</span></div>';
  }

  function update(){
    var id=current(),d=defs[id],t=document.getElementById('i2qTitle'),btn=document.getElementById('i2qAction');
    if(t)t.textContent=d.title;
    var conn=document.getElementById('connTxt'),dot=document.getElementById('i2qConnDot'),ct=document.getElementById('i2qConn');
    var cv=conn?String(conn.textContent||'').trim():'';
    if(ct)ct.textContent=cv||'conexão não informada';
    if(dot)dot.className='dot '+(/online|conect|ok/i.test(cv)?'ok':'');
    var usr=document.getElementById('userBadge'),u=document.getElementById('i2qUser');
    if(u)u.textContent=(usr&&String(usr.textContent||'').trim())||'usuário autenticado';
    if(btn){btn.hidden=!d.action;btn.textContent=d.label||'Nova ação';btn.dataset.fn=d.action||'';}
    var back=document.getElementById('i2qBack');
    if(back)back.hidden=(id==='central');
    renderStats(id);
  }

  function create(){
    if(document.getElementById('i2QmsContext')||!document.querySelector('.nav'))return;
    var x=document.createElement('div');x.className='i2-qms-context';x.id='i2QmsContext';
    x.innerHTML='<div class="i2-qms-context-inner"><div class="i2-qms-module">'
      +'<div class="i2-qms-kicker">Qualidade em ciclo fechado</div><div class="i2-qms-title" id="i2qTitle">Central de Gestão</div></div>'
      +'<div class="i2-qms-meta"><span class="i2-qms-chip"><span class="dot" id="i2qConnDot"></span><b>Banco</b> <span id="i2qConn">—</span></span>'
      +'<span class="i2-qms-chip"><b>Fonte</b> SGQ / app_state</span>'
      +'<span class="i2-qms-chip"><b>Decisão</b> validação humana</span>'
      +'<span class="i2-qms-chip"><b>Usuário</b> <span id="i2qUser">—</span></span></div>'
      +'<button class="i2-qms-action secondary" id="i2qBack" hidden>Central de Gestão</button>'
      +'<button class="i2-qms-action" id="i2qAction" hidden></button></div>'
      +'<div class="i2-qms-stats" id="i2qStats" hidden></div>';
    document.querySelector('.nav').insertAdjacentElement('afterend',x);

    document.getElementById('i2qAction').addEventListener('click',function(){
      var fn=this.dataset.fn;if(!fn)return;
      try{if(typeof window[fn]==='function')window[fn](null);}catch(e){console.error(e);}
    });
    document.getElementById('i2qBack').addEventListener('click',function(){
      try{if(typeof showSection==='function')showSection('central');}catch(e){console.error(e);}
    });

    document.querySelectorAll('.nav button').forEach(function(b){b.addEventListener('click',function(){setTimeout(update,0);});});
    var main=document.querySelector('.main');
    if(window.MutationObserver&&main)new MutationObserver(update).observe(main,{subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('input',function(){setTimeout(update,0);},true);
    document.addEventListener('change',function(){setTimeout(update,0);},true);
    update();setInterval(update,2500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create);else create();
})();