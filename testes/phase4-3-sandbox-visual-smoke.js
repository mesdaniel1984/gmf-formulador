'use strict';

const { chromium }=require('playwright');
const cp=require('child_process');
const fs=require('fs');
const path=require('path');

const preview="<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<link rel=\"stylesheet\" href=\"gmf-ui-app.css\">\n<style>\nbody{margin:0;font-family:Inter,system-ui,sans-serif;background:#eef2f5}\n#i2Workspace{margin:40px auto;width:min(1100px,92vw);background:#fff;border:1px solid #dce5ea;border-radius:14px;padding:20px}\n.i2-ws-actions{display:flex;gap:8px;justify-content:flex-end}\n.i2-ws-btn{height:34px;padding:0 12px;border:1px solid #cfdbe2;border-radius:8px;background:#fff;color:#405867;font-weight:750;cursor:pointer}\n.i2-ws-btn.primary{background:#1769aa;border-color:#1769aa;color:#fff}\n.spinner{width:14px;height:14px;border:2px solid #cad6dd;border-top-color:#1769aa;border-radius:50%;display:inline-block}\n</style>\n</head>\n<body>\n<div id=\"i2Workspace\">\n  <h1>Produto Sandbox</h1>\n  <p>Preview isolado da Fase 4.3</p>\n  <div class=\"i2-ws-actions\"></div>\n</div>\n<script>\nconst qs=new URLSearchParams(location.search);\nconst role=qs.get('role')||'rd';\nwindow._currentUser={id:'u-current'};\nwindow._prodOrigem={id:1,nome:'Produto Sandbox'};\nwindow._receitaFoiAlterada=()=>false;\nconst currentProduct={id:1,nome:'Produto Sandbox',classificacao:'TESTE',dados:{ingredientes:[{ref:'A',nome:'Ingrediente A',nomeExib:'Ingrediente A',qtde:600},{ref:'B',nome:'Ingrediente B',nomeExib:'Ingrediente B',qtde:400}],revisao:'001'}};\nconst legacySnapshot={nome:'Produto Sandbox',classificacao:'TESTE',dados:{ingredientes:[{ref:'A',nome:'Ingrediente A',nomeExib:'Ingrediente A',qtde:650},{ref:'B',nome:'Ingrediente B',nomeExib:'Ingrediente B',qtde:350}],revisao:'000'}};\nconst sandboxSnapshot={nome:'Produto Sandbox',classificacao:'TESTE',dados:{ingredientes:[{ref:'A',nome:'Ingrediente A',nomeExib:'Ingrediente A',qtde:550},{ref:'B',nome:'Ingrediente B',nomeExib:'Ingrediente B',qtde:450}],revisao:'sandbox'}};\nconst roles=role==='quality'?[{role:'quality'}]:[{role:'rd'}];\nconst profile={readonly:false};\nconst revisions=[{id:'rev-legacy',revisao_codigo:null,legacy_revision_text:'000',status:'LEGADO',snapshot:legacySnapshot,criado_em:'2026-01-01T00:00:00Z',vigente_desde:null}];\nconst sandboxes=[{id:'sb-1',produto_id:1,base_revisao_id:'rev-legacy',nome:'Redução de ingrediente A',descricao:'Cenário experimental para comparação',snapshot:sandboxSnapshot,status:'ATIVO',criado_por:'u-current',criado_em:'2026-09-20T10:00:00Z',atualizado_em:'2026-09-20T11:00:00Z',promovido_para_revisao_id:null,promovido_em:null,arquivado_em:null,lock_version:2}];\nfunction queryFor(table){\n  const q={\n    select(){return q;},\n    eq(){return q;},\n    order(){\n      if(table==='produto_revisoes')return Promise.resolve({data:revisions,error:null});\n      if(table==='produto_sandboxes')return Promise.resolve({data:sandboxes,error:null});\n      return Promise.resolve({data:[],error:null});\n    },\n    single(){\n      if(table==='perfis')return Promise.resolve({data:profile,error:null});\n      if(table==='produtos')return Promise.resolve({data:currentProduct,error:null});\n      return Promise.resolve({data:null,error:null});\n    },\n    then(resolve,reject){\n      let data=[];\n      if(table==='app_user_roles')data=roles;\n      return Promise.resolve({data,error:null}).then(resolve,reject);\n    }\n  };\n  return q;\n}\nwindow._sb={from(table){return queryFor(table);},rpc(){return Promise.resolve({data:null,error:null});}};\n</script>\n<script src=\"gmf-sandbox.js\"></script>\n</body>\n</html>";

