'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs');
const fixture={consultado_em:'2026-09-23T12:00:00Z',fontes:{ncs:{registros:[{numero:'NC-01',titulo:'Produto de teste com nome longo para verificar o comportamento responsivo',data:'2026-09-20',status:'Aberta',prazo:'2026-09-21',responsavel:'Equipe da Qualidade'},{numero:'NC-02',titulo:'Produto B',data:'2026-09-21',status:'Fechada'}]},sac:{registros:[]},licencas:{registros:[]}},laudos:[{numero:'L-001',titulo:'<img src=x onerror=alert(1)>',status:'Emitido',data:'2026-09-23'}],entrada_sac:null,atendimento_humano:[]};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  // Fixtures use a fixed business day, independent of UTC / São Paulo midnight.
  await page.clock.setFixedTime(new Date('2026-09-23T15:00:00Z'));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:`window.testDenied=false;window.testSignedOut=false;window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:window.testSignedOut?null:{user:{id:'fixture'}}}}),onAuthStateChange:fn=>{window.testAuth=fn;},signOut:async()=>({})},rpc:async()=>window.testDenied?{error:{code:'42501'}}:{data:${JSON.stringify(fixture)}}})};`}));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../painel-admin.html')).href);
  await page.locator('#painel').waitFor({state:'visible'});
  assert.equal(await page.locator('.metric').count(),6);
  assert.equal(await page.locator('.analysis-kpi').count(),4);
  await page.locator('.analysis-kpi').first().click();
  assert.equal(await page.locator('#analise-registros .record').count(),2);
  await page.locator('#fechar-analise').click();
  await page.locator('#analise-fonte').selectOption('sac');
  assert.equal(await page.locator('.analysis-kpi strong').first().innerText(),'0');
  await page.locator('#analise-fonte').selectOption('ncs');
  assert.equal(await page.locator('#registros img').count(),0,'data must remain text');
  assert.match(await page.locator('#registros').innerText(),/onerror/);
  await page.locator('.metric').filter({hasText:'Entradas SAC novas'}).click();
  assert.match(await page.locator('#registros').innerText(),/indisponíveis/);
  await page.locator('#inicio').fill('2026-09-24');await page.locator('#inicio').dispatchEvent('change');
  assert.equal(await page.locator('.metric strong').first().innerText(),'0');
  await page.locator('#limpar').click();assert.equal(await page.locator('.metric strong').first().innerText(),'1');
  await page.locator('#inicio').fill('2026-09-21');await page.locator('#fim').fill('2026-09-23');await page.locator('#fim').dispatchEvent('change');
  assert.match(await page.locator('#analise').innerText(),/Comparação:/);
  await page.locator('#inicio').fill('2026-09-24');await page.locator('#inicio').dispatchEvent('change');
  assert.equal(await page.locator('.analysis-kpi').count(),0,'invalid range clears analysis');
  await page.locator('#limpar').click();
  fs.mkdirSync('ui2-screens',{recursive:true});
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow at '+width);
   await page.screenshot({path:'ui2-screens/admin-'+width+'.png',fullPage:true});
  }
  await page.evaluate(()=>{window.testAuth('SIGNED_OUT');});
  assert.equal(await page.locator('#painel').isVisible(),false);assert.equal(await page.locator('#registros').innerText(),'');
  assert.equal(await page.locator('#analise').innerText(),'');assert.equal(await page.locator('#analise-registros').innerText(),'');
  await page.evaluate(()=>{window.testDenied=true;});await page.locator('#atualizar').click();
  await page.waitForFunction(()=>document.getElementById('mensagem').textContent.includes('exclusivo'));
  assert.equal(await page.locator('#painel').isVisible(),false);
  await page.evaluate(()=>{window.testSignedOut=true;});await page.locator('#atualizar').click();
  await page.locator('#entrar').waitFor({state:'visible'});
  assert.match(await page.locator('#entrar').getAttribute('href'),/next=admin/);
  assert.deepEqual(errors,[]);
  console.log('Painel Admin: navegação, ausência de fonte, datas, texto seguro, logout e larguras 1280/390/320 passaram. Dados simulados; autorização SQL testada separadamente.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
