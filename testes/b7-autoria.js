/**
 * Teste de regressao — B7: quem alterou o que
 *
 * A gravacao no SGQ salvava chave, dados e data — sem autor. SAC, NC, CAPA,
 * documentos e treinamentos nao registravam quem mudou o que, o que e achado
 * de auditoria e exigencia de LGPD.
 *
 * Agora cada registro alterado recebe _por (e-mail) e _em (data/hora), marcados
 * num unico ponto antes da gravacao, e o modal mostra a ultima alteracao.
 *
 *   node testes/b7-autoria.js
 */
const { chromium } = require('playwright');
const path = require('path');
const alvo = process.argv[2] ? path.resolve(process.cwd(), process.argv[2])
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
  console.log('arquivo sob teste:', alvo, '\n');
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

  check(await p.evaluate(() => _usuarioAtual === 'teste@mfparis.com.br'),
        'o usuario logado fica registrado na sessao');

  console.log('\nregistro novo');
  const A = await p.evaluate(async () => {
    db.ncs = []; _snap.ncs = JSON.stringify(db.ncs);
    db.ncs.push({ id:'n1', num:'NC-001', desc:'primeira' });
    await pushChanges();
    const o = db.ncs[0];
    return { por: o._por, em: o._em, gravadoNoBanco: (window.__T.rows.find(r=>r.key==='ncs')||{}).data[0] };
  });
  check(A.por === 'teste@mfparis.com.br', 'registro novo recebe o autor (' + A.por + ')');
  check(!!A.em && !isNaN(Date.parse(A.em)), 'registro novo recebe data/hora valida (' + A.em + ')');
  check(A.gravadoNoBanco && A.gravadoNoBanco._por === 'teste@mfparis.com.br', 'a autoria chega ao banco');

  console.log('\nalteracao de registro existente');
  const B = await p.evaluate(async () => {
    const antes = db.ncs[0]._em;
    await new Promise(r => setTimeout(r, 1100));
    db.ncs[0].desc = 'alterada por outra pessoa';
    _usuarioAtual = 'izadora@mfparis.com.br';
    await pushChanges();
    return { por: db.ncs[0]._por, mudouData: db.ncs[0]._em !== antes };
  });
  check(B.por === 'izadora@mfparis.com.br', 'a alteracao registra o novo autor (' + B.por + ')');
  check(B.mudouData === true, 'a data/hora e atualizada na alteracao');

  console.log('\nnao carimba o que nao mudou');
  const C = await p.evaluate(async () => {
    db.ncs.push({ id:'n2', num:'NC-002', desc:'segunda' });
    await pushChanges();
    const porN1 = db.ncs[0]._por, emN1 = db.ncs[0]._em;
    _usuarioAtual = 'outro@mfparis.com.br';
    db.ncs[1].desc = 'segunda editada';
    await pushChanges();
    return { n1Por: db.ncs[0]._por, n1Em: emN1 === db.ncs[0]._em, n2Por: db.ncs[1]._por };
  });
  check(C.n1Por === 'izadora@mfparis.com.br', 'o registro intocado mantem o autor anterior');
  check(C.n1Em === true, 'o registro intocado mantem a data anterior');
  check(C.n2Por === 'outro@mfparis.com.br', 'so o registro alterado recebe o novo autor');

  console.log('\nsalvar sem mudar nada nao gera gravacao');
  const D = await p.evaluate(async () => {
    const antes = window.__T.upserts;
    await pushChanges();
    return window.__T.upserts - antes;
  });
  check(D === 0, 'nenhuma gravacao quando nada mudou (delta ' + D + ')');

  console.log('\nautoria visivel na tela');
  const E = await p.evaluate(() => {
    openNCModal(db.ncs[0]);
    const el = document.getElementById('ncAutoria');
    return { visivel: el && el.style.display !== 'none', texto: el ? el.textContent : '' };
  });
  check(E.visivel === true, 'o modal da NC mostra a linha de autoria');
  check(/izadora@mfparis\.com\.br/.test(E.texto), 'a linha nomeia quem alterou ("' + E.texto + '")');

  const F = await p.evaluate(() => {
    openNCModal(null);
    const el = document.getElementById('ncAutoria');
    return el && el.style.display === 'none';
  });
  check(F === true, 'numa NC nova a linha de autoria fica escondida');

  console.log('\nerros de pagina:', erros.length ? erros : 'nenhum');
  console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + falhas + ' VERIFICACAO(OES) FALHARAM');
  await b.close();
  process.exit(falhas === 0 ? 0 : 1);
})();
