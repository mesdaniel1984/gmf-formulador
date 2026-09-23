'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('gmf_formulador_wizard.html','utf8');
const startup=html.split('\n').find(line=>line.startsWith('_initAuth().then('));
assert.ok(startup,'Inicialização existe');
async function run(loggedIn,seedFails=false){
 const calls=[];
 const context={_currentUser:null,console:{warn(){}},
 _initAuth:async()=>{calls.push('auth');context._currentUser=loggedIn?{id:'test'}:null;},
 _sincronizarSeeds:async()=>{calls.push('sync');if(seedFails)throw Error('offline');},
 carregarProdutosAsync:async()=>{calls.push('produtos');},
 irParaFormulador:()=>calls.push('formulador'),
 mostrarMenuInicial:()=>calls.push('menu')};
 await vm.runInNewContext(startup,context);
 return calls;
}
(async()=>{
 assert.deepEqual(await run(true),['auth','sync','produtos','formulador']);
 assert.deepEqual(await run(false),['auth']);
 assert.deepEqual(await run(true,true),['auth','sync','produtos','formulador']);
 assert.match(html,/onclick="mostrarMenuInicial\(\)"/);
 console.log('Entrada direta: sessão válida abre Formulador; sem sessão não inicializa; menu continua opcional.');
})().catch(e=>{console.error(e);process.exit(1);});
