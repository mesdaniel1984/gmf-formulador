/**
 * Teste — Central de Gestao da Qualidade
 *
 * A regra desta tela: todo numero sai de dado que existe, e indicador sem fonte
 * nao vira zero — vai para o bloco "o que esta tela ainda nao mostra", com o
 * motivo. Um painel todo verde sobre tabela vazia mente para quem olha rapido,
 * e foi exatamente isso que o painel anterior fazia (cinco de seis KPIs saiam
 * de tabela que nunca recebeu registro).
 *
 *   node testes/central-gestao.js
 */
const { chromium } = require('playwright');
const path = require('path');
const alvo = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '..', 'sistema_qualidade_online.html');
const FILE = 'file://' + alvo;

const STUB = `
window.__T = {
  session: { user: { email: 'teste@mfparis.com.br' } },
  upsertFails: false,
  upserts: 0,
  rows: [
    { key:'__seeded', data:true }, { key:'sac', data:[] }, { key:'ncs', data:[] },
    { key:'docs', data:[] }, { key:'indicadores', data:[] }, { key:'fornecedores', data:[] },
    { key:'analises', data:[] }, { key:'licencas', data:[] }, { key:'treinamentos', data:[] },
    { key:'planoacao', data:[] }, { key:'cloro', data:[] }, { key:'analPlanos', data:[] },
    { key:'analPlanosV', data:1 }
  ]
};
const mk = () => ({
  auth: {
    getSession: async () => ({ data: { session: window.__T.session }, error: null }),
    getUser:    async () => ({ data: { user: window.__T.session ? window.__T.session.user : null }, error: null }),
    signInWithPassword: async () => { window.__T.session = { user:{ email:'teste@mfparis.com.br' } }; window.__T.upsertFails = false; return { error: null }; },
    signOut:    async () => { window.__T.session = null; return { error: null }; },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
  },
  from: () => ({
    select: async () => ({ data: JSON.parse(JSON.stringify(window.__T.rows)), error: null }),
    upsert: async (rows) => {
      if (window.__T.upsertFails) return { error: { message: 'JWT expired', code: 'PGRST301' } };
      window.__T.upserts++;
      (rows||[]).forEach(r => { const i = window.__T.rows.findIndex(x => x.key === r.key);
        const copia = JSON.parse(JSON.stringify(r.data)); if (i >= 0) window.__T.rows[i] = { key:r.key, data:copia }; else window.__T.rows.push({ key:r.key, data:copia }); });
      return { error: null };
    }
  }),
  channel: () => ({ on(){ return this; }, subscribe(){ return this; } })
});
window.Chart = function(){ this.destroy=function(){}; this.update=function(){}; this.data={datasets:[]}; this.options={}; };
window.Chart.register = function(){}; window.Chart.getChart = function(){ return null; };
window.XLSX = { utils:{ book_new:()=>({}), json_to_sheet:()=>({}), book_append_sheet:()=>{}, aoa_to_sheet:()=>({}) }, writeFile:()=>{} };
window.jspdf = { jsPDF: function(){ this.text=()=>{}; this.save=()=>{}; this.addPage=()=>{}; this.setFontSize=()=>{}; } };
window.supabase = { createClient: mk };
Object.defineProperty(window, 'supabase', { value: { createClient: mk }, writable: false, configurable: false });
`;

