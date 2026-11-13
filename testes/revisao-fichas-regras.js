// Revisao das Fichas Tecnicas (nov/2026) — confere as regras por categoria contra o documento de revisao.
// Uso: node testes/revisao-fichas-regras.js
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync('gmf_formulador_wizard.html', 'utf8');
const a = src.indexOf('// ===== REGRAS REGULATÓRIAS POR CATEGORIA');
const b = src.indexOf('// ===== FIM TABELA NUTRICIONAL');
if (a < 0 || b < 0) { console.log('FALHA bloco de regras nao encontrado'); process.exit(1); }
const ctx = { receita: [], tipoSel: 'composto-com', classeSel: 'composto-com', _getBtnSelecionados: () => ctx.__sub || [] };
vm.createContext(ctx);
vm.runInContext(src.slice(a, b) + '\nthis.REGRAS_REG=REGRAS_REG;this.calcProRataPartida=calcProRataPartida;this.ftpSecMicro=ftpSecMicro;this.ftpSecContam=ftpSecContam;this.ftpSecME=ftpSecME;this.calcProRataME=calcProRataME;this.ftpSecNutri=ftpSecNutri;this.ftpAlertasFrontais=ftpAlertasFrontais;this.NUTRI_CFG=NUTRI_CFG;this.TIPOS_SIF=TIPOS_SIF;', ctx);
let ok = 0, fail = 0;
const check = (c, m) => { console.log((c ? '  ok    ' : '  FALHA ') + m); c ? ok++ : fail++; };
const R = ctx.REGRAS_REG;
const txt = (tipo, sec) => { ctx.tipoSel = tipo; return sec === 'm' ? ctx.ftpSecMicro() : ctx.ftpSecContam(); };

['composto-com','composto-sem','mistura','po-preparo','leite-integral','leite-instantaneo','leite-desnatado','achocolatado','cacau','chocolate-po','cafe-torrado-moido','cafe-torrado','soro-derivados','maltodextrina','glicose','suplemento-po','espessante']
  .forEach(t => check(!!R[t], 'regra definida para ' + t));

