/**
 * Teste de regressao — B3 e B5
 *
 * B3: o numero de NC (e de SAC) passa a vir do MAIOR numero ja usado, nao da
 *     quantidade de registros. Excluir um registro deixava de liberar um numero
 *     para reuso — dois registros com o mesmo codigo e achado de auditoria.
 * B5: a nao conformidade passa a ter campo de lote, sem o qual a NC de origem
 *     cliente nao aponta para nada.
 *
 *   node testes/b3b5-numeracao-e-lote.js
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

const linha = (ok, txt) => console.log((ok ? '  PASSOU  ' : '  FALHOU  ') + txt);


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

  console.log('B3 — numeracao que nao repete');
  const n = await p.evaluate(() => {
    const antigo = l => 'NC-' + String(l.length + 1).padStart(3,'0');
    const tres = [{id:'a',num:'NC-001'},{id:'b',num:'NC-002'},{id:'c',num:'NC-003'}];
    const aposExcluir = tres.filter(x => x.id !== 'b');
    return {
      vazio:        proximoNum([], 'NC-'),
      sequencia:    proximoNum(tres, 'NC-'),
      aposExcluir:  proximoNum(aposExcluir, 'NC-'),
      antigoAposEx: antigo(aposExcluir),
      semNum:       proximoNum([{id:'x'},{id:'y',num:'NC-007'}], 'NC-'),
      sac:          proximoNum([{num:'SAC-012'}], 'SAC-'),
      foraDeOrdem:  proximoNum([{num:'NC-010'},{num:'NC-003'}], 'NC-')
    };
  });
  check(n.vazio === 'NC-001', 'lista vazia comeca em NC-001 (deu ' + n.vazio + ')');
  check(n.sequencia === 'NC-004', 'tres registros -> NC-004 (deu ' + n.sequencia + ')');
  check(n.aposExcluir === 'NC-004', 'apos EXCLUIR a NC-002, o proximo continua NC-004 (deu ' + n.aposExcluir + ')');
  check(n.antigoAposEx === 'NC-003', 'controle: a formula antiga repetia NC-003 (deu ' + n.antigoAposEx + ')');
  check(n.semNum === 'NC-008', 'ignora registro sem numero (deu ' + n.semNum + ')');
  check(n.sac === 'SAC-013', 'mesma regra vale para o SAC (deu ' + n.sac + ')');
  check(n.foraDeOrdem === 'NC-011', 'usa o MAIOR numero, nao o ultimo da lista (deu ' + n.foraDeOrdem + ')');

  console.log('\nB5 — campo lote na nao conformidade');
  const campoExiste = await p.evaluate(() => !!document.getElementById('ncLote'));
  check(campoExiste, 'o campo de lote existe no formulario da NC');

  const salvou = await p.evaluate(() => {
    db.ncs = [];
    openNCModal(null);
    document.getElementById('ncData').value = '2026-09-03';
    document.getElementById('ncDesc').value = 'Teste B5';
    document.getElementById('ncProd').value = 'Produto X';
    document.getElementById('ncLote').value = 'L260831-04';
    saveNC();
    const nc = db.ncs[db.ncs.length - 1];
    return { lote: nc && nc.lote, num: nc && nc.num, total: db.ncs.length };
  });
  check(salvou.lote === 'L260831-04', 'o lote e gravado na NC (gravou "' + salvou.lote + '")');
  check(salvou.num === 'NC-001', 'a NC nova recebeu NC-001 (recebeu ' + salvou.num + ')');

  const reabriu = await p.evaluate(() => {
    const nc = db.ncs[db.ncs.length - 1];
    openNCModal(nc);
    return document.getElementById('ncLote').value;
  });
  check(reabriu === 'L260831-04', 'ao reabrir a NC, o lote continua preenchido (leu "' + reabriu + '")');

  const limpou = await p.evaluate(() => { openNCModal(null); return document.getElementById('ncLote').value; });
  check(limpou === '', 'ao abrir uma NC nova, o campo vem vazio (leu "' + limpou + '")');

  console.log('\nerros de pagina:', erros.length ? erros : 'nenhum');
  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + falhas + ' VERIFICACAO(OES) FALHARAM');
  await b.close();
  process.exit(falhas === 0 ? 0 : 1);
})();
