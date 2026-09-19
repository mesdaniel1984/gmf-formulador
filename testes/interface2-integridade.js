// Interface 2.0 — portao de integridade visual
// Uso: node testes/interface2-integridade.js

const fs = require('fs');
const cp = require('child_process');
const BASE = 'edab6d185312d5e82d80a7737d8cc2a05d8de7f9';

function baseFile(path){
  return cp.execFileSync('git',['show', BASE + ':' + path],{encoding:'utf8'});
}
function currentFile(path){ return fs.readFileSync(path,'utf8'); }

function extractFn(src,name){
  let i = src.indexOf('function ' + name + '(');
  if(i < 0) i = src.indexOf('async function ' + name + '(');
  if(i < 0) return null;
  const ai = src.lastIndexOf('async ',i);
  if(ai >= 0 && ai + 6 === i) i = ai;
  const brace = src.indexOf('{',i);
  if(brace < 0) return null;
  let depth=0, quote=null, esc=false, line=false, block=false;
  const tick=String.fromCharCode(96);
  for(let j=brace;j<src.length;j++){
    const ch=src[j], nx=src[j+1];
    if(line){ if(ch==='\n') line=false; continue; }
    if(block){ if(ch==='*' && nx==='/'){ block=false; j++; } continue; }
    if(quote){
      if(esc){ esc=false; continue; }
      if(ch==='\\'){ esc=true; continue; }
      if(ch===quote){ quote=null; continue; }
      continue;
    }
    if(ch==='/' && nx==='/'){ line=true; j++; continue; }
    if(ch==='/' && nx==='*'){ block=true; j++; continue; }
    if(ch==="'" || ch==='"' || ch===tick){ quote=ch; continue; }
    if(ch==='{') depth++;
    else if(ch==='}'){ depth--; if(depth===0) return src.slice(i,j+1); }
  }
  return null;
}

const critical = {
  'sistema_qualidade_online.html':[
    'pushChanges','_mergeArray','_sincronizarChave','numeroNovo','saveSAC','saveNC',
    'sacPrazoPrimeiroRetorno','sacPrazoConclusao','vincularSACNC','abrirNCdoSAC'
  ],
  'gmf_formulador_wizard.html':[
    'salvarProdutoAtual','salvarIngrediente','recalc','calcT','calcContaminantesProRata',
    'renderGatilhosContaminantes','ltGerarLaudo','salvarLaudoNoBanco','carregarProdutosAsync'
  ]
};

let fail = 0, pass = 0;
function check(ok,msg){
  console.log((ok?'  ok    ':'  FALHA ') + msg);
  if(ok) pass++; else fail++;
}

console.log('Interface 2.0 — baseline ' + BASE.slice(0,7));

for(const path of Object.keys(critical)){
  const before=baseFile(path), now=currentFile(path);
  console.log('\n' + path);
  for(const name of critical[path]){
    const a=extractFn(before,name), b=extractFn(now,name);
    check(!!a && !!b, name + ' existe nas duas versoes');
    if(a && b) check(a===b, name + ' permanece byte a byte igual');
  }
}


// Portao mais forte: fora das tres tags de assets, os dois HTMLs operacionais
// devem continuar INTEIROS iguais a baseline. Isso captura exportadores,
// templates e funcoes que uma lista manual poderia esquecer.
function semUi2(path,src){
  if(path==='gmf_formulador_wizard.html'){
    return src.replace('<link rel="stylesheet" href="gmf-ui-app.css">\n<script defer src="gmf-interface-2.js"></script>\n<script defer src="gmf-workspace.js"></script>\n','');
  }
  return src.replace('<link rel="stylesheet" href="gmf-ui-app.css">\n<script defer src="gmf-interface-2.js"></script>\n<script defer src="sgq-workspace.js"></script>\n','');
}
for(const path of ['gmf_formulador_wizard.html','sistema_qualidade_online.html']){
  check(semUi2(path,currentFile(path))===baseFile(path),
        path+' difere da baseline somente pelas tags da Interface 2.0');
}

console.log('\nAssets visuais');
const gmf=currentFile('gmf_formulador_wizard.html');
const sgq=currentFile('sistema_qualidade_online.html');
const idx=currentFile('index.html');
check(gmf.includes('gmf-ui-app.css') && gmf.includes('gmf-interface-2.js') && gmf.includes('gmf-workspace.js'),
      'GMF carrega as camadas previstas');
check(sgq.includes('gmf-ui-app.css') && sgq.includes('gmf-interface-2.js') && sgq.includes('sgq-workspace.js'),
      'SGQ carrega as camadas previstas');
check(idx.includes('gmf_formulador_wizard.html') && idx.includes('sistema_qualidade_online.html') &&
      idx.includes('qualidade-alimentos-production.up.railway.app'),
      'Central mantem os tres destinos');
check(idx.includes('gmf-central.js') && fs.existsSync('gmf-central.js'),
      'busca local da Central esta ligada ao asset previsto');
check(fs.existsSync('gmf-ui.css') && fs.existsSync('gmf-ui-app.css') &&
      fs.existsSync('gmf-interface-2.js') && fs.existsSync('gmf-workspace.js') &&
      fs.existsSync('sgq-workspace.js'),
      'assets da Interface 2.0 existem');

console.log('\n' + pass + ' verificacoes passaram; ' + fail + ' falharam.');
process.exit(fail ? 1 : 0);
