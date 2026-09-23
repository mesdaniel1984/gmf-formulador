'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('minha-conta.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function setup(user={id:'one',email:'one@example.test'}){
 const nodes={},calls=[];let current=user,eventHandler,updateError=null;
 const node=id=>nodes[id]||(nodes[id]={hidden:true,value:'',textContent:'',disabled:false,addEventListener(event,fn){this[event]=fn;}});
 const auth={getUser:async()=>({data:{user:current},error:null}),onAuthStateChange:fn=>{eventHandler=fn;},updateUser:async input=>{calls.push(input);return {error:updateError};}};
 vm.runInNewContext(source,{document:{getElementById:node},window:{supabase:{createClient:()=>({auth})}},setTimeout});
 await tick();
 return {node,calls,setUser:u=>current=u,event:e=>eventHandler(e),setError:e=>updateError=e,submit:async(a='example-long-passphrase',b=a)=>{node('newPassword').value=a;node('confirmPassword').value=b;await node('passwordForm').submit({preventDefault(){}});}};
}
(async()=>{
 let s=await setup(null);assert.equal(s.node('passwordForm').hidden,true);await s.submit();assert.equal(s.calls.length,0);
 s=await setup({id:'anon',is_anonymous:true});assert.equal(s.node('passwordForm').hidden,true);
 s=await setup();assert.equal(s.node('passwordForm').hidden,false);assert.equal(s.node('accountEmail').textContent,'one@example.test');
 await s.submit('short');assert.equal(s.calls.length,0);
 await s.submit('example-long-passphrase','different-long-passphrase');assert.equal(s.calls.length,0);
 await s.submit();assert.deepEqual(JSON.parse(JSON.stringify(s.calls)),[{password:'example-long-passphrase'}]);assert.equal(s.node('newPassword').value,'');
 s=await setup();s.setUser({id:'two'});await s.submit();assert.equal(s.calls.length,0);assert.equal(s.node('passwordForm').hidden,true);
 s=await setup();s.event('SIGNED_OUT');await s.submit();assert.equal(s.calls.length,0);
 s=await setup();s.setError({code:'reauthentication_needed'});await s.submit();assert.match(s.node('accountStatus').textContent,/Entre novamente/);assert.equal(s.node('savePassword').disabled,false);
 s=await setup();s.setError({code:'weak_password'});await s.submit();assert.match(s.node('accountStatus').textContent,/Não foi possível/);
 console.log('Minha conta: sessão ausente/anônima, validação, sucesso, troca de identidade, saída e erros passaram (Auth simulado).');
})().catch(e=>{console.error(e);process.exit(1);});
