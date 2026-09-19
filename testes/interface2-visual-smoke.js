const { chromium } = require('playwright');
const cp=require('child_process');
const fs=require('fs');
const path=require('path');

(async()=>{
  const shots=path.join(process.cwd(),'ui2-screens');
  fs.mkdirSync(shots,{recursive:true});
  const gmfRaw=fs.readFileSync('gmf_formulador_wizard.html','utf8');
  const gmfPreview=gmfRaw.replace(/_initAuth\(\)\.then\(async\(\)=>\{[^\n]*\}\);/,'/* auth desativada apenas no smoke visual */');
  fs.writeFileSync('.gmf-preview-smoke.html',gmfPreview);
  const srv=cp.spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
  const browser=await chromium.launch({headless:true});
  let fail=0,pass=0;
  function check(v,msg){console.log((v?'  ok    ':'  FALHA ')+msg);v?pass++:fail++;}
  async function pageCheck(path,width,height,label){
    const p=await browser.newPage({viewport:{width,height}});
    const errors=[];
    p.on('pageerror',e=>errors.push(String(e)));
    await p.goto('http://127.0.0.1:4173/'+path,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(500);
    const dims=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    check(dims.sw<=dims.cw+2,label+' sem overflow horizontal');
    check(errors.length===0,label+' sem erro JavaScript');
    return p;
  }
  try{
    await new Promise(r=>setTimeout(r,700));

    let p=await pageCheck('index.html',1440,900,'Central desktop');
    check(await p.locator('.gmf-module').count()===3,'Central mostra os tres sistemas');
    await p.screenshot({path:path.join(shots,'01-central-desktop.png'),fullPage:true});
    await p.fill('#gmfCentralSearch','qualidade');
    await p.waitForTimeout(100);
    const vis=await p.locator('.gmf-module:not([hidden])').count();
    check(vis>=1&&vis<3,'busca da Central filtra modulos');
    await p.close();

    p=await pageCheck('index.html',390,844,'Central mobile');
    check(await p.locator('.gmf-module').count()===3,'Central mobile preserva destinos');
    await p.screenshot({path:path.join(shots,'02-central-mobile.png'),fullPage:true});
    await p.close();

    p=await pageCheck('login.html',1440,900,'Login desktop');
    check(await p.locator('.i2-auth-layout').count()===1,'login recebe shell corporativo');
    await p.screenshot({path:path.join(shots,'03-login-desktop.png'),fullPage:true});
    await p.close();

    p=await pageCheck('login.html',390,844,'Login mobile');
    check(await p.locator('.card').isVisible(),'card de login visivel no mobile');
    await p.screenshot({path:path.join(shots,'04-login-mobile.png'),fullPage:true});
    await p.close();

    p=await pageCheck('.gmf-preview-smoke.html',1440,900,'GMF workspace desktop');
    await p.waitForTimeout(700);
    check(await p.locator('#i2Workspace').isVisible(),'workspace do GMF visivel no preview isolado');
    check(await p.locator('[data-i2-life]').count()===6,'lifecycle principal do GMF possui seis etapas operacionais');
    check(await p.locator('#i2wsHistory').count()===1,'historico aparece como etapa separada');
    check(await p.locator('#wizardNav').evaluate(el=>getComputedStyle(el).display)==='none','wizard legado fica oculto na Interface 2.0');
    await p.screenshot({path:path.join(shots,'05-gmf-workspace.png'),fullPage:true});
    await p.close();

    p=await pageCheck('sistema_qualidade_online.html',1440,900,'SGQ gate desktop');
    check(await p.locator('#gate').count()===1,'gate do SGQ existe');
    await p.screenshot({path:path.join(shots,'06-sgq-gate.png'),fullPage:true});
    await p.close();

    p=await pageCheck('sistema_qualidade_online.html',390,844,'SGQ modal mobile');
    await p.evaluate(()=>{
      const g=document.getElementById('gate');if(g)g.style.display='none';
      const m=document.getElementById('ncModal');if(m)m.classList.add('open');
    });
    await p.waitForTimeout(120);
    check(await p.locator('#ncModal .modal').isVisible(),'modal de NC visivel no mobile');
    const box=await p.locator('#ncModal .modal').boundingBox();
    check(!!box&&box.width<=390&&box.height<=844,'modal de NC cabe no viewport mobile');
    await p.screenshot({path:path.join(shots,'07-sgq-nc-mobile.png'),fullPage:true});
    await p.close();
  } finally {
    await browser.close();srv.kill('SIGTERM');
    try{fs.unlinkSync('.gmf-preview-smoke.html');}catch(e){}
  }
  console.log('\n'+pass+' verificacoes passaram; '+fail+' falharam.');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});