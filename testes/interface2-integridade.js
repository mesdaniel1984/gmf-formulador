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
    src = src.replace("function _nomeExibicao(d) {\n  if (!d) return '';\n  const aliases = {\n    'Composto Lacteo com LM267':'Composto lácteo com gordura vegetal',\n    'Composto lácteo 267':'Composto lácteo',\n    'Composto lácteo LM267':'Composto lácteo com gordura vegetal',\n    'Mistura Láctea Select 25Kg':'Mistura láctea',\n    'Maltodextrina (Manimalto 20)':'Maltodextrina',\n    'CMC 2604A':'Estabilizante carboximetilcelulose',\n    'Premix de Nutrientes SMV8150 (Sweetmix)':'Mix de vitaminas e minerais',\n    'Polidextrose — Fibra Solúvel (ADC 1119/1097)':'Polidextrose',\n    'Aroma ID Natural Chocolate Branco (ADC 1784/1810)':'Aromatizante idêntico ao natural de chocolate branco',\n    'Leite integral em pó instantâneo (Ninho)':'Leite em pó integral instantâneo',\n    'Leite Condensado Da Provincia':'Leite condensado',\n    'Leite Condensado Ligth Moça':'Leite condensado light',\n    'Gordura Vegetal Hidrogenada Mesa':'Gordura vegetal hidrogenada'\n  };\n  const key=Object.keys(aliases).find(n=>n.toLocaleLowerCase('pt-BR')===String(d.n||'').toLocaleLowerCase('pt-BR'));\n  const canonical=typeof DB!=='undefined'?DB.find(x=>x.n===d.n):null;\n  const rotulo=d.rotulo || canonical?.rotulo;\n  return (key ? aliases[key] : rotulo ? String(rotulo).split('(')[0] : String(d.n||'')).trim();\n}\n\nfunction _textoIngredientesPublico(texto) {\n  const replacements = [];\n  const entries = typeof DB!=='undefined' ? DB : [];\n  entries.forEach(d=>{\n    if(!d.n || !/LM\\s*267|Select|Manimalto|2604A|SMV8150|Sweetmix|ADC |Ninho|Provincia|Moça|Mesa|Purelac|Alibra|Oila|ALIMENTA|Ramolac|Supreme|Tangará/i.test(d.n))return;\n    const publicName=_nomeExibicao(d);\n    if(publicName && publicName.toLocaleLowerCase('pt-BR')!==d.n.toLocaleLowerCase('pt-BR'))\n      replacements.push([d.n,publicName]);\n  });\n  replacements.push(['Composto lácteo 267','Composto lácteo'],['Composto lácteo LM267','Composto lácteo com gordura vegetal']);\n  // Uma passagem: não modifica novamente o texto já substituído.\n  replacements.sort((a,b)=>b[0].length-a[0].length);\n  if(!replacements.length)return String(texto||'');\n  const escaped=replacements.map(([name])=>name.replace(/[.*+?^$(){}|[\\]\\\\]/g,'\\\\$&'));\n  const pattern=new RegExp('(^|[^\\\\p{L}\\\\p{N}])('+escaped.join('|')+')(?=$|[^\\\\p{L}\\\\p{N}])','giu');\n  return String(texto||'').replace(pattern,(match,prefix,name)=>{\n    const found=replacements.find(([from])=>from.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'));\n    return prefix+(found?found[1]:name);\n  });\n}","function _nomeExibicao(d) {\n  if (!d.rotulo) return d.n;\n  // Pega tudo antes do primeiro \"(\" e remove espaços extras\n  return d.rotulo.split('(')[0].trim();\n}");
    src = src.replace(".map(r => _textoIngredientesPublico(r.d.rotuloCompleto || r.d.rotulo || _nomeExibicao(r.d)).toLowerCase())",".map(r => (r.d.rotuloCompleto || r.d.rotulo || r.d.n || '').toLowerCase())");
    src = src.replace("const ingList = _textoIngredientesPublico(gv('p_ingredientes_txt') || _buildIngredientesList());","const ingList = gv('p_ingredientes_txt') || _buildIngredientesList();");
    src = src.replace("{n:\"Leite de cabra integral\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:66,cho:5.2,act:4.3,acad:0,ptn:3.1,gt:3.8,gs:2.5,tr:0,fi:0,na:74,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 454\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Leite de cabra integral\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:66,cho:4.3,act:4.3,acad:0,ptn:3.1,gt:3.8,gs:2.5,tr:0,fi:0,na:43},");
    src = src.replace("{n:\"Leite de vaca achocolatado\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:83,cho:14.2,act:13.4,acad:3.0,ptn:2.1,gt:2.2,gs:1.4,tr:0,fi:0,na:72,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 455\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Leite de vaca achocolatado\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:83,cho:13.4,act:13.4,acad:3.0,ptn:2.1,gt:2.2,gs:1.4,tr:0,fi:0,na:50},");
    src = src.replace("{g:\"🥛 Leite em pó e concentrados\",n:\"Leite integral em pó (LIP)\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:497,cho:39.2,act:38.4,acad:0,ptn:25.4,gt:26.9,gs:17.5,tr:0,fi:0,na:323,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 459\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{g:\"🥛 Leite em pó e concentrados\",n:\"Leite integral em pó (LIP)\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:497,cho:38.4,act:38.4,acad:0,ptn:25.4,gt:26.9,gs:17.5,tr:0,fi:0,na:320},");
    src = src.replace("{n:\"Leite desnatado em pó (LDP)\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:362,cho:53,act:52.0,acad:0,ptn:34.7,gt:0.9,gs:0.6,tr:0,fi:0,na:432,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 456\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Leite desnatado em pó (LDP)\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:362,cho:52.0,act:52.0,acad:0,ptn:34.7,gt:0.9,gs:0.6,tr:0,fi:0,na:475},");
    src = src.replace("{g:\"🧀 Queijos\",n:\"Queijo minas frescal\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:264,cho:3.2,act:0,acad:0,ptn:17.4,gt:20.2,gs:13.7,tr:0,fi:0,na:31,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 461\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{g:\"🧀 Queijos\",n:\"Queijo minas frescal\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:264,cho:1.4,act:0,acad:0,ptn:17.4,gt:20.2,gs:13.7,tr:0,fi:0,na:250},");
    src = src.replace("{n:\"Queijo mussarela\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:330,cho:3,act:0,acad:0,ptn:22.6,gt:25.2,gs:16.2,tr:0,fi:0,na:581,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 463\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Queijo mussarela\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:330,cho:0.5,act:0,acad:0,ptn:22.6,gt:25.2,gs:16.2,tr:0,fi:0,na:550},");
    src = src.replace("{n:\"Queijo parmesão\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:453,cho:1.7,act:0,acad:0,ptn:35.6,gt:33.5,gs:21.7,tr:0,fi:0,na:1844,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 464\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Queijo parmesão\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:453,cho:0.6,act:0,acad:0,ptn:35.6,gt:33.5,gs:21.7,tr:0,fi:0,na:900},");
    src = src.replace("{n:\"Queijo prato\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:360,cho:1.9,act:0,acad:0,ptn:22.7,gt:29.1,gs:19.0,tr:0,fi:0,na:580,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 467\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 56–57. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Queijo prato\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:360,cho:0.5,act:0,acad:0,ptn:22.7,gt:29.1,gs:19.0,tr:0,fi:0,na:610},");
    src = src.replace("{n:\"Requeijão cremoso\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:257,cho:2.4,act:0,acad:0,ptn:9.6,gt:23.4,gs:15.1,tr:0,fi:0,na:558,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 468\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 56–57. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Requeijão cremoso\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:257,cho:2.4,act:0,acad:0,ptn:9.6,gt:22.5,gs:15.1,tr:0,fi:0,na:480},");
    src = src.replace("{n:\"Queijo minas padrão (meia cura)\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:321,cho:3.6,act:0,acad:0,ptn:21.2,gt:24.6,gs:16.3,tr:0,fi:0,na:501,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 462\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Queijo minas padrão (meia cura)\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:321,cho:1.0,act:0,acad:0,ptn:21.2,gt:24.6,gs:16.3,tr:0,fi:0,na:530},");
    src = src.replace("{n:\"Queijo ricota\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:140,cho:3.8,act:0,acad:0,ptn:12.6,gt:8.1,gs:4.9,tr:0,fi:0,na:283,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 469\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 56–57. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Queijo ricota\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:140,cho:3.8,act:0,acad:0,ptn:12.6,gt:8.1,gs:4.9,tr:0,fi:0,na:283},");
    src = src.replace("{n:\"Manteiga com sal\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:726,cho:0.1,act:0,acad:0,ptn:0.4,gt:82.4,gs:57.3,tr:3.3,fi:0,na:580,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 261\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt. Páginas impressas 42. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\"],\"status\":\"Conferência parcial\"}},","{n:\"Manteiga com sal\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:726,cho:0,act:0,acad:0,ptn:0.4,gt:82.4,gs:57.3,tr:3.3,fi:0,na:580},");
    src = src.replace("{n:\"Manteiga sem sal\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:758,cho:0,act:0,acad:0,ptn:0.4,gt:86,gs:57.3,tr:3.3,fi:0,na:12,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 262\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt. Páginas impressas 42. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\"],\"status\":\"Conferência parcial\"}},","{n:\"Manteiga sem sal\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:726,cho:0,act:0,acad:0,ptn:0.5,gt:82.4,gs:57.3,tr:3.3,fi:0,na:12},");
    src = src.replace("{n:\"Iogurte natural desnatado\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:41,cho:5.8,act:4.9,acad:0,ptn:3.8,gt:0.3,gs:0.2,tr:0,fi:0,na:60,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 449\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{n:\"Iogurte natural desnatado\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:41,cho:4.9,act:4.9,acad:0,ptn:3.8,gt:0.3,gs:0.2,tr:0,fi:0,na:54},");
    src = src.replace("{g:\"🍮 Doces e condensados\",n:\"Leite condensado integral\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:313,cho:57,act:57.0,acad:0,ptn:7.7,gt:6.7,gs:4.2,tr:0,fi:0,na:94,referencia:{\"autor\":\"NEPA/UNICAMP\",\"titulo\":\"TACO, 4ª edição revisada e ampliada, 2011 — Tabela 1, alimento 453\",\"url\":\"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf\",\"consulta\":\"2026-09-23\",\"base\":\"100 g de parte comestível; sem conversão\",\"nota\":\"Conferência parcial: kcal, cho, ptn, gt, na. Páginas impressas 54–55. Demais campos ainda não conferidos; referência genérica, não ficha de fornecedor.\",\"campos_conferidos\":[\"kcal\",\"cho\",\"ptn\",\"gt\",\"na\"],\"status\":\"Conferência parcial\"}},","{g:\"🍮 Doces e condensados\",n:\"Leite condensado integral\",ref:\"TACO/UNICAMP\",src:\"TACO\",kcal:313,cho:57.0,act:57.0,acad:0,ptn:7.7,gt:6.7,gs:4.2,tr:0,fi:0,na:94},");
    // Correção documental autorizada de um único registro; não normaliza outros dados.
    src = src.replace("{\"n\":\"Leite integral em pó instantâneo (Ninho)\",\"ref\":\"Nestlé — NINHO Integral Instantâneo 380 g — consulta 23/09/2026\",\"src\":\"Rótulo\",\"rotulo\":\"Leite em Pó Integral Instantâneo\",\"kcal\":496,\"cho\":37.6,\"act\":36,\"acad\":0,\"ptn\":25.2,\"gt\":26.8,\"gs\":17.6,\"tr\":1.2,\"fi\":0,\"na\":392,\"referencia\":{\"autor\":\"Nestlé\",\"titulo\":\"NINHO Integral Instantâneo — 380 g\",\"url\":\"https://www.nestleparaespecialistas.com.br/produtos/ninho-integral-instantaneo\",\"consulta\":\"2026-09-23\",\"base\":\"25 g de pó; conversão para 100 g: multiplicar por 4\",\"evidencia\":\"Capturas enviadas pelo usuário em 23/09/2026, 11:29:27 e 11:29:33\",\"status\":\"Conferido com fonte documental\",\"nota\":\"Valores derivados de rótulo arredondado; não equivalem a ensaio do lote.\"}},","{n:\"Leite integral em pó instantâneo (Ninho)\",ref:\"Nestlé/ANVISA\",src:\"Rótulo\",rotulo:\"Leite em Pó Integral Instantâneo\",kcal:497,cho:38.0,act:38.0,acad:0,ptn:25.6,gt:26.5,gs:17.3,tr:0.3,fi:0,na:330},");
    // Exceção explícita: entrada direta solicitada; demais bytes seguem protegidos.
    src = src.replace("_initAuth().then(async()=>{ if (!_currentUser) return; try { await _sincronizarSeeds(); } catch(e){ console.warn('sync erro:',e); } await carregarProdutosAsync(); irParaFormulador(); });","_initAuth().then(async()=>{ try { await _sincronizarSeeds(); } catch(e){ console.warn('sync erro:',e); } await carregarProdutosAsync(); mostrarMenuInicial(); });");
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
