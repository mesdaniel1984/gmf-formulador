/**
 * Teste de regressao — B4 e B6
 *
 * B4: campo "etapa da falha" no SAC e na NC, com a lista fechada com a direcao em
 *     06/09/2026. Regra acordada: nao bloqueia REGISTRAR, bloqueia ENCERRAR — um
 *     SAC que fecha em "A apurar" e um SAC que nunca respondeu onde a falha ocorreu.
 *     Campo de fornecedor separado da etapa, para contar NC por fornecedor sem
 *     misturar com o lugar da falha.
 * B6: vinculo SAC <-> NC nos dois sentidos. Antes o parentesco existia so na cabeca
 *     de quem abriu. Um SAC aponta para no maximo uma NC e vice-versa, e trocar o
 *     vinculo limpa o antigo dos dois lados.
 *
 *   node testes/b4b6-etapa-e-vinculo.js
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

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
  await p.route('**/@supabase/supabase-js**', r => r.abort());
  await p.addInitScript(STUB);
  await p.addInitScript(`
    window.__avisos = [];
    window.alert = m => { window.__avisos.push(String(m)); };
    window.confirm = () => true;
  `);
  await p.goto(FILE);
  await p.waitForTimeout(2500);

  let falhas = 0;
  const check = (ok, txt) => { console.log((ok ? '  ok    ' : '  FALHA ') + txt); if (!ok) falhas++; };

  console.log('B4 — a lista de etapas');
  const lista = await p.evaluate(() => ({
    total: ETAPAS_FALHA.length,
    primeira: ETAPAS_FALHA[0],
    temFicha: ETAPAS_FALHA.indexOf('Ficha t\u00e9cnica / especifica\u00e7\u00e3o') > -1,
    temRotulagem: ETAPAS_FALHA.indexOf('Rotulagem e cadastro') > -1,
    donosSemDono: ETAPAS_FALHA.filter(e => e !== 'A apurar' && !ETAPA_DONO[e]),
    campoSAC: !!document.getElementById('sEtapa'),
    campoNC: !!document.getElementById('ncEtapa'),
    campoForn: !!document.getElementById('sFornecedor')
  }));
  check(lista.total === 10, '10 opcoes: 9 etapas + "A apurar" (deu ' + lista.total + ')');
  check(lista.primeira === 'A apurar', 'a primeira opcao e "A apurar" (deu "' + lista.primeira + '")');
  check(lista.temFicha, 'existe "Ficha tecnica / especificacao", separada de producao');
  check(lista.temRotulagem, 'existe "Rotulagem e cadastro", separada de envase');
  check(lista.donosSemDono.length === 0, 'toda etapa tem dono (sem dono: ' + JSON.stringify(lista.donosSemDono) + ')');
  check(lista.campoSAC && lista.campoNC, 'o campo existe no SAC e na NC');
  check(lista.campoForn, 'o campo de fornecedor existe, separado da etapa');

  console.log('\nB4 — valor inicial e gravacao');
  const inicial = await p.evaluate(() => {
    db.sac = []; db.ncs = [];
    openSACModal(null);
    return { etapa: document.getElementById('sEtapa').value,
             opcoes: document.getElementById('sEtapa').options.length };
  });
  check(inicial.etapa === 'A apurar', 'SAC novo nasce em "A apurar" (nasceu "' + inicial.etapa + '")');
  check(inicial.opcoes === 10, 'o select foi preenchido com as 10 opcoes (deu ' + inicial.opcoes + ')');

  const gravou = await p.evaluate(() => {
    document.getElementById('sData').value = '2026-09-06';
    document.getElementById('sCliente').value = 'Cliente Teste';
    document.getElementById('sProd').value = 'Leite em Po';
    document.getElementById('sLote').value = 'L0424-10';
    document.getElementById('sDesc').value = 'Produto empedrado';
    document.getElementById('sEtapa').value = 'Recebimento de MP';
    document.getElementById('sFornecedor').value = 'Fornecedor Alfa';
    saveSAC();
    const s = db.sac[db.sac.length - 1];
    return { etapa: s.etapa, fornecedor: s.fornecedor, num: s.num, id: s.id };
  });
  check(gravou.etapa === 'Recebimento de MP', 'a etapa e gravada (gravou "' + gravou.etapa + '")');
  check(gravou.fornecedor === 'Fornecedor Alfa', 'o fornecedor e gravado em campo proprio (gravou "' + gravou.fornecedor + '")');

  const reabriu = await p.evaluate(() => {
    editSAC(db.sac[db.sac.length - 1].id);
    return { etapa: document.getElementById('sEtapa').value,
             forn: document.getElementById('sFornecedor').value };
  });
  check(reabriu.etapa === 'Recebimento de MP', 'ao reabrir, a etapa continua (leu "' + reabriu.etapa + '")');
  check(reabriu.forn === 'Fornecedor Alfa', 'ao reabrir, o fornecedor continua (leu "' + reabriu.forn + '")');

  console.log('\nB4 — a regra que importa: nao bloqueia registrar, bloqueia encerrar');
  const bloqueio = await p.evaluate(() => {
    window.__avisos = [];
    db.sac = []; db.ncs = [];
    openSACModal(null);
    document.getElementById('sDesc').value = 'Sem etapa ainda';
    saveSAC();                                   // registra em "A apurar"
    const registrou = db.sac.length === 1 && db.sac[0].etapa === 'A apurar';

    editSAC(db.sac[0].id);
    document.getElementById('sStatus').value = 'Encerrada';
    saveSAC();                                   // deve recusar
    const recusou = db.sac[0].status !== 'Encerrada' && window.__avisos.length === 1;

    document.getElementById('sEtapa').value = 'Manuseio no cliente';
    saveSAC();                                   // agora aceita
    const aceitou = db.sac[0].status === 'Encerrada' && db.sac[0].etapa === 'Manuseio no cliente';
    return { registrou, recusou, aceitou, aviso: window.__avisos[0] || '' };
  });
  check(bloqueio.registrou, 'registra normalmente com a etapa em "A apurar"');
  check(bloqueio.recusou, 'RECUSA encerrar enquanto a etapa for "A apurar"');
  check(/A apurar/.test(bloqueio.aviso), 'o aviso explica o motivo (disse: "' + bloqueio.aviso + '")');
  check(bloqueio.aceitou, 'encerra depois que a etapa e informada');

  const bloqNC = await p.evaluate(() => {
    window.__avisos = [];
    db.ncs = [];
    openNCModal(null);
    document.getElementById('ncDesc').value = 'NC sem etapa';
    document.getElementById('ncStatusI').value = 'Fechada';
    saveNC();
    const recusou = db.ncs.length === 0 && window.__avisos.length === 1;
    document.getElementById('ncEtapa').value = 'Processo / produ\u00e7\u00e3o';
    saveNC();
    return { recusou, gravou: db.ncs.length === 1, etapa: db.ncs[0] && db.ncs[0].etapa };
  });
  check(bloqNC.recusou, 'a NC tambem recusa fechar em "A apurar"');
  check(bloqNC.gravou && bloqNC.etapa === 'Processo / produ\u00e7\u00e3o', 'a NC fecha depois que a etapa e informada');

  console.log('\nB6 — vinculo nos dois sentidos');
  const vinc = await p.evaluate(() => {
    db.sac = []; db.ncs = [];
    // duas NCs e um SAC
    openNCModal(null); document.getElementById('ncDesc').value='NC um'; saveNC();
    openNCModal(null); document.getElementById('ncDesc').value='NC dois'; saveNC();
    const nc1 = db.ncs[0].id, nc2 = db.ncs[1].id;

    openSACModal(null);
    document.getElementById('sDesc').value = 'SAC vinculado';
    document.getElementById('sNcId').value = nc1;
    saveSAC();
    const sacId = db.sac[0].id;
    const ida  = db.sac[0].ncId === nc1;
    const volta = db.ncs.filter(n=>n.id===nc1)[0].sacId === sacId;

    // troca o vinculo para a outra NC
    editSAC(sacId);
    document.getElementById('sNcId').value = nc2;
    saveSAC();
    const trocou   = db.sac[0].ncId === nc2 && db.ncs.filter(n=>n.id===nc2)[0].sacId === sacId;
    const limpouNC1 = db.ncs.filter(n=>n.id===nc1)[0].sacId === '';

    // desfaz o vinculo
    editSAC(sacId);
    document.getElementById('sNcId').value = '';
    saveSAC();
    const desfez = db.sac[0].ncId === '' && db.ncs.filter(n=>n.id===nc2)[0].sacId === '';

    return { ida, volta, trocou, limpouNC1, desfez, sacId, nc1, nc2 };
  });
  check(vinc.ida, 'o SAC guarda a NC escolhida');
  check(vinc.volta, 'a NC passa a apontar de volta para o SAC — o outro sentido');
  check(vinc.trocou, 'trocar a NC atualiza os dois lados');
  check(vinc.limpouNC1, 'a NC antiga deixa de apontar para o SAC (nao fica orfa apontando)');
  check(vinc.desfez, 'desfazer o vinculo limpa os dois lados');

  const peloLadoNC = await p.evaluate(() => {
    db.sac = []; db.ncs = [];
    openSACModal(null); document.getElementById('sDesc').value='SAC alvo'; saveSAC();
    const sacId = db.sac[0].id;
    openNCModal(null);
    document.getElementById('ncDesc').value = 'NC que escolhe o SAC';
    document.getElementById('ncSacId').value = sacId;
    saveNC();
    const ncId = db.ncs[0].id;
    return { naNC: db.ncs[0].sacId === sacId, noSAC: db.sac[0].ncId === ncId };
  });
  check(peloLadoNC.naNC && peloLadoNC.noSAC, 'vincular pelo lado da NC preenche os dois lados tambem');

  console.log('\nB6 — encaminhamento assistido');
  const assistido = await p.evaluate(() => {
    window.__avisos = [];
    db.sac = []; db.ncs = [];
    openSACModal(null);            // SAC ainda nao salvo
    abrirNCdoSAC();
    const recusouSemSalvar = window.__avisos.length === 1 && db.ncs.length === 0;

    document.getElementById('sDesc').value = 'Corpo estranho na embalagem';
    document.getElementById('sProd').value = 'Okey Lac 25kg';
    document.getElementById('sLote').value = 'L2422-24';
    document.getElementById('sEtapa').value = 'Envase e embalagem';
    saveSAC();
    editSAC(db.sac[0].id);
    abrirNCdoSAC();                // agora abre a NC preenchida

    return {
      recusouSemSalvar,
      naoGravouSozinho: db.ncs.length === 0,
      desc: document.getElementById('ncDesc').value,
      lote: document.getElementById('ncLote').value,
      prod: document.getElementById('ncProd').value,
      tipo: document.getElementById('ncTipoI').value,
      etapa: document.getElementById('ncEtapa').value,
      sacSel: document.getElementById('ncSacId').value === db.sac[0].id
    };
  });
  check(assistido.recusouSemSalvar, 'recusa abrir NC de um SAC ainda nao salvo, e diz por que');
  check(assistido.naoGravouSozinho, 'NAO grava a NC sozinho — so preenche e deixa a decisao com a pessoa');
  check(/Corpo estranho/.test(assistido.desc), 'a descricao do SAC vem junto (leu "' + assistido.desc + '")');
  check(assistido.lote === 'L2422-24', 'o lote vem junto (leu "' + assistido.lote + '")');
  check(assistido.prod === 'Okey Lac 25kg', 'o produto vem junto');
  check(assistido.tipo === 'Externa Cliente', 'a NC nasce como Externa Cliente (deu "' + assistido.tipo + '")');
  check(assistido.etapa === 'Envase e embalagem', 'a etapa ja apurada no SAC vem junto (deu "' + assistido.etapa + '")');
  check(assistido.sacSel, 'a NC ja vem com o SAC selecionado no vinculo');

  console.log('\nerros de pagina:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas++;
  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + falhas + ' VERIFICACAO(OES) FALHARAM');
  await b.close();
  process.exit(falhas === 0 ? 0 : 1);
})();
