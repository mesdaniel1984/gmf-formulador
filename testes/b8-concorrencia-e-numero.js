/**
 * Teste B8 — numero de protocolo e gravacao concorrente.
 *
 * Origem: 14/09/2026. A tela do SAC mostrava DOIS "SAC-003" e nenhum
 * "SAC-001". O console provou que os quatro numeros estavam gravados — nao
 * era a tela inventando. Duas causas empilhadas:
 *
 *   1. proximoNum = maior+1 da lista que ESTA ABA tem na memoria.
 *   2. cada chave de ARRAY_KEYS e um array inteiro em UMA linha de app_state,
 *      e o upsert substitui a linha. Salvar aqui trocava a lista do servidor
 *      pela lista desta aba — levando junto o que a outra pessoa criou.
 *
 * A (2) nao e numeracao: e reclamacao de cliente que some sem erro na tela.
 * Com o canal do WhatsApp aberto, e uma reclamacao que ninguem sabe que
 * existiu. Por isso os cenarios 1 a 3 sao os que importam.
 *
 *   node testes/b8-concorrencia-e-numero.js [arquivo.html]
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
  upserts: 0,
  rows: [
    { key:'__seeded', data:true }, { key:'sac', data:[] }, { key:'ncs', data:[] },
    { key:'docs', data:[] }, { key:'indicadores', data:[] }, { key:'fornecedores', data:[] },
    { key:'analises', data:[] }, { key:'licencas', data:[] }, { key:'treinamentos', data:[] },
    { key:'planoacao', data:[] }, { key:'cloro', data:[] }, { key:'analPlanos', data:[] },
    { key:'analPlanosV', data:1 }
  ]
};
// O "servidor": a outra aba escreve aqui direto, e esta aba nao fica sabendo
// (o canal de realtime esta mudo de proposito — e exatamente o caso do
// notebook que dormiu).
window.__servidor = {
  ler(k){ const r = window.__T.rows.find(x => x.key === k); return r ? JSON.parse(JSON.stringify(r.data)) : null; },
  escrever(k, v){ const i = window.__T.rows.findIndex(x => x.key === k);
    const c = JSON.parse(JSON.stringify(v));
    if(i>=0) window.__T.rows[i] = { key:k, data:c }; else window.__T.rows.push({ key:k, data:c }); }
};
const mk = () => ({
  auth: {
    getSession: async () => ({ data: { session: window.__T.session }, error: null }),
    getUser:    async () => ({ data: { user: window.__T.session ? window.__T.session.user : null }, error: null }),
    signInWithPassword: async () => ({ error: null }),
    signOut:    async () => { window.__T.session = null; return { error: null }; },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
  },
  from: () => ({
    select: () => {
      // Objeto "thenable": da para await direto (loadDB pega tudo) ou encadear
      // .eq(...).maybeSingle() (o merge pega uma chave so).
      const q = {
        _k: null,
        eq(col, val){ q._k = val; return q; },
        async maybeSingle(){
          const r = window.__T.rows.find(x => x.key === q._k);
          return { data: r ? { data: JSON.parse(JSON.stringify(r.data)) } : null, error: null };
        },
        then(res, rej){
          return Promise.resolve({ data: JSON.parse(JSON.stringify(window.__T.rows)), error: null }).then(res, rej);
        }
      };
      return q;
    },
    upsert: async (rows) => {
      window.__T.upserts++;
      (rows||[]).forEach(r => window.__servidor.escrever(r.key, r.data));
      return { error: null };
    }
  }),
  channel: () => ({ on(){ return this; }, subscribe(){ return this; } })
});
window.Chart = function(){ this.destroy=function(){}; this.update=function(){}; this.data={datasets:[]}; this.options={}; };
window.Chart.register = function(){}; window.Chart.getChart = function(){ return null; };
window.XLSX = { utils:{ book_new:()=>({}), json_to_sheet:()=>({}), book_append_sheet:()=>{}, aoa_to_sheet:()=>({}) }, writeFile:()=>{} };
window.jspdf = { jsPDF: function(){ this.text=()=>{}; this.save=()=>{}; this.addPage=()=>{}; this.setFontSize=()=>{}; } };
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
  await p.addInitScript(`window.__avisos=[]; window.alert=m=>{window.__avisos.push(String(m));}; window.confirm=()=>true;`);
  await p.goto(FILE);
  await p.waitForTimeout(2500);

  let falhas = 0;
  const check = (ok, txt) => { console.log((ok ? '  ok    ' : '  FALHA ') + txt); if (!ok) falhas++; };
  const gravou = () => p.waitForTimeout(900);   // debounce de 350ms + o push

  const novoSAC = async (cliente, desc) => {
    await p.evaluate(async (d) => {
      openSACModal(null);
      document.getElementById('sData').value = '2026-09-14';
      document.getElementById('sCliente').value = d.cliente;
      document.getElementById('sDesc').value = d.desc;
      document.getElementById('sEtapa').value = 'Envase e embalagem';
      await saveSAC();
    }, { cliente, desc });
    await gravou();
  };

  // ---------------------------------------------------------------- 1
  console.log('1 — a aba que dormiu nao apaga o registro da outra pessoa');
  await p.evaluate(() => {
    const a = [{ id:'a1', num:'SAC-001', cliente:'Cliente A', desc:'primeiro', data:'2026-09-01' }];
    window.__servidor.escrever('sac', a);
    db.sac = JSON.parse(JSON.stringify(a));
    _snap.sac = JSON.stringify(a);
  });
  // A outra pessoa registra uma reclamacao. Esta aba nao fica sabendo.
  await p.evaluate(() => {
    const s = window.__servidor.ler('sac');
    s.push({ id:'b1', num:'SAC-002', cliente:'Cliente B (outra aba)', desc:'registrado por outra pessoa', data:'2026-09-14' });
    window.__servidor.escrever('sac', s);
  });
  await novoSAC('Cliente C', 'registrado nesta aba');

  const r1 = await p.evaluate(() => ({
    servidor: window.__servidor.ler('sac').map(s => s.id + '/' + s.num),
    local:    db.sac.map(s => s.id + '/' + s.num)
  }));
  check(r1.servidor.some(x => x.indexOf('b1/') === 0),
        'o SAC da outra pessoa continua no servidor  [' + r1.servidor.join('  ') + ']');
  check(r1.servidor.length === 3, 'o servidor tem os 3 (A, B e C), nao 2');
  check(r1.servidor.filter(x => x.indexOf('SAC-002') > -1).length === 1,
        'o numero nao foi repetido: SAC-002 aparece uma vez so');
  check(r1.servidor.some(x => x.indexOf('SAC-003') > -1),
        'o registro novo pegou SAC-003 — o proximo depois do que a outra pessoa gravou');

  // ---------------------------------------------------------------- 2
  console.log('\n2 — apagar continua apagando (o merge nao ressuscita)');
  await p.evaluate(() => {
    const i = db.sac.findIndex(s => s.id === 'a1');
    db.sac.splice(i, 1);
    saveDB();
  });
  await gravou();
  const r2 = await p.evaluate(() => window.__servidor.ler('sac').map(s => s.id));
  check(r2.indexOf('a1') < 0, 'o registro apagado aqui sumiu do servidor  [' + r2.join('  ') + ']');
  check(r2.indexOf('b1') > -1, 'e o da outra pessoa continua la');

  // ---------------------------------------------------------------- 3
  console.log('\n3 — duas pessoas editando registros DIFERENTES');
  await p.evaluate(() => {
    const s = window.__servidor.ler('sac');
    s.find(x => x.id === 'b1').desc = 'EDITADO PELA OUTRA PESSOA';
    window.__servidor.escrever('sac', s);
  });
  const idC = await p.evaluate(() => db.sac.find(s => s.cliente === 'Cliente C').id);
  await p.evaluate(async (id) => {
    editSAC(id);
    document.getElementById('sDesc').value = 'EDITADO NESTA ABA';
    await saveSAC();
  }, idC);
  await gravou();
  const r3 = await p.evaluate(() => {
    const s = window.__servidor.ler('sac');
    return { b: (s.find(x => x.id === 'b1')||{}).desc, c: (s.find(x => x.desc === 'EDITADO NESTA ABA')||{}).desc };
  });
  check(r3.b === 'EDITADO PELA OUTRA PESSOA', 'a edicao da outra pessoa sobreviveu  (deu "' + r3.b + '")');
  check(r3.c === 'EDITADO NESTA ABA', 'a edicao desta aba sobreviveu');

  // ---------------------------------------------------------------- 4
  console.log('\n4 — proximoNum nunca devolve numero que ja existe');
  const r4 = await p.evaluate(() => ({
    repetido: proximoNum([{num:'SAC-003'},{num:'SAC-003'}], 'SAC-'),
    buraco:   proximoNum([{num:'SAC-002'},{num:'SAC-005'}], 'SAC-'),
    b3:       proximoNum([{num:'SAC-009'}], 'SAC-'),
    vazia:    proximoNum([], 'SAC-'),
    semNum:   proximoNum([{num:''},{num:'SAC-004'}], 'SAC-')
  }));
  check(r4.repetido === 'SAC-004', 'lista com 003 duplicado -> SAC-004 (deu ' + r4.repetido + ')');
  check(r4.buraco === 'SAC-006',   'buraco no meio nao e reaproveitado -> SAC-006 (deu ' + r4.buraco + ')');
  check(r4.b3 === 'SAC-010',       'B3 continua valendo: maior+1, nao quantidade (deu ' + r4.b3 + ')');
  check(r4.vazia === 'SAC-001',    'lista vazia comeca em SAC-001 (deu ' + r4.vazia + ')');
  check(r4.semNum === 'SAC-005',   'registro sem numero nao atrapalha a conta (deu ' + r4.semNum + ')');

  // ---------------------------------------------------------------- 5
  console.log('\n5 — a tela nao inventa numero a partir da posicao da linha');
  const r5 = await p.evaluate(() => {
    db.sac = [
      { id:'x1', num:'',        cliente:'SEM NUMERO',  desc:'d', data:'2026-08-01', status:'Em tratativa' },
      { id:'x2', num:'SAC-003', cliente:'REPETIDO UM', desc:'d', data:'2026-08-02', status:'Em tratativa' },
      { id:'x3', num:'SAC-003', cliente:'REPETIDO DOIS', desc:'d', data:'2026-08-03', status:'Aberta' },
      { id:'x4', num:'SAC-009', cliente:'UNICO',       desc:'d', data:'2026-08-04', status:'Aberta' }
    ];
    document.getElementById('sacSearch').value = '';
    document.getElementById('sacStatus').value = '';
    renderSAC();
    const tudo = document.getElementById('sacTable').innerHTML;
    // agora filtra: se o numero saisse da posicao, ele mudaria aqui
    document.getElementById('sacStatus').value = 'Aberta';
    renderSAC();
    const filtrado = document.getElementById('sacTable').innerHTML;
    document.getElementById('sacStatus').value = '';
    renderSAC();
    return { tudo, filtrado };
  });
  check(r5.tudo.indexOf('s/n') > -1, 'registro sem numero aparece como "s/n", nao como SAC-001 inventado');
  check(r5.tudo.indexOf('SAC-001') < 0, 'a tela nao escreve SAC-001 em lugar nenhum');
  check((r5.tudo.match(/repetido<\/span>/g)||[]).length === 2, 'os dois SAC-003 estao marcados "repetido"');
  check(r5.tudo.indexOf('SAC-009') > -1 && r5.filtrado.indexOf('SAC-009') > -1,
        'o numero do registro nao muda quando o filtro muda');
  check(r5.filtrado.indexOf('SAC-002') < 0 && r5.filtrado.indexOf('SAC-001') < 0,
        'com filtro aplicado nenhum numero novo aparece do nada');

  // ---------------------------------------------------------------- 6
  console.log('\n6 — numero carimbado uma vez, nunca recalculado');
  const r6 = await p.evaluate(async () => {
    db.sac = [{ id:'y1', num:'SAC-003', cliente:'ANTIGO', desc:'d', data:'2026-08-01',
                status:'Em tratativa', etapa:'A apurar' },
              { id:'y2', num:'SAC-050', cliente:'OUTRO', desc:'d', data:'2026-08-02', status:'Aberta' }];
    window.__servidor.escrever('sac', db.sac); _snap.sac = JSON.stringify(db.sac);
    editSAC('y1');
    document.getElementById('sDesc').value = 'editado';
    await saveSAC();
    return db.sac.find(s => s.id === 'y1').num;
  });
  check(r6 === 'SAC-003', 'editar um SAC nao troca o numero dele (deu ' + r6 + ')');

  // ---------------------------------------------------------------- 7
  console.log('\n7 — clique duplo no Salvar nao cria duas reclamacoes');
  const r7 = await p.evaluate(async () => {
    db.sac = []; window.__servidor.escrever('sac', []); _snap.sac = '[]';
    openSACModal(null);
    document.getElementById('sData').value = '2026-09-14';
    document.getElementById('sCliente').value = 'CLIQUE DUPLO';
    document.getElementById('sDesc').value = 'd';
    document.getElementById('sEtapa').value = 'Envase e embalagem';
    const a = saveSAC(), c = saveSAC();   // os dois cliques, sem esperar o primeiro
    await a; await c;
    return db.sac.length;
  });
  check(r7 === 1, 'dois cliques geraram 1 registro (gerou ' + r7 + ')');

  console.log('\nerros de pagina: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  console.log(falhas ? '\n>>> ' + falhas + ' FALHA(S)' : '\n>>> tudo passou');
  await b.close();
  process.exit(falhas ? 1 : 0);
})();
