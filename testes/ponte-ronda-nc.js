/**
 * Teste de regressao — A PONTE (ronda -> NC)
 *
 * Decidido em 08/09/2026: a NC oficial vive so no SGQ. O sistema de rondas
 * (qualidade-alimentos) manda o desvio para ca por parametro de URL, e esta
 * tela abre a NC PRE-PREENCHIDA. O que este teste protege:
 *
 *   1. sem ?abrir=nc, nada acontece — a tela abre como sempre abriu;
 *   2. com ?abrir=nc, o modal abre preenchido e NENHUMA NC e gravada;
 *   3. um valor de select que nao existe nao apaga o campo em silencio;
 *   4. a URL e limpa, para que F5 nao gere NC duplicada.
 *
 * O item 2 e o que importa. Um robo que gravasse sozinho faria a estatistica de
 * causa raiz medir o robo, e nao a fabrica.
 *
 *   node testes/ponte-ronda-nc.js
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

async function abrir(query){
  const b = await chromium.launch();
  const p = await b.newPage();
  const erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
  await p.route('**/@supabase/supabase-js**', r => r.abort());
  await p.addInitScript(STUB);
  await p.addInitScript(`window.__avisos=[];window.alert=m=>{window.__avisos.push(String(m));};window.confirm=()=>true;`);
  await p.goto(FILE + (query || ''));
  await p.waitForTimeout(2500);
  return { b, p, erros };
}

(async () => {
  let falhas = 0;
  let baseUpserts = 0;
  const check = (ok, txt) => { console.log((ok ? '  ok    ' : '  FALHA ') + txt); if (!ok) falhas++; };

  console.log('1 — sem parametro, a tela nao muda de comportamento');
  {
    const { b, p, erros } = await abrir('');
    const r = await p.evaluate(async () => ({
      modalAberto: document.getElementById('ncModal').classList.contains('open'),
      ncs: db.ncs.length,
      upserts: window.__T.upserts,
      temFuncao: typeof aplicarParametrosDaURL === 'function'
    }));
    baseUpserts = r.upserts;
    check(r.temFuncao, 'a funcao da ponte existe');
    check(!r.modalAberto, 'o modal de NC NAO abre sozinho');
    check(r.ncs === 0, 'nenhuma NC foi criada');
    check(erros.length === 0, 'sem erro de pagina (' + JSON.stringify(erros) + ')');
    await b.close();
  }

  console.log('\n2 — com ?abrir=nc, o modal abre preenchido e nada e gravado');
  {
    const q = '?abrir=nc'
      + '&desc=' + encodeURIComponent('Peso do fardo abaixo do critico: 9,120 kg')
      + '&prod=' + encodeURIComponent('Cafe Grao de Minas Tradicional 500g')
      + '&lote=' + encodeURIComponent('L20260908-02')
      + '&empresa=MFPARIS'
      + '&resp=' + encodeURIComponent('Izadora Laportti')
      + '&data=2026-09-08'
      + '&origem=' + encodeURIComponent('ronda 1841 / OP 2026/02388 / PCC-04');
    const { b, p, erros } = await abrir(q);
    const r = await p.evaluate(async () => ({
      modalAberto: document.getElementById('ncModal').classList.contains('open'),
      desc:  document.getElementById('ncDesc').value,
      prod:  document.getElementById('ncProd').value,
      lote:  document.getElementById('ncLote').value,
      resp:  document.getElementById('ncResp').value,
      data:  document.getElementById('ncData').value,
      empresa: document.getElementById('ncEmpresa').value,
      tipo:  document.getElementById('ncTipoI').value,
      aviso: (document.getElementById('ncPonteAviso')||{}).style ? document.getElementById('ncPonteAviso').style.display : 'ausente',
      ncs:   db.ncs.length,
      upserts: window.__T.upserts,
      secao: (document.querySelector('.section.active')||{}).id || '',
      busca: window.location.search
    }));
    check(r.modalAberto, 'o modal de NC abriu');
    check(r.desc.indexOf('Peso do fardo abaixo do critico') === 0, 'a descricao chegou ("' + r.desc.slice(0,40) + '")');
    check(r.desc.indexOf('[origem: ronda 1841 / OP 2026/02388 / PCC-04]') > -1, 'a origem ficou registrada dentro do texto');
    check(r.prod === 'Cafe Grao de Minas Tradicional 500g', 'o produto chegou');
    check(r.lote === 'L20260908-02', 'o lote chegou');
    check(r.resp === 'Izadora Laportti', 'o responsavel chegou');
    check(r.data === '2026-09-08', 'a data chegou');
    // O select escreve 'MFParis'. A ponte casa sem diferenciar maiuscula, entao a
    // ronda pode mandar MFPARIS e chegar no lugar certo.
    check(r.empresa === 'MFParis', 'a empresa casou com a opcao do select, ignorando caixa (deu "' + r.empresa + '")');
    check(!!r.tipo, 'o tipo nao ficou vazio (deu "' + r.tipo + '")');
    check(r.aviso === '', 'o aviso de rascunho esta visivel');
    check(r.ncs === 0, 'NENHUMA NC foi gravada — a decisao continua sendo da pessoa (gravou ' + r.ncs + ')');
    // O boot do SGQ ja grava por conta propria (seedOnce). O que a ponte nao pode
    // fazer e gravar A MAIS. Por isso a comparacao e contra a mesma tela sem
    // parametro, e nao contra zero — zero seria uma expectativa minha, nao um fato.
    check(r.upserts === baseUpserts,
      'a ponte nao escreveu nada a mais no banco (sem parametro: ' + baseUpserts + ', com: ' + r.upserts + ')');
    check(r.busca === '', 'a URL foi limpa: F5 nao reabre o rascunho (search: "' + r.busca + '")');
    check(erros.length === 0, 'sem erro de pagina (' + JSON.stringify(erros) + ')');

    console.log('\n3 — so depois de a pessoa clicar em Salvar a NC existe');
    const dep = await p.evaluate(async () => {
      document.getElementById('ncEtapa').value = 'Envase e fechamento';
      await saveNC();
      return { ncs: db.ncs.length, num: (db.ncs[0]||{}).num, prod: (db.ncs[0]||{}).prod };
    });
    check(dep.ncs === 1, 'depois do Salvar existe 1 NC');
    check(dep.num === 'NC-001', 'a NC recebeu numero da sequencia do SGQ (deu ' + dep.num + ')');
    check(dep.prod === 'Cafe Grao de Minas Tradicional 500g', 'gravou o produto que veio da ronda');
    await b.close();
  }

  console.log('\n4 — valor que o select nao tem nao apaga o campo em silencio');
  {
    const { b, p } = await abrir('?abrir=nc&empresa=EMPRESA_QUE_NAO_EXISTE&desc=teste');
    const r = await p.evaluate(async () => ({
      empresa: document.getElementById('ncEmpresa').value,
      opcoes: Array.from(document.getElementById('ncEmpresa').options).map(o => o.value)
    }));
    check(!!r.empresa && r.opcoes.indexOf(r.empresa) > -1,
      'a empresa continua num valor valido em vez de ficar vazia (deu "' + r.empresa + '")');
    await b.close();
  }

  console.log('\n' + (falhas ? falhas + ' FALHA(S)' : 'tudo passou'));
  process.exit(falhas ? 1 : 0);
})();