(async()=>{
  fs.writeFileSync('.sandbox-ui-preview.html',preview);
  const shots=path.join(process.cwd(),'ui2-screens');
  fs.mkdirSync(shots,{recursive:true});
  const srv=cp.spawn('python3',['-m','http.server','4174','--bind','127.0.0.1'],{stdio:'ignore'});
  const browser=await chromium.launch({headless:true});
  let pass=0,fail=0;
  function check(v,msg){console.log((v?'  ok    ':'  FALHA ')+msg);v?pass++:fail++;}

  async function open(role,width,height,label){
    const p=await browser.newPage({viewport:{width,height}});
    const errors=[];
    p.on('pageerror',e=>errors.push(String(e)));
    await p.goto('http://127.0.0.1:4174/.sandbox-ui-preview.html?role='+encodeURIComponent(role),{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(1000);
    check(await p.locator('#i2wsSandbox').isVisible(),label+' mostra botão Sandbox');
    await p.click('#i2wsSandbox');
    await p.waitForTimeout(250);
    check(await p.locator('#i2SandboxOverlay').isVisible(),label+' abre drawer Sandbox');
    const dims=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    check(dims.sw<=dims.cw+2,label+' sem overflow horizontal');
    check(errors.length===0,label+' sem erro JavaScript');
    return p;
  }

  try{
    await new Promise(r=>setTimeout(r,600));
    let p=await open('rd',1440,900,'Sandbox P&D');
    check(await p.locator('#i2SbCreateForm').count()===1,'P&D vê formulário de criação');
    check(await p.getByText('Redução de ingrediente A',{exact:true}).count()===1,'P&D vê cenário existente');
    await p.click('[data-sb-action="edit"][data-sb-id="sb-1"]');
    await p.waitForTimeout(100);
    check(await p.locator('[data-sb-qty]').count()===2,'editor P&D mostra quantidades dos ingredientes');
    check((await p.locator('#i2SbFormulaTotal').textContent()).includes('1.000'),'editor P&D mostra total da fórmula 1000');
    await p.click('[data-sb-action="compare"][data-sb-id="sb-1"]');
    await p.waitForTimeout(100);
    check(await p.getByText('Comparação de snapshots',{exact:true}).count()===1,'P&D abre comparação');
    check(await p.getByText('Ingredientes alterados',{exact:true}).count()===1,'comparação mostra resumo da fórmula');
    await p.screenshot({path:path.join(shots,'08-gmf-sandbox-rd.png'),fullPage:true});
    await p.close();

    p=await open('quality',390,844,'Sandbox Qualidade mobile');
    check(await p.locator('#i2SbCreateForm').count()===0,'Qualidade não vê formulário de criação');
    check(await p.getByText('Consulta de cenários',{exact:true}).count()===1,'Qualidade recebe modo somente consulta');
    check(await p.getByText('Comparar',{exact:true}).count()>=1,'Qualidade pode comparar');
    await p.screenshot({path:path.join(shots,'09-gmf-sandbox-quality-mobile.png'),fullPage:true});
    await p.close();
  } finally {
    await browser.close();
    srv.kill('SIGTERM');
    try{fs.unlinkSync('.sandbox-ui-preview.html');}catch(e){}
  }

  console.log('\n'+pass+' verificações passaram; '+fail+' falharam.');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});