const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const conversa=fs.readFileSync('conversas.html','utf8');
const sgq=fs.readFileSync('sistema_qualidade_online.html','utf8');
new Function(conversa.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
assert.match(conversa,/\.from\('wa_triagem'\)\.upsert\(registro,\{onConflict:'telefone'\}\)/);
assert.match(conversa,/sessionStorage\.setItem\('sac_nc_rascunho'/);
assert.doesNotMatch(conversa,/window\.location\.href=.*telefone/);

const inicio=sgq.indexOf('function aplicarParametrosDaURL(){');
const fim=sgq.indexOf('\n// ===== LICENÇAS =====',inicio);
assert(inicio>0 && fim>inicio);
const script=sgq.slice(inicio,fim);
const fields={}, selected={}, calls=[];
const storage=new Map([['sac_nc_rascunho',JSON.stringify({
  telefone:'5531999990000',categoria:'QUALIDADE_PRODUTO',area:'QUALIDADE',
  observacao:'Produto com problema',protocolo:'ATD-2026-0003'
})]]);
let url='https://sistema.example/sistema_qualidade_online.html?abrir=nc&origem=sac';
const ctx=vm.createContext({
  window:{location:{search:'?abrir=nc&origem=sac',pathname:'/sistema_qualidade_online.html'}},
  URLSearchParams,sessionStorage:{getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},
  document:{getElementById:id=>fields[id]||(fields[id]={style:{},innerHTML:''})},
  ncTabSecao:()=>calls.push('secao'),openNCModal:()=>calls.push('modal'),
  _pontePor:(id,value)=>fields[id]={value},_ponteSelect:(id,value)=>selected[id]=value,
  _sacEsc:s=>s,history:{replaceState(_a,_b,path){url=path;}},console
});
vm.runInContext(script,ctx);
ctx.aplicarParametrosDaURL();
assert.deepEqual(calls,['secao','modal']);
assert.equal(selected.ncTipoI,'Externa Cliente');
assert.equal(fields.ncResp.value,'QUALIDADE');
assert.match(fields.ncDesc.value,/ATD-2026-0003/);
assert.doesNotMatch(fields.ncDesc.value,/5531999990000/);
assert.equal(storage.has('sac_nc_rascunho'),false);
assert.equal(url,'/sistema_qualidade_online.html');
ctx.aplicarParametrosDaURL();
assert.equal(calls.length,2,'recarregar não abre segunda NC');
console.log('SAC: classificação e ponte de rascunho de NC verificadas');
