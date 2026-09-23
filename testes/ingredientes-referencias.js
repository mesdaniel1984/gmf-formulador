'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const read=s=>JSON.parse(JSON.stringify(vm.runInNewContext(s.match(/const DB=(\[[\s\S]*?\n\]);/)[1])));
const before=read(cp.execFileSync('git',['show','96646b39a1b00709f57626cac469a8c952bac8ff:gmf_formulador_wizard.html'],{encoding:'utf8',maxBuffer:2e6}));
const after=read(fs.readFileSync('gmf_formulador_wizard.html','utf8'));
assert.equal(before.length,after.length);
const expected=[{"n":"Leite de cabra integral","fields":{"kcal":66,"cho":5.2,"ptn":3.1,"gt":3.8,"na":74}},{"n":"Leite de vaca achocolatado","fields":{"kcal":83,"cho":14.2,"ptn":2.1,"gt":2.2,"na":72}},{"n":"Leite integral em pó (LIP)","fields":{"kcal":497,"cho":39.2,"ptn":25.4,"gt":26.9,"na":323}},{"n":"Leite desnatado em pó (LDP)","fields":{"kcal":362,"cho":53,"ptn":34.7,"gt":0.9,"na":432}},{"n":"Queijo minas frescal","fields":{"kcal":264,"cho":3.2,"ptn":17.4,"gt":20.2,"na":31}},{"n":"Queijo mussarela","fields":{"kcal":330,"cho":3,"ptn":22.6,"gt":25.2,"na":581}},{"n":"Queijo parmesão","fields":{"kcal":453,"cho":1.7,"ptn":35.6,"gt":33.5,"na":1844}},{"n":"Queijo prato","fields":{"kcal":360,"cho":1.9,"ptn":22.7,"gt":29.1,"na":580}},{"n":"Requeijão cremoso","fields":{"kcal":257,"cho":2.4,"ptn":9.6,"gt":23.4,"na":558}},{"n":"Queijo minas padrão (meia cura)","fields":{"kcal":321,"cho":3.6,"ptn":21.2,"gt":24.6,"na":501}},{"n":"Queijo ricota","fields":{"kcal":140,"cho":3.8,"ptn":12.6,"gt":8.1,"na":283}},{"n":"Manteiga com sal","fields":{"kcal":726,"cho":0.1,"ptn":0.4,"gt":82.4}},{"n":"Manteiga sem sal","fields":{"kcal":758,"cho":0,"ptn":0.4,"gt":86}},{"n":"Iogurte natural desnatado","fields":{"kcal":41,"cho":5.8,"ptn":3.8,"gt":0.3,"na":60}},{"n":"Leite condensado integral","fields":{"kcal":313,"cho":57,"ptn":7.7,"gt":6.7,"na":94}}];
for(let i=0;i<before.length;i++){
 const e=expected.find(x=>x.n===before[i].n);
 if(!e){assert.deepEqual(after[i],before[i]);continue;}
 for(const [k,v] of Object.entries(e.fields))assert.equal(after[i][k],v);
 for(const k of Object.keys(before[i]))if(!(k in e.fields))assert.deepEqual(after[i][k],before[i][k]);
 assert(after[i].referencia.titulo.includes('Tabela 1'));assert(after[i].referencia.nota.includes('parcial'));
 assert(after[i].act<=after[i].cho,'açúcares totais não podem exceder carboidratos');
}
console.log('73 campos conferidos; alterações limitadas a 15 registros genéricos; demais registros preservados.');
