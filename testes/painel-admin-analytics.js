'use strict';
const assert=require('node:assert/strict');
const {day}=require('../painel-admin');
const {build,median,offset}=require('../painel-admin-analytics');
const rows=[
 {id:'1',titulo:'A',data:'2026-09-21',status:'Aberta',prazo:'2026-09-22',responsavel:'Equipe A'},
 {id:'2',titulo:'A',data:'2026-09-22',status:'Fechada',prazo:'2026-09-20'},
 {id:'3',titulo:'B',data:'2026-09-23',status:'Aberta',prazo:null},
 {id:'4',titulo:'C',data:'2026-09-20',status:'Fechada'},
 {id:'5',titulo:'D',data:null,status:'Aberta',prazo:'2026-10-01'},
 {id:'6',titulo:'E',data:'2026-09-25',status:'Aberta',prazo:null},
 {id:'7',titulo:'F',data:'2026-09-22',status:'desconhecido'},
];
const data={fontes:{ncs:{registros:rows},sac:{registros:[]}}};
const opt={source:'ncs',from:'2026-09-21',to:'2026-09-23',today:'2026-09-23'};
const a=build(data,opt,day);
assert.equal(a.cohort.length,4);
assert.equal(a.closed.length,1);
assert.equal(a.known.length,3);
assert.equal(a.closure,100/3);
assert.equal(a.open.length,4,'current backlog ignores event filter');
assert.equal(a.overdue.length,1);assert.equal(a.withDue.length,2);assert.equal(a.withoutDue,2);assert.equal(a.lateRate,50);
assert.equal(a.medianAge,1);assert.equal(a.unknownAge,2);assert.equal(a.futureDate,1);assert.equal(a.missingDate,1);assert.equal(a.unknownStatus,1);
assert.equal(a.comparison.previousFrom,'2026-09-18');assert.equal(a.comparison.previousTo,'2026-09-20');assert.equal(a.comparison.previous,1);assert.equal(a.comparison.pct,300);
assert.equal(a.trend.reduce((n,b)=>n+b.rows.length,0),4);assert.equal(new Set(a.trend.flatMap(b=>b.rows.map(r=>r.id))).size,4,'trend intervals do not overlap');
assert.equal(a.pareto[0].label,'A');assert.equal(a.pareto[0].share,50);assert.equal(a.pareto.at(-1).cumulative,100);
assert.equal(a.owners[0].name,'Equipe A');assert.equal(a.owners[0].overdue,1);
const empty=build(data,{...opt,source:'sac'},day);assert.equal(empty.available,true);assert.equal(empty.closure,null);assert.equal(empty.lateRate,null);assert.equal(empty.medianAge,null);assert.equal(empty.comparison.pct,null);
assert.equal(build({fontes:{}},opt,day).available,false);
assert.equal(build(data,{...opt,to:'2026-09-25'},day).comparison,null,'future periods must not compare as complete');
assert.equal(build(data,{...opt,from:'',to:''},day).comparison,null);
assert.equal(offset('2024-03-01',-1),'2024-02-29');assert.equal(median([90,2,4,3]),3.5);
const many=Array.from({length:8},(_,i)=>({id:String(i),titulo:'Produto '+i,data:'2026-09-22',status:'Aberta'}));
const grouped=build({fontes:{ncs:{registros:many}}},opt,day);assert.equal(grouped.pareto.length,6);assert.equal(grouped.pareto.at(-1).rows.length,3);assert.equal(grouped.pareto.at(-1).cumulative,100);
assert.equal(grouped.withDue.length,0);assert.equal(grouped.lateRate,null);assert.equal(grouped.withoutDue,8);
console.log('Análise executiva: denominadores, períodos iguais, mediana, fonte ausente, datas futuras, Pareto e intervalos sem duplicidade passaram.');

const {signal}=require('../painel-admin-analytics');
const baseSignal={available:true,overdue:[],withoutDue:0,unknownStatus:0,missingDate:0,futureDate:0,rows:[{}]};
assert.equal(signal({available:false}).tone,'muted');
assert.equal(signal({...baseSignal,rows:[]}).tone,'muted');
assert.equal(signal({...baseSignal,withoutDue:2}).tone,'warning');
for(const key of ['unknownStatus','missingDate','futureDate'])assert.equal(signal({...baseSignal,[key]:1}).tone,'muted');
assert.equal(signal({...baseSignal,overdue:[{}],withoutDue:2}).tone,'danger');
assert.equal(signal(baseSignal).tone,'success');
console.log('Cores: atraso, prazo ausente, dados incompletos e fonte vazia validados.');