check(/IN ANVISA nº 161\/2022 \(Cat\. 9\.e/.test(txt('leite-integral','m')) && txt('leite-integral','m').includes('3x10⁴'), 'leite integral: micro IN 161 cat. 9.e');
check(txt('leite-integral','c').includes('0,20 mg/kg no pó') && txt('leite-integral','c').includes('5,5 pg/g'), 'leite integral: contaminantes IN 160 (Pb pó 0,20; dioxinas)');
check(txt('mistura','m').includes('categoria 9.j') && txt('mistura','m').includes('n=5 · c=1'), 'mistura: cat. 9.j, Enterobacteriaceae c=1');
check(txt('cacau','m').includes('Cat. 20.e') && txt('cacau','m').includes('10³'), 'cacau: cat. 20.e com aeróbios 10³/10⁴');
check(txt('achocolatado','m').includes('Cat. 20.f'), 'achocolatado: cat. 20.f');
check(txt('cafe-torrado-moido','m').includes('Cat. 17.b') && txt('cafe-torrado-moido','c').includes('0,50 mg/kg') && txt('cafe-torrado-moido','c').includes('Máx. 0,10 mg/kg'), 'cafe: cat. 17.b, Pb 0,50, Cd 0,10');
check(txt('po-preparo','m').includes('Cat. 23.b'), 'po para preparo: cat. 23.b');
check(txt('espessante','c').includes('1000 mcg/kg') && txt('espessante','m').includes('Bacillus cereus'), 'espessante: micro 19.a e fumonisinas 1000');
check(txt('maltodextrina','m').includes('Cat. 19.a'), 'maltodextrina (categoria propria): cat. 19.a');
check(txt('glicose','m').includes('Cat. 16.a') && txt('glicose','m').includes('Bolores'), 'glicose (categoria propria): cat. 16.a, bolores e leveduras');
check(txt('suplemento-po','m').includes('Bolores e leveduras') && txt('suplemento-po','m').includes('Enterobacteriaceae') && txt('suplemento-po','m').includes('apenas base láctea'), 'suplemento: micro IN 161 (Salmonella, Enterobact., Staph, B&L, enterotoxinas)');

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

// ---- templates e botões de todas as categorias (evita perder um modelo por engano) ----
['composto-com','composto-sem','mistura','po-preparo','leite-integral','leite-instantaneo','leite-desnatado','achocolatado','cacau','chocolate-po','cafe-torrado-moido','cafe-torrado','soro-derivados','maltodextrina','glicose','suplemento-po','espessante']
  .forEach(t => check(new RegExp("^  '" + t + "': \\{\\n    label:", 'm').test(src) && src.includes('id="tb-' + t + '"'), 'template + botao: ' + t));

// ---- matérias estranhas (RDC 623/2022) ----
const me = (t) => { ctx.tipoSel = t; return ctx.ftpSecME(6); };
check(me('leite-integral').includes('Máx. 1,5%') && me('leite-integral').includes('Máx. 5 na alíquota') && !me('leite-integral').includes('Máx. 60'), 'ME leite: geral (1,5% cinzas, 5 ácaros), insetos/pelos ausência');
check(me('cafe-torrado-moido').includes('Máx. 60 em 25 g') && me('cafe-torrado-moido').includes('AOAC 988.16 b'), 'ME café: 60 insetos em 25 g; pelos ausência');
check(me('cacau').includes('Máx. 25 em 50 g') && me('cacau').includes('Máx. 1 em 50 g') && me('cacau').includes('965.38 a'), 'ME cacau: 25 e 1 em 50 g');
check(me('achocolatado').includes('Máx. 10 em 100 g') && me('chocolate-po').includes('Máx. 1 em 100 g') && me('chocolate-po').includes('965.38 b'), 'ME achocolatado/chocolate: 10 e 1 em 100 g');
ctx.receita = [{ d: { n: 'Soro de leite em pó' }, qtde: 700 }, { d: { n: 'Cacau em pó natural' }, qtde: 300 }];
let pm = ctx.calcProRataME();
check(pm.ins === 15 && pm.pel === 0.6, 'ME pro-rata 30% cacau em pó: insetos 15 · pelos 0,6 por 100 g');
ctx.receita = [{ d: { n: 'Açúcar' }, qtde: 500 }, { d: { n: 'Maltodextrina' }, qtde: 500 }];
check(me('suplemento-po').includes('Ausência') && !me('suplemento-po').includes('(calculado)'), 'ME pro-rata sem ingrediente do Anexo I: ausência');
ctx.receita = [{ d: { n: 'Cacau em pó' }, qtde: 200 }, { d: { n: 'Achocolatado em pó' }, qtde: 300 }, { d: { n: 'Açúcar' }, qtde: 500 }];
pm = ctx.calcProRataME();
check(pm.ins === 13 && pm.pel === 0.7, 'ME pro-rata cacau 20% + achocolatado 30%: insetos 13 · pelos 0,7');
['mistura','composto-com','po-preparo','suplemento-po'].forEach(t => check(me(t).includes('Anexo I'), 'ME ' + t + ': pro-rata (art. 7º)'));

// ---- SIF e lupa ----
check(JSON.stringify(ctx.TIPOS_SIF) === JSON.stringify(['leite-integral','leite-instantaneo','leite-desnatado','composto-sem','composto-com','mistura']), 'SIF só: leite pó (3), composto lácteo (2), mistura láctea');
const nu = (t, T) => ctx.ftpSecNutri({ tipo: t, T, P100: 20, pesoTotal: 1000, medida: '2 colheres de sopa', alertas: ctx.ftpAlertasFrontais(t, T), ehSIF: ctx.TIPOS_SIF.includes(t) });
const T0 = { kcal: 400, cho: 80, act: 70, acad: 70, ptn: 6, gt: 4, gs: 7, tr: 0, fi: 10, na: 700 };
check(nu('achocolatado', T0).includes('ALTO EM AÇÚCAR ADICIONADO') && nu('achocolatado', T0).includes('ALTO EM GORDURA SATURADA') && nu('achocolatado', T0).includes('ALTO EM SÓDIO') && !nu('achocolatado', T0).includes('S.I.F.'), 'achocolatado: lupa pelos limites e sem selo SIF');
check(nu('leite-integral', T0).includes('PROIBIDA') && !nu('leite-integral', T0).includes('ALTO EM') && nu('leite-integral', T0).includes('S.I.F.'), 'leite em pó: lupa proibida e com selo SIF');
check(nu('suplemento-po', T0).includes('PROIBIDA') && !nu('suplemento-po', T0).includes('100 g</th>') && !nu('suplemento-po', T0).includes('S.I.F.'), 'suplemento: sem coluna 100 g, lupa proibida, sem SIF');
check(nu('espessante', T0).includes('4 g') && nu('espessante', T0).includes('6 g') && nu('espessante', T0).includes('8 g') && !nu('espessante', T0).includes('Proteínas'), 'espessante: colunas 4/6/8 g, só energia e carboidratos');
check(nu('maltodextrina', T0).includes('NÃO SE APLICA') && nu('po-preparo', T0).includes('**No alimento pronto para o consumo'), 'malto sem lupa; pó para preparo com nota "**"');
check(ctx.NUTRI_CFG['leite-integral'].porcao === 26 && ctx.NUTRI_CFG['achocolatado'].porcao === 20 && ctx.NUTRI_CFG['glicose'].porcao === 5, 'porções padrão: leite 26 g · achocolatado 20 g · maltodextrina/glicose 5 g');
check(!/color:#(?!000|fff)/i.test(nu('achocolatado', T0).replace(/ftp-sec-t[^>]*>/g, '')), 'tabela nutricional sem cores (apenas preto)');
console.log('\n' + ok + ' ok, ' + fail + ' falha(s)');
process.exit(fail ? 1 : 0);