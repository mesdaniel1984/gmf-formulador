(function(){
  function cleanupLegacyCentral(){
    document.querySelectorAll('a[href="index.html"]').forEach(function(x){
      if(x.classList.contains('i2-auth-central'))return;
      var tx=String(x.textContent||'').toLowerCase();
      var pos=String(x.style&&x.style.position||'').toLowerCase();
      if(tx.indexOf('central de sistemas')>-1 && pos==='fixed')x.style.display='none';
    });
  }
  function boot(){
    if(document.querySelector('.i2-auth-layout'))return;
    var card=document.querySelector('.card');if(!card)return;
    document.body.classList.add('i2-auth');
    var layout=document.createElement('div');layout.className='i2-auth-layout';
    var brand=document.createElement('aside');brand.className='i2-auth-brand';
    brand.innerHTML='<div class="i2-auth-logo"><div class="i2-auth-mark">GMF</div><div><strong>Grupo MF Paris</strong><span>Qualidade · P&D · Operações</span></div></div>'
      +'<div class="i2-auth-copy"><div class="i2-auth-eyebrow">Plataforma interna</div><h2>Qualidade conectada ao ciclo de vida do produto.</h2>'
      +'<p>Formulação, especificação, evidência operacional e tratamento da qualidade em ambientes integrados por uma linguagem única.</p>'
      +'<div class="i2-auth-mods"><div class="i2-auth-mod"><strong>GMF</strong><span>Formulação e especificações</span></div>'
      +'<div class="i2-auth-mod"><strong>SGQ</strong><span>Qualidade e ações</span></div><div class="i2-auth-mod"><strong>CQ</strong><span>Produção e evidências</span></div></div></div>'
      +'<div class="i2-auth-foot">Ambiente interno · acesso sujeito às permissões do sistema de origem</div>';
    var main=document.createElement('main');main.className='i2-auth-main';
    card.parentNode.insertBefore(layout,card);layout.appendChild(brand);layout.appendChild(main);main.appendChild(card);
    cleanupLegacyCentral();
    setTimeout(cleanupLegacyCentral,250);
    if(!card.querySelector('.i2-auth-central')){
      var a=document.createElement('a');a.className='i2-auth-central';a.href='index.html';a.textContent='← Voltar à Central de Sistemas';card.appendChild(a);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();