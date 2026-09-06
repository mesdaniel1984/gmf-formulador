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
      cards: document.querySelectorAll('#cKpis .x-kpi').length,
      zeros: Array.from(document.querySelectorAll('#cKpis .k-val')).every(e => e.textContent==='0'),
      acoes: document.getElementById('cAcao').textContent,
      etapas: document.getElementById('cFalhas').textContent,
      perdas: document.getElementById('cPerdas').textContent,
      falta: document.getElementById('cRoad').textContent
    };
  });
  check(vazia.cards === 4, 'quatro KPIs, nao seis (deu ' + vazia.cards + ')');
  check(/Nada vencido/.test(vazia.acoes), 'a Central de Acao diz que nao ha nada vencido, em vez de ficar em branco');
  check(/Nenhum registro no per/.test(vazia.etapas), 'o grafico de etapa diz que nao ha registro, em vez de desenhar nada');
  check(/Nenhuma perda registrada/.test(vazia.perdas), 'perdas explica que os campos existem e estao zerados');
  check(/6 indicadores ainda sem fonte/.test(vazia.falta), 'o roadmap resume os 6 indicadores sem fonte num card so');

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

    const nums = Array.from(document.querySelectorAll('#cKpis .x-kpi')).map(c => ({
      lbl: c.querySelector('.k-cap').textContent, n: c.querySelector('.k-val').textContent,
      sub: c.querySelector('.k-sub').textContent }));
    const rec = [];
    const linhas = Array.from(document.querySelectorAll('#cAcao .x-acao'));
    return {
      nums,
      qtdAcoes: linhas.length,
      primeira: linhas.length ? linhas[0].textContent : '',
      nota: document.getElementById('cAcaoNota').textContent,
      sac: document.getElementById('cSac').textContent,
      nc: document.getElementById('cNc').textContent,
      conf: document.getElementById('cConf').textContent,
      etapas: document.getElementById('cFalhas').textContent,
      perdas: document.getElementById('cPerdas').textContent,
      forn: document.getElementById('cForn').textContent,
      rec: rec
    };
  }, {menos30:dias(-30),menos10:dias(-10),menos5:dias(-5),menos2:dias(-2),
      mais3:dias(3),mais20:dias(20),mais30:dias(30),mais40:dias(40),mais200:dias(200),mais400:dias(400)});

  const card = t => (cheia.nums.find(x => x.lbl.toUpperCase().indexOf(t.toUpperCase()) > -1)||{});
  check(card('RISCO CRÍTICO').n === '2', 'risco critico = licenca vencida + documento vencido (deu ' + card('RISCO CRÍTICO').n + ')');
  check(card('SAC ABERTOS').n === '2', 'SAC abertos conta 2 e ignora a encerrada (deu ' + card('SAC ABERTOS').n + ')');
  check(card('NC ABERTAS').n === '2', 'NC abertas conta 2 e ignora a fechada (deu ' + card('NC ABERTAS').n + ')');
  check(card('AÇÕES ATRASADAS').n === '1', 'acao atrasada conta 1 (deu ' + card('AÇÕES ATRASADAS').n + ')');
  check(/maior atraso: 5 dias/.test(card('AÇÕES ATRASADAS').sub||''), 'o KPI diz o maior atraso, nao so a contagem');
  check(/resposta vencida/.test(card('SAC ABERTOS').sub||''), 'o KPI avisa que ha resposta vencida — verde ao lado disso seria mentira em cor');
  check(/1 sem análise/.test(card('NC ABERTAS').sub||''), 'o KPI de NC diz quantas estao sem analise');

  check(cheia.qtdAcoes >= 4, 'a Central de Acao junta licenca, documento, plano, NC e SAC (' + cheia.qtdAcoes + ' itens)');
  check(/Alvara|Alvará/.test(cheia.primeira), 'o mais critico aparece primeiro — a licenca vencida ha 30 dias');
  check(/ABRIR|ANALISAR|CLASSIFICAR/.test(cheia.primeira), 'cada item tem botao de acao, nao so texto');
  check(/para agir agora/.test(cheia.nota), 'o cabecalho conta quantos sao para agir agora (' + cheia.nota + ')');

  check(/aguardando análise da Qualidade/.test(cheia.sac), 'o painel de SAC separa quem espera analise de quem espera resposta');
  check(/ainda medindo/.test(cheia.sac), 'tempo medio de resposta aparece como "ainda medindo", nao como numero inventado');
  check(/sem tipo informado/.test(cheia.nc) || /internas/.test(cheia.nc), 'a quebra da NC fecha com o total de abertas');
  check(/2 vencidos/.test(cheia.conf), 'conformidade resume os vencidos em vez de so mostrar percentual');

  check(/Recebimento de MP/.test(cheia.etapas) && /33%/.test(cheia.etapas),
        'onde as falhas ocorrem mostra quantidade e percentual');
  check(/45,5/.test(cheia.perdas), 'descarte soma 45,5 kg');
  check(/165,5 kg/.test(cheia.perdas), 'o total em peso soma so kg — embalagem e unidade e fica de fora');
  check(/pre[çc]o por (kg|quilo)/i.test(cheia.perdas), 'perdas explica que falta o preco para virar reais');
  check(/Fornecedor Alfa/.test(cheia.forn) && /Ocorr/.test(cheia.forn), 'fornecedores viram ranking com contagem');

  console.log('\nA regra da tela');
  const regra = await p.evaluate(() => {
    const card = document.getElementById('cRoad');
    const antes = card.textContent;
    _cToggleRoad();
    const depois = document.getElementById('cRoad').textContent;
    _cToggleRoad();
    return { compacto: antes.length < 120, itens: (depois.match(/—/g)||[]).length,
             temMotivo: /rondas/.test(depois) && /pre[çc]o/.test(depois) && /umidade/.test(depois) };
  });
  check(regra.compacto, 'o bloco de indicadores sem fonte sai do corpo e vira um card compacto');
  check(regra.itens >= 6, 'ao abrir o roadmap, os seis indicadores aparecem com o motivo (' + regra.itens + ')');
  check(regra.temMotivo, 'cada um continua vindo com o motivo de nao ter fonte');

  console.log('\nerros de pagina:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas++;
  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + falhas + ' VERIFICACAO(OES) FALHARAM');
  await b.close();
  process.exit(falhas === 0 ? 0 : 1);
})();
