const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const src=fs.readFileSync('sgq-fiscalizacoes.js','utf8');
const one=name=>{const start=src.indexOf('async function '+name+'(');const end=src.indexOf('\n}',start)+2;assert(start>=0&&end>start);return src.slice(start,end);};
const calls=[];const fields={fiId:{value:''},fiProcesso:{value:'MAPA 123'},fiData:{value:'2026-09-24'},fiResponsavel:{value:'Qualidade'},
 fiEmpresa:{value:'DMS'},fiOrgao:{value:'MAPA'},fiOrgaoOutro:{value:''},fiPrazo:{value:''},fiSituacao:{value:'Aberta'},fiObs:{value:''},
 fiSalvar:{disabled:false},fiDocumentos:{files:[{name:'termo.pdf',type:'application/pdf',size:100}]}};
const chain={select(){return this;},single:async()=>({data:{id:'12345678-1234-1234-1234-123456789abc'}})};
const db={from(table){return {insert(row){calls.push([table,row]);return table==='fiscalizacoes'?chain:Promise.resolve({error:null});}}},
 storage:{from(bucket){assert.equal(bucket,'fiscalizacoes');return {upload:async(path,file,opts)=>{calls.push(['upload',path,file.name,opts.contentType]);return {error:null};}}}}};
const c={sb:db,fiEl:id=>fields[id],fiVal:id=>fields[id].value.trim(),fiscalPodeEscrever:true,
 fiscalSelecionada:null,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},
 closeModal(){},async fiscalCarregar(){},fiscalErro(e){throw e;},alert(){throw Error('unexpected alert');},Array,console};
vm.createContext(c);vm.runInContext(one('fiscalEnviarArquivo')+'\n'+one('fiscalSalvar'),c);
(async()=>{
 await c.fiscalSalvar();
 assert.equal(c.fiscalSelecionada,'12345678-1234-1234-1234-123456789abc');
 assert.equal(calls[0][0],'fiscalizacoes');
 assert.equal(calls[1][1],'fiscalizacoes/12345678-1234-1234-1234-123456789abc/00000000-0000-4000-8000-000000000001.pdf');
 assert.equal(calls[2][0],'fiscalizacao_documentos');
 assert.equal(calls[2][1].nome,'termo.pdf');
 console.log('Anexo fiscal: cadastro inicial envia ao bucket privado e registra o documento.');
})().catch(e=>{console.error(e);process.exitCode=1;});
