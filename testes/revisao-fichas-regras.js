// Revisao das Fichas Tecnicas (nov/2026) — confere as regras por categoria contra o documento de revisao.
// Uso: node testes/revisao-fichas-regras.js
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync('gmf_formulador_wizard.html', 'utf8');
const a = src.indexOf('// ===== REGRAS REGULATÓRIAS POR CATEGORIA');
const b = src.indexOf('// ===== FIM REGRAS REGULATÓRIAS');
if (a < 0 || b < 0) { console.log('FALHA bloco de regras nao encontrado'); process.exit(1); }
const ctx = { receita: [], tipoSel: 'composto-com', classeSel: 'composto-com', _getBtnSelecionados: () => ctx.__sub || [] };
vm.createContext(ctx);
vm.runInContext(src.slice(a, b) + '\nthis.REGRAS_REG=REGRAS_REG;this.calcProRataPartida=calcProRataPartida;this.ftpSecMicro=ftpSecMicro;this.ftpSecContam=ftpSecContam;', ctx);
let ok = 0, fail = 0;
const check = (c, m) => { console.log((c ? '  ok    ' : '  FALHA ') + m); c ? ok++ : fail++; };
const R = ctx.REGRAS_REG;
const txt = (tipo, sec) => { ctx.tipoSel = tipo; return sec === 'm' ? ctx.ftpSecMicro() : ctx.ftpSecContam(); };

['composto-com','composto-sem','mistura','po-preparo','leite-integral','leite-instantaneo','leite-desnatado','achocolatado','cacau','chocolate-po','cafe-torrado-moido','cafe-torrado','soro-derivados','maltodextrina-glicose','espessante']
  .forEach(t => check(!!R[t], 'regra definida para ' + t));

check(/IN ANVISA nº 161\/2022 \(Cat\. 9\.e/.test(txt('leite-integral','m')) && txt('leite-integral','m').includes('3x10⁴'), 'leite integral: micro IN 161 cat. 9.e');
check(txt('leite-integral','c').includes('0,20 mg/kg no pó') && txt('leite-integral','c').includes('5,5 pg/g'), 'leite integral: contaminantes IN 160 (Pb pó 0,20; dioxinas)');
check(txt('mistura','m').includes('categoria 9.j') && txt('mistura','m').includes('n=5 · c=1'), 'mistura: cat. 9.j, Enterobacteriaceae c=1');
check(txt('cacau','m').includes('Cat. 20.e') && txt('cacau','m').includes('10³'), 'cacau: cat. 20.e com aeróbios 10³/10⁴');
check(txt('achocolatado','m').includes('Cat. 20.f'), 'achocolatado: cat. 20.f');
check(txt('cafe-torrado-moido','m').includes('Cat. 17.b') && txt('cafe-torrado-moido','c').includes('0,50 mg/kg') && txt('cafe-torrado-moido','c').includes('Máx. 0,10 mg/kg'), 'cafe: cat. 17.b, Pb 0,50, Cd 0,10');
check(txt('po-preparo','m').includes('Cat. 23.b'), 'po para preparo: cat. 23.b');
check(txt('espessante','c').includes('1000 mcg/kg') && txt('espessante','m').includes('Bacillus cereus'), 'espessante: micro 19.a e fumonisinas 1000');
ctx.__sub = []; check(txt('maltodextrina-glicose','m').includes('Cat. 19.a'), 'maltodextrina: cat. 19.a por padrao');
ctx.__sub = ['st-glicose']; check(txt('maltodextrina-glicose','m').includes('Cat. 16.a') && txt('maltodextrina-glicose','m').includes('Bolores'), 'glicose: cat. 16.a, bolores e leveduras');
ctx.__sub = [];

// pro-rata: 60% leite em po + 40% acucar -> Pb 0,6*0,20+0,4*0,10=0,16 ; Cd 0,6*0,5=0,3 ; As 0,6*0,5+0,4*0,10=0,34
ctx.receita = [{ d: { n: 'Leite em pó integral', lacteo: 'lacteo' }, qtde: 600 }, { d: { n: 'Açúcar refinado' }, qtde: 400 }];
const pr = ctx.calcProRataPartida(['pb','cd','as','afm1']);
const s = JSON.stringify(pr.itens);
check(s.includes('Máx. 0,16 mg/kg') && s.includes('Máx. 0,3 mg/kg') && s.includes('Máx. 0,34 mg/kg') && s.includes('Máx. 3 mcg/kg'), 'pro-rata 60% leite + 40% acucar: Pb 0,16 · Cd 0,3 · As 0,34 · AFM1 3');
ctx.tipoSel = 'chocolate-po';
ctx.receita = [{ d: { n: 'Cacau em pó natural' }, qtde: 350 }, { d: { n: 'Açúcar' }, qtde: 650 }];
check(txt('chocolate-po','c').includes('Máx. 0,20 mg/kg') && !txt('chocolate-po','c').includes('Máx. 0,40 mg/kg'), 'chocolate em po com 35% cacau: faixa < 40%');
ctx.receita = [{ d: { n: 'Cacau em pó natural' }, qtde: 450 }, { d: { n: 'Açúcar' }, qtde: 550 }];
check(txt('chocolate-po','c').includes('Máx. 0,40 mg/kg'), 'chocolate em po com 45% cacau: faixa > 40%');

check(!src.includes('IN MAPA nº 28') && !src.includes('IN MAPA 28/2007'), 'nenhuma referencia restante a IN MAPA 28/2007');
check(src.includes("id=\"tb-chocolate-po\"") && src.includes("id=\"tb-espessante\"") && src.includes("'chocolate-po': {") && src.includes("'espessante': {"), 'categorias novas: botoes e templates presentes');
console.log('\n' + ok + ' ok, ' + fail + ' falha(s)');
process.exit(fail ? 1 : 0);
