/**
 * Teste de regressao — SLA DO SAC (item 11.7)
 *
 * DOC-SAC-001 rev. 02, secoes 3, 4 e 5. O que este teste protege:
 *
 *   1. os seis estados existem, e o estado antigo gravado nao some da tela;
 *   2. aberto_em e carimbado uma vez e nunca reescrito;
 *   3. "Aguardando cliente" PAUSA o relogio, e a pausa empurra o prazo de
 *      conclusao para a frente — a Qualidade nao pode aparecer atrasada em
 *      caso onde a bola estava com o cliente;
 *   4. com laudo o prazo vira 30 dias, e desmarcar depois NAO encolhe um prazo
 *      ja prometido;
 *   5. nao se encerra sem primeiro retorno registrado (regra 4.5);
 *   6. "Aguardando laudo / acao" exige pessoa e data (regra 4.4);
 *   7. conclusao_em e carimbado ao encerrar e sai se o SAC for reaberto.
 *
 *   node testes/sac-sla.js
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

  console.log('1 — os seis estados');
  const est = await p.evaluate(() => {
    db.sac = []; db.ncs = [];
    openSACModal(null);
    const el = document.getElementById('sStatus');
    return { opcoes: Array.from(el.options).map(o => o.value),
             relogio: SAC_RELOGIO,
             prazos: SAC_SLA };
  });
  const esperados = ['Aberta','Aguardando cliente','Em análise','Aguardando laudo / ação','Resposta preparada','Encerrada'];
  check(esperados.every(e => est.opcoes.indexOf(e) > -1), 'os 6 estados estao no select (' + JSON.stringify(est.opcoes) + ')');
  check(est.relogio['Aguardando cliente'] === 'pausado', '"Aguardando cliente" pausa o relogio');
  check(est.relogio['Em análise'] === 'correndo', '"Em analise" mantem o relogio correndo');
  check(est.prazos.primeiroRetornoDiasUteis === 1 && est.prazos.conclusaoDiasCorridos === 7 && est.prazos.conclusaoComLaudoDias === 30,
        'os prazos aprovados: 1 dia util / 7 corridos / 30 com laudo');

  console.log('\n2 — estado antigo gravado nao some da tela');
  const antigo = await p.evaluate(() => {
    db.sac = [{ id:'velho', num:'SAC-001', data:'2026-08-01', status:'Em tratativa', etapa:'A apurar', desc:'antigo' }];
    editSAC('velho');
    return { valor: document.getElementById('sStatus').value,
             celula: sacCelulaPrazo(db.sac[0]) };
  });
  check(antigo.valor === 'Em tratativa', 'o SAC antigo abre no estado que tem, sem trocar sozinho (deu "' + antigo.valor + '")');
  check(antigo.celula.indexOf('sem SLA') > -1, 'registro sem aberto_em e marcado "sem SLA" em vez de ganhar prazo inventado');

  console.log('\n3 — aberto_em carimba uma vez');
  const nasceu = await p.evaluate(() => {
    db.sac = [];
    openSACModal(null);
    document.getElementById('sData').value = '2026-09-09';
    document.getElementById('sCliente').value = 'Cliente A';
    document.getElementById('sDesc').value = 'corpo estranho';
    document.getElementById('sEtapa').value = 'Envase e embalagem';
    saveSAC();
    const s = db.sac[0];
    return { abertoEm: s.abertoEm, pR: s.prazoPrimeiroRetorno, pC: s.prazoConclusao,
             ret: s.primeiroRetornoEm, conc: s.conclusaoEm, id: s.id };
  });
  check(!!nasceu.abertoEm, 'aberto_em foi carimbado');
  check(!!nasceu.pR && !!nasceu.pC, 'os dois prazos foram calculados e gravados');
  check(nasceu.ret === '' && nasceu.conc === '', 'os dois carimbos de cumprimento nascem vazios');
  const dif = (new Date(nasceu.pC) - new Date(nasceu.abertoEm)) / 86400000;
  check(Math.abs(dif - 7) < 0.01, 'prazo de conclusao = 7 dias corridos (deu ' + dif.toFixed(2) + ')');

  const naoReescreve = await p.evaluate((id) => {
    editSAC(id);
    document.getElementById('sDesc').value = 'corpo estranho (corrigido)';
    saveSAC();
    return db.sac[0].abertoEm;
  }, nasceu.id);
  check(naoReescreve === nasceu.abertoEm, 'aberto_em NAO foi reescrito ao editar');

  console.log('\n4 — nao encerra sem primeiro retorno (regra 4.5)');
  const bloqueou = await p.evaluate((id) => {
    window.__avisos = [];
    editSAC(id);
    // A etapa vai preenchida de proposito: a trava que este passo mede e a do
    // primeiro retorno, nao a da etapa. Deixar as duas faltando testaria so a
    // ordem dos ifs.
    document.getElementById('sEtapa').value = 'Envase e embalagem';
    document.getElementById('sStatus').value = 'Encerrada';
    saveSAC();
    return { status: db.sac[0].status, avisos: window.__avisos.slice(),
             etapa: document.getElementById('sEtapa').value };
  }, nasceu.id);
  check(bloqueou.status !== 'Encerrada', 'o SAC continua aberto (ficou "' + bloqueou.status + '")');
  check(bloqueou.etapa === 'Envase e embalagem', 'a etapa estava preenchida — a trava que atuou nao foi a dela');
  check(bloqueou.avisos.some(a => a.indexOf('4.5') > -1), 'a tela explica a regra 4.5 (' + JSON.stringify(bloqueou.avisos) + ')');

  console.log('\n5 — "Aguardando laudo / acao" exige pessoa e data (regra 4.4)');
  const semDono = await p.evaluate((id) => {
    window.__avisos = [];
    editSAC(id);
    document.getElementById('sResp').value = '';
    document.getElementById('sPrazo').value = '';
    document.getElementById('sStatus').value = 'Aguardando laudo / ação';
    saveSAC();
    return { status: db.sac[0].status, avisos: window.__avisos.slice() };
  }, nasceu.id);
  check(semDono.status !== 'Aguardando laudo / ação', '"esta com o laboratorio" sem dono nao passa');
  check(semDono.avisos.some(a => a.indexOf('4.4') > -1), 'a tela explica a regra 4.4');

  console.log('\n6 — a pausa empurra o prazo de conclusao');
  const pausou = await p.evaluate((id) => {
    editSAC(id);
    document.getElementById('sStatus').value = 'Aguardando cliente';
    saveSAC();
    const s = db.sac[0];
    // Recua a entrada da pausa em 3 dias para medir o efeito sem esperar 3 dias.
    s.pausas[0].de = new Date(Date.now() - 3*86400000).toISOString();
    const antes = s.prazoConclusao;
    editSAC(id);
    document.getElementById('sStatus').value = 'Em análise';
    saveSAC();
    const d = db.sac[0];
    return { pausas: d.pausas.length, temFim: !!d.pausas[0].ate,
             antes, depois: d.prazoConclusao,
             ganho: (new Date(d.prazoConclusao) - new Date(antes)) / 86400000 };
  }, nasceu.id);
  check(pausou.pausas === 1 && pausou.temFim, 'a pausa tem hora de entrada E de saida registradas');
  check(pausou.ganho > 2.9 && pausou.ganho < 3.2, 'o prazo de conclusao andou ~3 dias para a frente (andou ' + pausou.ganho.toFixed(2) + ')');

  console.log('\n7 — laudo estica para 30 dias, e desmarcar nao encolhe');
  const laudo = await p.evaluate((id) => {
    editSAC(id);
    document.getElementById('sComLaudo').checked = true;
    saveSAC();
    const comLaudo = db.sac[0].prazoConclusao;
    editSAC(id);
    document.getElementById('sComLaudo').checked = false;
    saveSAC();
    const semLaudo = db.sac[0].prazoConclusao;
    return { comLaudo, semLaudo,
             dias: (new Date(comLaudo) - new Date(db.sac[0].abertoEm)) / 86400000 };
  }, nasceu.id);
  check(laudo.dias > 29 && laudo.dias < 34, 'com laudo o prazo vai para ~30 dias + pausa (deu ' + laudo.dias.toFixed(1) + ')');
  check(laudo.semLaudo === laudo.comLaudo, 'desmarcar o laudo NAO encolhe um prazo ja prometido');

  console.log('\n8 — o carimbo de retorno e explicito, e conclusao_em segue o estado');
  const fim = await p.evaluate((id) => {
    editSAC(id);
    sacRegistrarPrimeiroRetorno();
    document.getElementById('sStatus').value = 'Encerrada';
    document.getElementById('sEtapa').value = 'Envase e embalagem';
    saveSAC();
    const enc = db.sac[0];
    const r1 = { ret: !!enc.primeiroRetornoEm, conc: !!enc.conclusaoEm, status: enc.status };
    editSAC(id);
    document.getElementById('sStatus').value = 'Em análise';
    saveSAC();
    const re = db.sac[0];
    return { r1, reabriu: { ret: !!re.primeiroRetornoEm, conc: re.conclusaoEm } };
  }, nasceu.id);
  check(fim.r1.ret, 'o primeiro retorno ficou carimbado');
  check(fim.r1.status === 'Encerrada' && fim.r1.conc, 'com o retorno registrado o SAC encerra e carimba conclusao_em');
  check(fim.reabriu.ret, 'reabrir mantem o carimbo do primeiro retorno');
  check(fim.reabriu.conc === '', 'reabrir APAGA conclusao_em — registro aberto nao guarda data de conclusao');

  check(erros.length === 0, 'sem erro de pagina (' + JSON.stringify(erros) + ')');

  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'tudo passou'));
  await b.close();
  process.exit(falhas ? 1 : 0);
})();
