(function(){
  function norm(s){
    return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function boot(){
    var q=document.getElementById('gmfCentralSearch');
    if(!q)return;
    var cards=Array.from(document.querySelectorAll('.gmf-module'));
    var status=document.getElementById('gmfSearchStatus');

    function run(){
      var term=norm(q.value),visible=0;
      cards.forEach(function(card){
        var hay=norm(card.textContent);
        var ok=!term||hay.indexOf(term)>-1;
        card.hidden=!ok;
        if(ok)visible++;
      });
      if(status)status.textContent=term?(visible+' sistema'+(visible===1?'':'s')+' encontrado'+(visible===1?'':'s')):'';
      document.body.classList.toggle('gmf-searching',!!term);
    }

    q.addEventListener('input',run);
    q.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&q.value){q.value='';run();q.blur();}
      if(e.key==='Enter'){
        var first=cards.find(function(c){return !c.hidden;});
        if(first)first.focus();
      }
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='/'&&!/input|textarea|select/i.test((document.activeElement||{}).tagName||'')){
        e.preventDefault();q.focus();
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();