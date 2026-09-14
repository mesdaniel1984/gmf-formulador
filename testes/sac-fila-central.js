/**
 * Teste de regressao — A FILA DO SAC NA CENTRAL (DOC-SAC-001, secao 9)
 *
 * O card do SAC mostrava um numero e a frase "ainda medindo". Com os cinco
 * campos de prazo, ele vira fila. O que este teste protege e o que faz a fila
 * ser honesta em vez de bonita:
 *
 *   1. "vencido" NAO conta o que esta com o cliente — relogio pausado nao e
 *      atraso da Qualidade;
 *   2. registro antigo, sem carimbo de abertura, NAO entra nas medias, e
 *      aparece contado a parte;
 *   3. sem nenhum retorno carimbado a tela diz isso, em vez de mostrar "0h";
 *   4. linha zerada some da lista, menos a de prazo vencido, que fica sempre.
 *
 *   node testes/sac-fila-central.js
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
  await p.addInitScript(`window.__avisos=[];window.alert=m=>{window.__avisos.push(String(m));};window.confirm=()=>true;`);
  await p.goto(FILE);
  await p.waitForTimeout(2500);

  let falhas = 0;
  const check = (ok, txt) => { console.log((ok ? '  ok    ' : '  FALHA ') + txt); if (!ok) falhas++; };

  const H = h => new Date(Date.now() - h*3600000).toISOString();

  console.log('1 — o relogio pausado nao vira atraso');
  const r1 = await p.evaluate((ago) => {
    // Os dois estao MUITO alem do prazo de 1 dia util. A diferenca e so o
    // estado: um espera a Qualidade, o outro espera o cliente.
    const base = { lote:'L1', primeiroRetornoEm:'', conclusaoEm:'', pausas:[], comLaudo:false };
    const lista = [
      Object.assign({ id:'a', status:'Em análise',         abertoEm:ago }, base),
      Object.assign({ id:'b', status:'Aguardando cliente', abertoEm:ago }, base)
    ];
    return sacFilaDaCentral(lista);
  }, H(240));
  check(r1.vencido === 1, 'so 1 vencido: o que esta com a Qualidade (deu ' + r1.vencido + ')');
  check(r1.aguardandoCliente === 1, 'o outro aparece como "aguardando cliente"');
  check(r1.aberto === 2, 'os dois contam como em aberto');

  console.log('\n2 — registro antigo nao entra na media');
  const r2 = await p.evaluate((ago) => {
    const lista = [
      // De antes dos carimbos: sem abertoEm.
      { id:'velho', status:'Aberta', lote:'L9' },
      // Com carimbo: aberto ha 10h, retorno carimbado ha 4h -> 6h de retorno.
      { id:'novo', status:'Em análise', lote:'L8', abertoEm:ago.dez,
        primeiroRetornoEm:ago.quatro, pausas:[], comLaudo:false }
    ];
    return sacFilaDaCentral(lista);
  }, { dez:H(10), quatro:H(4) });
  check(r2.semSla === 1, 'o registro sem abertoEm e contado a parte (deu ' + r2.semSla + ')');
  check(r2.medidosNoRetorno === 1, 'so 1 entrou na media (deu ' + r2.medidosNoRetorno + ')');
  check(Math.abs(r2.primeiroRetornoMedioH - 6) < 0.2,
        'a media e 6h, sem diluir com o antigo (deu ' + (r2.primeiroRetornoMedioH||0).toFixed(2) + 'h)');
  check(r2.comLotePct === 100, '% com lote conta os dois (deu ' + r2.comLotePct + ')');

  console.log('\n3 — sem retorno carimbado, a tela diz isso, nao "0h"');
  const r3 = await p.evaluate((ago) => {
    db.sac = [{ id:'x', status:'Aberta', lote:'', abertoEm:ago, pausas:[], comLaudo:false }];
    db.ncs = [];
    renderCentral();
    const f = sacFilaDaCentral(db.sac);
    return { media: f.primeiroRetornoMedioH, html: document.getElementById('cSac').innerHTML };
  }, H(2));
  check(r3.media === null, 'a media fica nula em vez de zero');
  check(r3.html.indexOf('nenhum carimbado ainda') > -1, 'o card explica por que nao ha numero');
  check(r3.html.indexOf('0h') === -1, 'o card NAO mostra "0h" (que seria desempenho inventado)');
  check(r3.html.indexOf('0% com lote') > -1, '% com lote mostra 0% de verdade — esse zero e medido');

  console.log('\n4 — linha zerada some, menos a de prazo vencido');
  const r4 = await p.evaluate(() => {
    db.sac = [{ id:'y', status:'Aberta', lote:'L1', abertoEm:new Date().toISOString(), pausas:[], comLaudo:false }];
    renderCentral();
    const h = document.getElementById('cSac').innerHTML;
    return { vencido: h.indexOf('com prazo vencido') > -1,
             aguardando: h.indexOf('aguardando cliente') > -1,
             laudo: h.indexOf('aguardando laudo') > -1 };
  });
  check(r4.vencido, '"com prazo vencido" aparece mesmo zerado — e a linha que se olha primeiro');
  check(!r4.aguardando && !r4.laudo, 'as outras linhas zeradas somem (ruido, nao informacao)');

  console.log('\n5 — o card inteiro renderiza sem erro');
  check(erros.length === 0, 'sem erro de pagina (' + JSON.stringify(erros) + ')');

  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'tudo passou'));
  await b.close();
  process.exit(falhas ? 1 : 0);
})();