const dias = n => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
  await p.route('**/@supabase/supabase-js**', r => r.abort());
  await p.addInitScript(STUB);
  await p.goto(FILE);
  await p.waitForTimeout(2500);

  let falhas = 0;
  const check = (ok, txt) => { console.log((ok ? '  ok    ' : '  FALHA ') + txt); if (!ok) falhas++; };

  console.log('Tela vazia — o que ela diz quando nao ha dado');
  const vazia = await p.evaluate(() => {
    db.docs=[]; db.licencas=[]; db.treinamentos=[]; db.ncs=[]; db.sac=[]; db.planoacao=[]; db.fornecedores=[];
    renderCentral();
    return {
      cards: document.querySelectorAll('#centralCards .c-tile').length,
      zeros: Array.from(document.querySelectorAll('#centralCards .c-val')).every(e => e.textContent==='0'),
      acoes: document.getElementById('centralAcoes').textContent,
      etapas: document.getElementById('centralEtapas').textContent,
      perdas: document.getElementById('centralPerdas').textContent,
      falta: document.querySelectorAll('#centralFalta > div').length
    };
  });
  check(vazia.cards === 6, 'seis cartoes de saude (deu ' + vazia.cards + ')');
  check(/Nada vencendo/.test(vazia.acoes), 'a Central de Acao diz que nao ha nada vencendo, em vez de ficar em branco');
  check(/Nenhuma NC ou reclama/.test(vazia.etapas), 'o grafico de etapa diz que nao ha registro, em vez de desenhar nada');
  check(/Nenhuma perda registrada/.test(vazia.perdas), 'perdas explica que os campos existem e estao zerados');
  check(vazia.falta === 6, 'o bloco "o que ainda nao mostra" lista os 6 itens sem fonte (deu ' + vazia.falta + ')');

  console.log('\nCom dado real');
  const cheia = await p.evaluate((d) => {
    db.docs = [
      {id:'d1',codigo:'POP-01',titulo:'Higienizacao',proxRev:d.menos10,status:'Vigente',responsavel:'Izadora'},
      {id:'d2',codigo:'POP-02',titulo:'Envase',proxRev:d.mais200,status:'Vigente',responsavel:'Izadora'}
    ];
    db.licencas = [
      {id:'l1',doc:'Alvara Sanitario',empresa:'DMS',orgao:'Vigilancia',venc:d.menos30},
      {id:'l2',doc:'Licenca Ambiental',empresa:'MFParis',orgao:'Feam',venc:d.mais40},
      {id:'l3',doc:'SIF',empresa:'DMS',orgao:'MAPA',venc:d.mais400}
    ];
    db.treinamentos = [
      {id:'t1',tema:'BPF',pop:'POP-01',empresa:'DMS',status:'Concluído'},
      {id:'t2',tema:'APPCC',pop:'POP-02',empresa:'DMS',status:'Pendente'}
    ];
    db.ncs = [
      {id:'n1',num:'NC-001',status:'Aberta',etapa:'Envase e embalagem',prazo:d.mais3,resp:'Producao',
       qtdReprocesso:120,qtdDescarte:45.5,qtdPerdaEmb:300},
      {id:'n2',num:'NC-002',status:'Aberta',etapa:'A apurar',prazo:d.mais20,resp:'Izadora'},
      {id:'n3',num:'NC-003',status:'Fechada',etapa:'Processo / produção'}
    ];
    db.sac = [
      {id:'s1',num:'SAC-001',status:'Aberta',etapa:'Manuseio no cliente',prazo:d.menos2,resp:'Comercial',fornecedor:''},
      {id:'s2',num:'SAC-002',status:'Encerrada',etapa:'Recebimento de MP',fornecedor:'Fornecedor Alfa'},
      {id:'s3',num:'SAC-003',status:'Em tratativa',etapa:'Recebimento de MP',prazo:d.mais30,fornecedor:'Fornecedor Alfa'}
    ];
    db.planoacao = [{id:'p1',origem:'Auditoria',oque:'Refazer POP',quem:'Izadora',prazo:d.menos5,status:'Em andamento'}];
    db.fornecedores = [{id:'f1'},{id:'f2'},{id:'f3'}];
    renderCentral();

    const nums = Array.from(document.querySelectorAll('#centralCards .c-tile')).map(c => ({
      lbl: c.querySelector('.c-cap').textContent, n: c.querySelector('.c-val').textContent }));
    const rec = Array.from(document.querySelectorAll('#centralRec .c-rec')).map(r => r.textContent);
    const linhas = Array.from(document.querySelectorAll('#centralAcoes tr'));
    return {
      nums,
      qtdAcoes: linhas.length,
      primeira: linhas.length ? linhas[0].textContent : '',
      criticos: document.querySelectorAll('#centralAcoes .c-chip.crit').length,
      classificar: document.querySelectorAll('#centralAcoes .c-chip.alto').length,
      etapas: document.getElementById('centralEtapas').textContent,
      perdas: document.getElementById('centralPerdas').textContent,
      forn: document.getElementById('centralForn').textContent,
      rec: rec
    };
  }, {menos30:dias(-30),menos10:dias(-10),menos5:dias(-5),menos2:dias(-2),
      mais3:dias(3),mais20:dias(20),mais30:dias(30),mais40:dias(40),mais200:dias(200),mais400:dias(400)});

  const card = t => (cheia.nums.find(x => x.lbl.toUpperCase().indexOf(t.toUpperCase()) > -1)||{}).n;
  check(card('NÃO CONFORMIDADES') === '2', 'NCs em aberto conta 2 e ignora a fechada (deu ' + card('NÃO CONFORMIDADES') + ')');
  check(card('RECLAMAÇÕES') === '2', 'reclamacoes em aberto conta 2 e ignora a encerrada (deu ' + card('RECLAMAÇÕES') + ')');
  check(card('RISCO REGULATÓRIO') === '2', 'risco regulatorio soma licenca vencida + documento vencido (deu ' + card('RISCO REGULATÓRIO') + ')');
  check(card('VENCENDO') === '1', 'vencendo em 60d conta a licenca de 40 dias (deu ' + card('VENCENDO') + ')');
  check(card('SEM ANÁLISE') === '1', 'registro sem etapa da falha conta 1 (deu ' + card('SEM ANÁLISE') + ')');
  check(card('AÇÕES ATRASADAS') === '1', 'acao atrasada conta 1 (deu ' + card('AÇÕES ATRASADAS') + ')');

  check(cheia.qtdAcoes >= 6, 'a Central de Acao juntou itens de licenca, documento, plano, NC e SAC (' + cheia.qtdAcoes + ' linhas)');
  check(/Alvara Sanitario|Alvará/.test(cheia.primeira), 'o mais vencido aparece primeiro — a licenca de 30 dias atras');
  check(cheia.criticos >= 3, 'os vencidos vem marcados como Agir agora (' + cheia.criticos + ')');
  check(cheia.classificar >= 1, 'o registro sem etapa recebe chip proprio de Classificar, nao Agir agora');
  check(cheia.rec.length >= 3, 'a tela escreve o que fazer na semana, em ordem (' + cheia.rec.length + ' recomendacoes)');
  check(/licen/i.test(cheia.rec[0]||''), 'a licenca vencida e a primeira recomendacao — e a unica que pode parar a fabrica');

  check(/Recebimento de MP/.test(cheia.etapas) && /A apurar/.test(cheia.etapas),
        'o grafico de etapa mostra as etapas reais e separa "A apurar"');
  check(/45,5/.test(cheia.perdas) || /45.5/.test(cheia.perdas), 'descarte soma 45,5 kg (leu: ' + cheia.perdas.slice(0,40) + ')');
  check(/pre[çc]o por (kg|quilo)/i.test(cheia.perdas), 'perdas explica que falta o preco para virar reais');
  check(/Fornecedor Alfa/.test(cheia.forn), 'fornecedor com ocorrencia aparece — campo novo do SAC');
  check(/de 3 cadastrados/.test(cheia.forn), 'mostra as ocorrencias contra o total de 3 fornecedores cadastrados');

  console.log('\nA regra da tela');
  // Verifica o CONCEITO, nao a frase: texto de tela muda, a regra nao.
  const regra = await p.evaluate(() => {
    const linhas = Array.from(document.querySelectorAll('#centralFalta > div'));
    return {
      total: linhas.length,
      todasComMotivo: linhas.every(l => l.textContent.indexOf('·') > -1 && l.textContent.length > 40),
      temas: {
        producao:  linhas.some(l => /rondas/i.test(l.textContent)),
        custo:     linhas.some(l => /custo/i.test(l.textContent)),
        umidade:   linhas.some(l => /umidade/i.test(l.textContent)),
        processo:  linhas.some(l => /FPY|yield/i.test(l.textContent)),
        resposta:  linhas.some(l => /resposta/i.test(l.textContent)),
        fornecedor:linhas.some(l => /fornecedor/i.test(l.textContent))
      }
    };
  });
  check(regra.total === 6, 'os seis indicadores sem fonte estao listados (deu ' + regra.total + ')');
  check(regra.todasComMotivo, 'nenhum aparece so com o nome — todos vem com o motivo de nao estarem la');
  check(Object.keys(regra.temas).every(k => regra.temas[k]),
        'producao, custo, umidade, processo, tempo de resposta e fornecedor: todos nomeados ('
        + JSON.stringify(regra.temas) + ')');

  console.log('\nerros de pagina:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas++;
  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + falhas + ' VERIFICACAO(OES) FALHARAM');
  await b.close();
  process.exit(falhas === 0 ? 0 : 1);
})();
