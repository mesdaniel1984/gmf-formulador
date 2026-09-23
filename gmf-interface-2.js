(function(){
  function txt(s){ return String(s||'').replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); }
  function appKey(){
    var p=location.pathname.toLowerCase();
    if(p.indexOf('sistema_qualidade')>-1) return 'sgq';
    if(p.indexOf('gmf_formulador')>-1||p.indexOf('gmf_lab')>-1) return 'gmf';
    return 'central';
  }
  function appName(){
    var p=location.pathname.toLowerCase();
    if(p.indexOf('sistema_qualidade')>-1) return 'SGQ — Gestão da Qualidade';
    if(p.indexOf('gmf_formulador')>-1||p.indexOf('gmf_lab')>-1) return 'GMF Formulador';
    return 'Sistema interno';
  }
  function addCorpBar(){
    if(document.querySelector('.i2-corpbar')) return;
    var bar=document.createElement('div');
    bar.className='i2-corpbar';
    var k=appKey();
    bar.innerHTML='<a class="i2-home" href="index.html">← Voltar à Central</a>'
      +'<span class="i2-sep"></span><span class="i2-app">'+txt(appName())+'</span>'
      +'<nav class="i2-switch" aria-label="Trocar sistema">'
      +'<a href="gmf_formulador_wizard.html" class="'+(k==='gmf'?'active':'')+'">GMF</a>'
      +'<a href="sistema_qualidade_online.html" class="'+(k==='sgq'?'active':'')+'">SGQ</a>'
      +'<a href="https://qualidade-alimentos-production.up.railway.app/sso/start">CQ ↗</a>'
      +'<a href="conversas.html" title="SAC / WhatsApp — atendimento humano" aria-label="SAC / WhatsApp — atendimento humano">SAC</a>'
      +'</nav><span class="i2-right"><span class="i2-state">Interface 2.0</span>'
      +'<button type="button" class="i2-logout" id="i2Logout">Sair</button></span>';
    document.body.insertBefore(bar,document.body.firstChild);
    var out=document.getElementById('i2Logout');
    if(out)out.addEventListener('click',function(){
      try{
        if(k==='gmf'&&typeof window._logout==='function')return window._logout();
        if(k==='gmf'&&typeof window.fazerLogout==='function')return window.fazerLogout();
        if(k==='sgq'&&typeof window.doLogout==='function')return window.doLogout();
      }catch(e){console.error(e);}
    });
  }
  function addContext(){
    if(document.querySelector('.i2-context')) return;
    if(appName().indexOf('GMF Formulador')!==0) return;
    var header=document.querySelector('.wizard-steps');
    if(!header) return;
    var d=document.createElement('div');
    d.className='i2-context';
    d.innerHTML='<span class="i2-context-chip"><strong>Fonte</strong> GMF / Supabase</span>'
      +'<span class="i2-context-chip"><strong>Escopo</strong> fórmula · especificação · laudo</span>'
      +'<span class="i2-context-chip"><strong>Princípio</strong> dado ausente ≠ zero</span>';
    header.insertAdjacentElement('afterend',d);
  }
  function cleanupLegacyChrome(){
    document.querySelectorAll('a[href="index.html"]').forEach(function(a){
      if(a.classList.contains('i2-home')||a.classList.contains('i2-auth-central'))return;
      var tx=String(a.textContent||'').toLowerCase();
      var pos=String(a.style&&a.style.position||'').toLowerCase();
      if(tx.indexOf('central de sistemas')>-1 && pos==='fixed')a.style.display='none';
    });
    var h=document.querySelector('.app-header h1');
    if(h && /gmf\s*lab/i.test(h.textContent||''))h.textContent='GMF Formulador';
  }

  function enhanceSemantics(){
    var current=document.querySelector('.i2-switch a.active');
    if(current) current.setAttribute('aria-current','page');

    var conn=document.getElementById('connBadge');
    if(conn) conn.setAttribute('aria-live','polite');

    var warning=document.getElementById('conformidadeWarning');
    if(warning){warning.setAttribute('role','alert');warning.setAttribute('aria-live','assertive');}

    document.querySelectorAll('.modal-bg .modal').forEach(function(m,i){
      m.setAttribute('role','dialog');
      m.setAttribute('aria-modal','true');
      var h=m.querySelector('h2');
      if(h){
        if(!h.id) h.id='i2-modal-title-'+i;
        m.setAttribute('aria-labelledby',h.id);
      }
    });

    document.querySelectorAll('table').forEach(function(t){
      if(!t.getAttribute('role')) t.setAttribute('role','table');
    });
  }

  function boot(){
    document.body.classList.add('interface-2');
    addCorpBar();
    addContext();
    cleanupLegacyChrome();
    enhanceSemantics();
    setTimeout(cleanupLegacyChrome,250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();