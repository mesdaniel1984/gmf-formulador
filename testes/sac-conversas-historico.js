// Regressao: mensagens do bot aparecem na caixa de entrada, mesmo quando
// a fila de atendimentos humanos esta vazia.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('conversas.html', 'utf8');
const start = html.indexOf('async function carregarFila(){');
const end = html.indexOf('/* ---------------------------------------------------------------------------\n   Abrir conversa', start);
assert(start > 0 && end > start, 'funcao de listagem encontrada');

const list = [];
const nodes = {
  lista: { innerHTML:'', appendChild(node){ list.push(node); } },
  contador: { textContent:'' }, caixaResposta: { hidden:true }
};
const messages = [
  { telefone:'55001', texto:'Olá', tipo:'texto', direcao:'ENTRADA', criado_em:'2026-09-24T19:10:00Z' },
  { telefone:'55001', texto:'Como posso ajudar?', tipo:'texto', direcao:'SAIDA', criado_em:'2026-09-24T19:11:00Z' },
  { telefone:'55002', texto:'Meu produto', tipo:'texto', direcao:'ENTRADA', criado_em:'2026-09-24T19:12:00Z' }
];
function query(table){
  let situacao = null;
  const q = {
    select(){ return q; }, order(){ return q; }, limit(){ return q; },
    eq(_col, value){ situacao = value; return q; },
    then(resolve){
      const data = table === 'wa_mensagem' ? messages :
        [{ telefone:'55003', nome:'Histórico', situacao:'RESOLVIDO',
           aberto_em:'2026-09-23T10:00:00Z' }].filter(a => !situacao || a.situacao === situacao);
      return Promise.resolve({ data, error:null }).then(resolve);
    }
  };
  return q;
}
const context = vm.createContext({
  est:{ seq:0, encerrada:false, situacaoAba:'TODAS', aberta:null, rascunhos:new Map() },
  sb:{ from:query },
  $:id => nodes[id],
  document:{ createElement(){ return { dataset:{}, setAttribute(){}, innerHTML:'', onclick:null }; } },
  esc:s=>String(s), fone:s=>s, faz:s=>s,
  mostrarResolver(){}, atualizarBotoes(){}
});
vm.runInContext(html.slice(start,end), context);
(async () => {
  await context.carregarFila();
  assert.strictEqual(list.length, 2, 'duas pessoas do bot ficam visíveis');
  assert.match(nodes.contador.textContent, /2 conversas recentes/);
  assert(list.every(n => n.innerHTML.includes('Atendimento automático')),
    'conversas sem fila humana são rotuladas como automáticas');
  list.length = 0;
  context.est.situacaoAba = 'ABERTO';
  await context.carregarFila();
  assert.strictEqual(list.length, 0, 'fila humana vazia permanece fiel ao banco');
  const bStart=html.indexOf('function atualizarBotoes(){');
  const bEnd=html.indexOf('/* ---------------------------------------------------------------------------\n   Fila',bStart);
  const controls={btnAssumir:{},btnEnviar:{},texto:{value:'',disabled:false}};
  const state={aberta:'5531999990000',situacaoAberta:'AUTOMATICO',podeResponder:true,
    ultimaEntrada:new Date().toISOString(),enviando:false,encerrada:false};
  const ctx=vm.createContext({est:state,$:id=>controls[id],Date});
  vm.runInContext(html.slice(bStart,bEnd),ctx);
  ctx.atualizarBotoes();
  assert.equal(controls.btnAssumir.hidden,false,'Qualidade vê opção de assumir conversa automática');
  assert.equal(controls.btnAssumir.disabled,false,'conversa recente pode ser assumida');
  assert.equal(controls.btnEnviar.disabled,true,'não pode enviar sem abrir fila humana');
  state.situacaoAberta='ABERTO';
  controls.texto.value='Bom dia';
  ctx.atualizarBotoes();
  assert.equal(controls.btnAssumir.hidden,true);
  assert.equal(controls.btnEnviar.disabled,false,'após assumir, resposta é habilitada');
  state.ultimaEntrada=new Date(Date.now()-25*3600*1000).toISOString();
  ctx.atualizarBotoes();
  assert.equal(controls.btnEnviar.disabled,true,'fora da janela, resposta é bloqueada');
  console.log('SAC: histórico visível e fila humana separada');
})().catch(err => { console.error(err); process.exitCode=1; });
