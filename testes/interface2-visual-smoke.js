const { chromium } = require('playwright');
const cp=require('child_process');

(async()=>{
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
    await p.fill('#gmfCentralSearch','qualidade');
    await p.waitForTimeout(100);
    const vis=await p.locator('.gmf-module:not([hidden])').count();
    check(vis>=1&&vis<3,'busca da Central filtra modulos');
    await p.close();

    p=await pageCheck('index.html',390,844,'Central mobile');
    check(await p.locator('.gmf-module').count()===3,'Central mobile preserva destinos');
    await p.close();

    p=await pageCheck('login.html',1440,900,'Login desktop');
    check(await p.locator('.i2-auth-layout').count()===1,'login recebe shell corporativo');
    await p.close();

    p=await pageCheck('login.html',390,844,'Login mobile');
    check(await p.locator('.card').isVisible(),'card de login visivel no mobile');
    await p.close();

    p=await pageCheck('sistema_qualidade_online.html',1440,900,'SGQ gate desktop');
    check(await p.locator('#gate').count()===1,'gate do SGQ existe');
    await p.close();
  } finally {
    await browser.close();srv.kill('SIGTERM');
  }
  console.log('\n'+pass+' verificacoes passaram; '+fail+' falharam.');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});