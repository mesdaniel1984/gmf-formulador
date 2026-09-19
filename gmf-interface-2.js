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
    bar.innerHTML='<a class="i2-home" href="index.html">GMF <span style="opacity:.65">/</span> Central</a>'
      +'<span class="i2-sep"></span><span class="i2-app">'+txt(appName())+'</span>'
      +'<nav class="i2-switch" aria-label="Trocar sistema">'
      +'<a href="gmf_formulador_wizard.html" class="'+(k==='gmf'?'active':'')+'">GMF</a>'
      +'<a href="sistema_qualidade_online.html" class="'+(k==='sgq'?'active':'')+'">SGQ</a>'
      +'<a href="https://qualidade-alimentos-production.up.railway.app/" class="">CQ ↗</a>'
      +'</nav><span class="i2-right"><span class="i2-state">Interface 2.0</span></span>';
    document.body.insertBefore(bar,document.body.firstChild);
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
  function boot(){
    document.body.classList.add('interface-2');
    addCorpBar();
    addContext();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();