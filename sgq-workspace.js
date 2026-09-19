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
  function update(){
    var id=current(),d=defs[id],t=document.getElementById('i2qTitle'),btn=document.getElementById('i2qAction');
    if(t)t.textContent=d.title;
    var conn=document.getElementById('connTxt'),dot=document.getElementById('i2qConnDot'),ct=document.getElementById('i2qConn');
    var cv=conn?String(conn.textContent||'').trim():'';
    if(ct)ct.textContent=cv||'conexão não informada';
    if(dot)dot.className='dot '+(/online|conect|ok/i.test(cv)?'ok':'');
    var usr=document.getElementById('userBadge'),u=document.getElementById('i2qUser');
    if(u)u.textContent=(usr&&String(usr.textContent||'').trim())||'usuário autenticado';
    if(btn){
      btn.hidden=!d.action;btn.textContent=d.label||'Nova ação';btn.dataset.fn=d.action||'';
    }
  }
  function create(){
    if(document.getElementById('i2QmsContext')||!document.querySelector('.nav'))return;
    var x=document.createElement('div');x.className='i2-qms-context';x.id='i2QmsContext';
    x.innerHTML='<div class="i2-qms-context-inner"><div class="i2-qms-module">'
      +'<div class="i2-qms-kicker">Qualidade em ciclo fechado</div><div class="i2-qms-title" id="i2qTitle">Central de Gestão</div></div>'
      +'<div class="i2-qms-meta"><span class="i2-qms-chip"><span class="dot" id="i2qConnDot"></span><b>Banco</b> <span id="i2qConn">—</span></span>'
      +'<span class="i2-qms-chip"><b>Fonte</b> SGQ / Supabase</span>'
      +'<span class="i2-qms-chip"><b>Decisão</b> validação humana</span>'
      +'<span class="i2-qms-chip"><b>Usuário</b> <span id="i2qUser">—</span></span></div>'
      +'<button class="i2-qms-action" id="i2qAction" hidden></button></div>';
    document.querySelector('.nav').insertAdjacentElement('afterend',x);
    document.getElementById('i2qAction').addEventListener('click',function(){
      var fn=this.dataset.fn;if(!fn)return;
      try{if(typeof window[fn]==='function')window[fn](null);}catch(e){console.error(e);}
    });
    document.querySelectorAll('.nav button').forEach(function(b){b.addEventListener('click',function(){setTimeout(update,0);});});
    var main=document.querySelector('.main');
    if(window.MutationObserver&&main)new MutationObserver(update).observe(main,{subtree:true,attributes:true,attributeFilter:['class']});
    update();setInterval(update,2500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',create);else create();
})();