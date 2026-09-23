'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('gmf_formulador_wizard.html','utf8');
const catalog=html.match(/const DB=(\[[\s\S]*?\n\]);/)[1];
const start=html.indexOf('function _nomeExibicao(d) {');
const end=html.indexOf('\nfunction autoPreencherIngredientes()',start);
const context=vm.createContext({});
vm.runInContext('const DB='+catalog+';let receita=[];\n'+html.slice(start,end),context);
const run=s=>vm.runInContext(s,context);
const snapshot=run('JSON.stringify(DB)');
assert.equal(run("_nomeExibicao({n:'Composto Lacteo com LM267'})"),'Composto lácteo com gordura vegetal');
assert.equal(run("_nomeExibicao({n:'Mistura Láctea Select 25Kg'})"),'Mistura láctea');
assert.equal(run("_nomeExibicao({n:'Maltodextrina (Manimalto 20)'})"),'Maltodextrina');
assert.equal(run("_textoIngredientesPublico('Composto Lacteo com LM267, soro de leite em pó, aroma de leite')"),'Composto lácteo com gordura vegetal, soro de leite em pó, aroma de leite');
assert.equal(run("_textoIngredientesPublico('Soro de leite concentrado, leite integral, estabilizante fosfato dissódico (INS 339ii)')"),'Soro de leite concentrado, leite integral, estabilizante fosfato dissódico (INS 339ii)');
run("receita=[{d:DB.find(x=>x.n==='Composto Lacteo com LM267'),qtde:700},{d:DB.find(x=>x.n==='Soro'),qtde:294},{d:DB.find(x=>x.n==='Aroma de leite'),qtde:6}]");
const list=run('_buildIngredientesList()');
assert(!/LM267|Alibra|Duas Rodas/i.test(list));
assert(list.includes('soro de leite concentrado'));
assert(list.includes('hidrogenofosfato'));
assert(list.includes('soro de leite em pó'));
assert.equal(run('JSON.stringify(DB)'),snapshot);
assert(html.includes("const ingList = _textoIngredientesPublico(gv('p_ingredientes_txt') || _buildIngredientesList());"));
console.log('Nomes públicos, texto manual, subingredientes, INS e catálogo interno preservados: OK');

const usedNames=["Composto Lacteo com LM267","Soro","Aroma de leite","Purelac Pro Mix — Mistura Láctea p/ Sorvetes (FT 2018)","Mistura Láctea Select 25Kg","Permeado","Açúcar Cristal moída","Dióxido de Titânio Anatase (INS 171)","CMC 2604A","Sal","Cacau em pó alcalino solúvel 100%","Cacau em pó alcalino gold","Maltodextrina (Manimalto 20)","LPD","Premix de Nutrientes SMV8150 (Sweetmix)","LPI","Leite integral em pó instantâneo (Ninho)","Composto Lácteo Supreme 25kg","Polidextrose — Fibra Solúvel (ADC 1119/1097)","Aroma ID Natural Chocolate Branco (ADC 1784/1810)","WPC34","CAFE TORRADO E MOIDO","Leite em pó integral","Goma xantana","Sacarose","Café solúvel em pó"];
run('DB.push(...'+"[{\"n\":\"Café solúvel em pó\",\"rotulo\":\"Café solúvel\"},{\"n\":\"CAFE TORRADO E MOIDO\",\"rotulo\":\"CAFE TORRADO E MOIDO\",\"rotuloCompleto\":\"CAFÉ EM GRÃOS\"},{\"n\":\"Goma xantana\",\"rotulo\":\"Espessante goma xantana\"},{\"n\":\"Leite em pó integral\",\"rotulo\":\"Leite em pó integral\",\"rotuloCompleto\":\"Leite em pó integral\"},{\"n\":\"Sacarose\",\"rotulo\":\"Açúcar\"}]"+')');
for(const name of usedNames){
  context.ingredientName=name;
  const publicName=run('_nomeExibicao(DB.find(x=>x.n===ingredientName)||{n:ingredientName})');
  assert(publicName.trim(), name);
  assert(!/LM267|Select|Purelac|Manimalto|2604A|SMV8150|Sweetmix|ADC |Ninho|Supreme|WPC34|gold/i.test(publicName),name);
}
assert.equal(run("_textoIngredientesPublico('WPC34, Cacau em pó alcalino gold')"),'Concentrado proteico de soro de leite, cacau em pó alcalino');
assert.equal(run("_textoIngredientesPublico('Café em grãos torrado e moído')"),'Café em grãos torrado e moído');

// Exercita a função de salvamento real: campo vazio não chega ao banco.
const saveStart=html.indexOf('async function salvarIngrediente()');
const saveEnd=html.indexOf('\nasync function excluirIngCustom(',saveStart);
assert(saveStart>=0 && saveEnd>saveStart);
const elements={
  ing_nome:{value:'Ingrediente interno FT 123'},
  ing_rotulo:{value:'',focus(){ focused++; }},
  ing_ref:{value:'Fornecedor — FT original'},
  ing_kcal:{value:'123.4'},ing_msg:{style:{}}
};
let focused=0;const writes=[],alerts=[];
const saveContext=vm.createContext({
  _currentUser:{id:'test-id',email:'operador@example.invalid'},DB:[],
  document:{getElementById:id=>elements[id],querySelectorAll:()=>[]},
  alert:message=>alerts.push(message),
  _sb:{from:()=>({upsert:async row=>{writes.push(row);return {error:null};}})},
  limparFormIngrediente(){},carregarListaIngredientes(){},setTimeout(){}
});
vm.runInContext(html.slice(saveStart,saveEnd),saveContext);
(async()=>{
  await vm.runInContext('salvarIngrediente()',saveContext);
  elements.ing_rotulo.value='   ';
  await vm.runInContext('salvarIngrediente()',saveContext);
  assert.equal(writes.length,0);
  assert.equal(focused,2);
  assert.equal(alerts.length,2);
  elements.ing_rotulo.value=' Composto lácteo ';
  await vm.runInContext('salvarIngrediente()',saveContext);
  assert.equal(writes.length,1);
  assert.equal(writes[0].dados.rotulo,'Composto lácteo');
  assert.equal(writes[0].dados.n,'Ingrediente interno FT 123');
  assert.equal(writes[0].dados.ref,'Fornecedor — FT original');
  assert.equal(writes[0].dados.kcal,123.4);
  console.log('26 nomes em uso conferidos; denominação obrigatória antes da gravação; dados internos preservados: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
