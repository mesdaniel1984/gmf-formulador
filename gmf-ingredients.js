(function(){
'use strict';
function boot(){
 const list=document.getElementById('ing_lista'),panel=document.getElementById('step6');
 const workspace=document.getElementById('i2Workspace')||document.querySelector('.i2-workspace');
 if(!list||!panel||!workspace||document.getElementById('i2IngredientsNav'))return;
 const nav=document.createElement('nav');nav.id='i2IngredientsNav';nav.setAttribute('aria-label','Navegação do Formulador');
 nav.style.cssText='max-width:1180px;margin:16px auto;padding:0 16px;display:flex;gap:10px;flex-wrap:wrap';
 const products=document.createElement('button');products.type='button';products.className='i2-ws-btn';products.textContent='Produtos';
 products.onclick=()=>{if(typeof irParaFormuladorDosIngredientes==='function')irParaFormuladorDosIngredientes();};
 const ingredients=document.createElement('button');ingredients.type='button';ingredients.className='i2-ws-btn primary';ingredients.textContent='Lista de ingredientes';
 ingredients.onclick=()=>{if(typeof irParaIngredientes==='function'){irParaIngredientes();panel.scrollIntoView({block:'start'});}};
 nav.append(products,ingredients);workspace.before(nav);
 const card=list.parentElement,container=card.parentElement;
 // A lista passa a vir antes do formulário de cadastro, dentro do Formulador.
 container.insertBefore(card,container.children[1]||null);
 card.style.marginBottom='20px';list.style.overflowX='auto';
 const notice=document.createElement('p');notice.id='i2IngredientsReview';
 notice.style.cssText='padding:12px;background:#fff7df;border:1px solid #e2c56c;border-radius:8px;font-size:13px;line-height:1.5';
 notice.textContent='Base de referência em revisão: há divergências nas informações atribuídas às tabelas de composição. Os números atuais ainda não estão todos confirmados. Cadastros próprios serão preservados; consulte a ficha técnica do fornecedor antes de aprovar uma formulação.';
 card.insertBefore(notice,list);
 const label=document.createElement('label');label.textContent='Buscar ingrediente';label.htmlFor='i2IngredientSearch';
 const search=document.createElement('input');search.id='i2IngredientSearch';search.type='search';search.placeholder='Nome ou referência';
 search.style.cssText='width:100%;padding:10px;margin:6px 0 12px;border:1px solid #bccbd5;border-radius:8px;font:inherit';
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function annotate(){
 list.querySelectorAll('tr').forEach(row=>{
  const cells=row.querySelectorAll('td');if(!cells.length||row.dataset.referenceShown)return;
  row.dataset.referenceShown='1';
  const name=cells[0].textContent.trim();
  const item=typeof DB!=='undefined'?DB.find(d=>d.n===name):null;
  const note=document.createElement('div');note.style.cssText='font-weight:normal;font-size:11px;white-space:normal;overflow-wrap:anywhere;margin-top:6px';
  const ref=item&&item.referencia;
  if(ref){
   note.textContent=ref.autor+' — '+ref.titulo+' | Consulta: '+ref.consulta+' | '+ref.base+' | '+ref.nota;
   if(ref.url&&/^https:\/\//.test(ref.url)){const a=document.createElement('a');a.href=ref.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Abrir fonte';note.appendChild(a);}
  }else{note.textContent='Referência documental pendente de conferência. Fonte declarada: '+(item&&item.ref||'não informada');}
  cells[0].appendChild(note);
 });
}
 function filter(){annotate();const value=normalize(search.value);list.querySelectorAll('tr').forEach(row=>{if(row.querySelector('td'))row.hidden=!normalize(row.textContent).includes(value);});}
 search.addEventListener('input',filter);card.insertBefore(label,list);card.insertBefore(search,list);
 new MutationObserver(filter).observe(list,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();