'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('central-session.js','utf8');
async function run(user,error,absent=false){
 const els=Object.fromEntries(['centralSessionStatus','centralEnter','centralSignOut'].map(k=>[k,{hidden:false,textContent:'',addEventListener:(event,fn)=>els[k].click=fn}]));
 let callback,scope;
 const auth={getUser:async()=>({data:{user},error}),onAuthStateChange:fn=>callback=fn,signOut:async arg=>{scope=arg.scope;callback('SIGNED_OUT');return {};}};
 vm.runInNewContext(source,{document:{getElementById:k=>els[k]},window:{supabase:absent?null:{createClient:()=>({auth})}},setTimeout});
 await new Promise(r=>setTimeout(r,0));return {els,callback,scope:()=>scope};
}
(async()=>{
 let x=await run({email:'teste@exemplo.local'});
 assert.equal(x.els.centralEnter.hidden,true);assert.equal(x.els.centralSignOut.hidden,false);
 await x.els.centralSignOut.click();assert.equal(x.scope(),'local');assert.equal(x.els.centralEnter.hidden,false);
 x=await run(null);assert.equal(x.els.centralEnter.hidden,false);assert.equal(x.els.centralSignOut.hidden,true);
 x=await run({email:'anon',is_anonymous:true});assert.equal(x.els.centralSignOut.hidden,true);
 x=await run(null,Error('offline'));assert.equal(x.els.centralEnter.hidden,false);
 x=await run(null,null,true);assert.match(x.els.centralSessionStatus.textContent,/página de login/);
 console.log('Sessão Central: entrada, identidade, saída local, anônimo, falha e SDK ausente passaram.');
})().catch(e=>{console.error(e);process.exitCode=1;});
