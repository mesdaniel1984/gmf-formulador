'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const origin='https://mesdaniel1984.github.io',dest='https://qualidade-alimentos-production.up.railway.app/sso/complete';
 const source=fs.readFileSync('cq-acesso.html','utf8');
 try {
  for(const [label,html,expected] of [['anterior',source.replace('content="strict-origin"','content="no-referrer"'),'null'],['corrigido',source,origin]]){
   const page=await browser.newPage();let seen;
   await page.route('**/*',async route=>{
    const req=route.request();
    if(req.url().startsWith('https://cdn.jsdelivr.net/'))return route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:"synthetic-token-test-only"}}})}})}'});
    if(req.url()===dest){seen={method:req.method(),headers:await req.allHeaders(),body:req.postData()};return route.fulfill({contentType:'text/html',body:'<p>Recebido</p>'});}
    if(req.url().startsWith(origin+'/gmf-formulador/cq-acesso.html'))return route.fulfill({contentType:'text/html',body:html});
    return route.abort();
   });
   await page.goto(origin+'/gmf-formulador/cq-acesso.html?state='+'a'.repeat(64));
   await page.waitForURL(dest);
   assert.equal(seen.method,'POST');assert.equal(seen.headers.origin,expected);
   const form=new URLSearchParams(seen.body);assert.equal(form.get('state'),'a'.repeat(64));
   assert.equal(form.get('token'),'synthetic-token-test-only');
   if(label==='corrigido')assert.equal(seen.headers.referer,origin+'/');
   await page.close();console.log(label+': origem POST conferida, sem credenciais reais');
  }
 } finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exit(1)});
