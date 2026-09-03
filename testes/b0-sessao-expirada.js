/**
 * Teste de regressao — B0: perda silenciosa de alteracoes
 *
 * Verifica que uma alteracao NAO e marcada como salva antes de o banco confirmar,
 * que o usuario e avisado quando a sessao expira, e que o pendente e gravado
 * apos novo login.
 *
 * Roda a pagina real num navegador sem interface, com um Supabase simulado:
 * o teste decide quando a sessao morre e quando a gravacao falha.
 *
 *   npm i -D playwright && npx playwright install chromium
 *   node testes/b0-sessao-expirada.js                     # versao atual
 *   node testes/b0-sessao-expirada.js ../arquivo.html     # outra versao (controle)
 *
 * Sai com codigo 0 se tudo passar, 1 se algo falhar.
 */
const { chromium } = require('playwright');
const path = require('path');

const alvo = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '..', 'sistema_qualidade_online.html');
const URL_ALVO = 'file://' + alvo;

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
      (rows||[]).forEach(r => {
        const i = window.__T.rows.findIndex(x => x.key === r.key);
        const copia = JSON.parse(JSON.stringify(r.data));
        if (i >= 0) window.__T.rows[i] = { key:r.key, data:copia };
        else window.__T.rows.push({ key:r.key, data:copia });
      });
      return { error: null };
    }
  }),
  channel: () => ({ on(){ return this; }, subscribe(){ return this; } })
});
// dependencias de CDN substituidas por dubles — o teste roda offline
window.Chart = function(){ this.destroy=function(){}; this.update=function(){}; this.data={datasets:[]}; this.options={}; };
window.Chart.register = function(){}; window.Chart.getChart = function(){ return null; };
window.XLSX = { utils:{ book_new:()=>({}), json_to_sheet:()=>({}), book_append_sheet:()=>{}, aoa_to_sheet:()=>({}) }, writeFile:()=>{} };
window.jspdf = { jsPDF: function(){ this.text=()=>{}; this.save=()=>{}; this.addPage=()=>{}; this.setFontSize=()=>{}; } };
Object.defineProperty(window, 'supabase', { value: { createClient: mk }, writable: false, configurable: false });
`;

(async () => {
  console.log('arquivo sob teste:', alvo, '\n');
  const b = await chromium.launch();
  const p = await b.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
  await p.route('**/@supabase/supabase-js**', r => r.abort());
  await p.addInitScript(STUB);
  await p.goto(URL_ALVO);
  await p.waitForTimeout(2500);

  let falhas = 0;
  const check = (ok, txt) => { console.log((ok ? '  ok    ' : '  FALHA ') + txt); if (!ok) falhas++; };
  const pend = () => p.evaluate(() =>
    (typeof temPendencias === 'function')
      ? temPendencias()
      : Object.keys(db).some(k => _snap[k] !== JSON.stringify(db[k])));

  check(await p.evaluate(() => document.getElementById('gate').style.display === 'none'),
        'app carrega com sessao valida');

  console.log('\nFASE A — salvamento normal');
  const base = await p.evaluate(() => window.__T.upserts);
  await p.evaluate(() => { db.sac.push({ id:'t1', num:'SAC-T1' }); saveDB(); });
  await p.waitForTimeout(1200);
  const A = await p.evaluate(() => ({ upserts: window.__T.upserts,
    conn: (document.getElementById('connTxt')||{}).textContent,
    banner: !!document.getElementById('avisoSync') && document.getElementById('avisoSync').style.display !== 'none' }));
  check(await pend() === false, 'nada pendente depois de salvar com sucesso');
  check(A.upserts - base === 1, 'exatamente uma gravacao nova');
  check(A.conn === 'Online', 'indicador em Online');
  check(A.banner === false, 'nenhuma tarja de aviso');

  console.log('\nFASE B — sessao expirada, gravacao falha');
  await p.evaluate(() => { window.__T.session = null; window.__T.upsertFails = true;
                           db.sac.push({ id:'t2', num:'SAC-T2' }); saveDB(); });
  await p.waitForTimeout(1800);
  const B = await p.evaluate(() => { const el = document.getElementById('avisoSync'); return {
    dadoNaTela: (db.sac||[]).some(x => x.id === 't2'),
    conn: (document.getElementById('connTxt')||{}).textContent,
    bannerVisivel: !!el && el.style.display !== 'none',
    bannerCor: el ? el.style.background : null,
    bannerTexto: el ? el.textContent : null,
    gateLogin: document.getElementById('gate').style.display !== 'none'
            && document.getElementById('gateLogin').style.display !== 'none',
    upserts: window.__T.upserts }; });
  check(await pend() === true, 'alteracao permanece PENDENTE — nao foi dada como salva');
  check(B.dadoNaTela === true, 'o dado continua na tela');
  check(B.upserts === A.upserts, 'nenhuma gravacao nova no banco');
  check(B.conn === 'Erro de conexao', 'indicador mostra erro');
  check(B.bannerVisivel === true, 'tarja de aviso aparece');
  check(/expirou/i.test(B.bannerTexto || ''), 'tarja avisa que a sessao expirou');
  check((B.bannerCor || '').replace(/\s/g,'') === 'rgb(185,28,28)', 'tarja em vermelho');
  check(B.gateLogin === true, 'tela de login abre por cima');

  console.log('\nFASE C — novo login grava o pendente');
  await p.evaluate(async () => {
    document.getElementById('loginEmail').value = 'teste@mfparis.com.br';
    document.getElementById('loginPass').value  = 'x';
    await doLoginUI();
  });
  await p.waitForTimeout(2000);
  const C = await p.evaluate(() => { const el = document.getElementById('avisoSync');
    const sac = (window.__T.rows.find(r => r.key === 'sac') || {}).data || [];
    return { gravado: sac.some(x => x.id === 't2'), t1: sac.some(x => x.id === 't1'),
      bannerVisivel: !!el && el.style.display !== 'none',
      conn: (document.getElementById('connTxt')||{}).textContent,
      gateFechado: document.getElementById('gate').style.display === 'none' }; });
  check(C.gravado === true, 'a alteracao pendente foi gravada no banco apos o login');
  check(C.t1 === true, 'a alteracao anterior continua gravada');
  check(await pend() === false, 'nao ha mais nada pendente');
  check(C.bannerVisivel === false, 'tarja desaparece');
  check(C.conn === 'Online', 'indicador volta para Online');
  check(C.gateFechado === true, 'app volta a ficar acessivel');

  console.log('\nerros de pagina:', erros.length ? erros : 'nenhum');
  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + falhas + ' VERIFICACAO(OES) FALHARAM');
  await b.close();
  process.exit(falhas === 0 ? 0 : 1);
})();
