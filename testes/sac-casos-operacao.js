// Integração da fila por protocolo no navegador. Não grava dados reais.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const raiz=path.join(__dirname,'..');
const id1='11111111-1111-4111-8111-111111111111';
const id2='22222222-2222-4222-8222-222222222222';
const mesmoFone='5531999990000';
const foto='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9wiW8AAAAASUVORK5CYII=';
const entradas=[
  {id:id1,protocolo:'ATD-2026-0001',nome:'Primeiro',contato:mesmoFone,
    produto:'Leite',lote:'L001',relato:'Embalagem danificada',fotos:[{de:'problema',data:foto}],
    tipo:'RECLAMACAO',assunto:'qualidade',criado_em:'2026-09-21T12:00:00Z',prioridade:false},
  {id:id2,protocolo:'ATD-2026-0002',nome:'Segundo',contato:mesmoFone,
    produto:'Café',lote:'C002',relato:'Entrega atrasada',fotos:[],
    tipo:'LOGISTICA',assunto:'entrega',criado_em:'2026-09-22T12:00:00Z',prioridade:false}
];
const sdk=`
window.__salvos=[];
const entradas=${JSON.stringify(entradas)};
let tratativas=[];
function tabela(nome){
  const f={nome,id:null,acao:'select',registro:null};
  const q={
    select(){return q},eq(k,v){if(k==='id'||k==='caso_id')f.id=v;return q},
    order(){return q},limit(){return q},
    single(){return consultar(true)},
    insert(v){f.acao='insert';f.registro=v;return q},
    update(v){f.acao='update';f.registro=v;return q},
    then(ok,fail){return consultar(false).then(ok,fail)}
  };
  async function consultar(unico){
    if(nome==='wa_atendimento'||nome==='wa_mensagem'||nome==='wa_triagem')
      return {data:unico?null:[],error:null};
    if(f.acao==='insert'||f.acao==='update'){
      const existente=tratativas.findIndex(t=>t.caso_id===(f.id||f.registro.caso_id));
      const linha={...(tratativas[existente]||{}),...f.registro};
      if(existente>=0)tratativas[existente]=linha;else tratativas.push(linha);
      window.__salvos.push(linha);return {data:unico?linha:[linha],error:null};
    }
    const dados=nome==='sac_entrada'?entradas:tratativas;
    const selecionados=f.id?dados.filter(v=>(v.id||v.caso_id)===f.id):dados;
    return {data:unico?selecionados[0]||null:selecionados,error:null};
  }
  return q;
}
window.supabase={createClient(){return {
  auth:{getSession:async()=>({data:{session:{access_token:'teste',user:{id:'33333333-3333-4333-8333-333333333333',email:'qualidade@mfparis.com.br'}}}}),
    onAuthStateChange:()=>({data:{subscription:{}}})},
  from:tabela
}}};`;
async function main(){
 const servidor=http.createServer((req,res)=>{
  if(req.url==='/conversas.html'){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end(fs.readFileSync(path.join(raiz,'conversas.html')));
  }else{res.writeHead(404);res.end()}
 });
 await new Promise(resolve=>servidor.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.route('**/fonts.googleapis.com/**',r=>r.abort());
  await page.route('**/fonts.gstatic.com/**',r=>r.abort());
  await page.route('**supabase-js@2**',r=>r.fulfill({status:200,contentType:'application/javascript',body:sdk}));
  await page.route('**/atendimento/eu',r=>r.fulfill({status:200,contentType:'application/json',body:'{"papel":"ATENDENTE","podeResponder":true}'}));
  await page.goto('http://127.0.0.1:'+servidor.address().port+'/conversas.html');
  await page.getByRole('button',{name:/Casos SAC/}).click();
  await page.getByText('2 casos pendentes').waitFor();
  if(await page.locator('#casosLista button').count()!==2)throw Error('mesmo telefone perdeu um protocolo');
  await page.getByRole('button',{name:/ATD-2026-0001/}).click();
  await page.getByAltText('Evidência 1 do protocolo ATD-2026-0001').waitFor();
  await page.locator('#casoArea').selectOption('QUALIDADE');
  await page.locator('#casoResponsavel').fill('Analista de Qualidade');
  await page.locator('#casoPrazo').fill('2026-09-26');
  await page.locator('#casoResumo').fill('Conferir lote e embalagem, registrar evidência.');
  await page.locator('#casoNC').selectOption('NECESSARIA');
  await page.locator('#casoSituacao').selectOption('CONCLUIDO');
  await page.locator('#casoSalvar').click();
  await page.getByText(/Para concluir, registre o retorno/).waitFor();
  if(await page.evaluate(()=>window.__salvos.length))throw Error('conclusão prematura foi gravada');
  await page.locator('#casoSituacao').selectOption('ENCAMINHADO');
  await page.locator('#casoSalvar').click();
  await page.getByRole('button',{name:/Abrir NC deste protocolo/}).waitFor();
  const salvos=await page.evaluate(()=>window.__salvos);
  if(salvos.length!==1||salvos[0].caso_id!==id1||salvos[0].area!=='QUALIDADE')throw Error('encaminhamento sem vínculo ao primeiro protocolo');
  await page.getByRole('button',{name:/ATD-2026-0002/}).click();
  await page.getByRole('heading',{name:'ATD-2026-0002'}).waitFor();
  if(await page.locator('#casoArea').inputValue())throw Error('segundo protocolo herdou a área do primeiro');
  console.log('SAC casos: protocolos distintos, fotos, prazo, conclusão bloqueada e NC por caso: OK');
 }finally{await browser.close();await new Promise(resolve=>servidor.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
