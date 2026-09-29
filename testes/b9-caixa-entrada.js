/**
 * Teste B9 — o formulario publico e a caixa de entrada do SAC.
 *
 * O que esta sendo protegido:
 *   1. O formulario grava UMA linha, com a forma exata que o SGQ sabe ler,
 *      e sem pedir a linha de volta (a policy anonima e so de INSERT — um
 *      .select() encadeado faria o banco recusar a gravacao inteira).
 *   2. Robo de formulario nao vira reclamacao.
 *   3. A fila aparece no SGQ, e a manifestacao SO sai dela depois que o SAC
 *      for salvo. Abrir e desistir tem de deixar tudo como estava.
 *   4. As fotos atravessam sem ser reprocessadas.
 *
 *   node testes/b9-caixa-entrada.js [sgq.html] [sac.html]
 */
const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const SGQ  = path.resolve(process.cwd(), process.argv[2] || 'alvo2.html');
const FORM = path.resolve(process.cwd(), process.argv[3] || '/home/claude/out/sacform/sac.html');

let falhas = 0;
const check = (ok, txt) => { console.log((ok?'  ok    ':'  FALHA ')+txt); if(!ok) falhas++; };

/* ---- duble do supabase, com as cadeias que o codigo novo usa ---- */
const STUB_COMUM = `
window.__T = {
  session:{ user:{ email:'teste@mfparis.com.br' } },
  upserts:0, inserts:[], updates:[],
  entradas: [],
  rows:[ {key:'__seeded',data:true},{key:'sac',data:[]},{key:'ncs',data:[]},
    {key:'docs',data:[]},{key:'indicadores',data:[]},{key:'fornecedores',data:[]},
    {key:'analises',data:[]},{key:'licencas',data:[]},{key:'treinamentos',data:[]},
    {key:'planoacao',data:[]},{key:'cloro',data:[]},{key:'analPlanos',data:[]},
    {key:'analPlanosV',data:1} ]
};
const mkTabela = (nome) => ({
  select: () => {
    const q = {
      _k:null, _f:{},
      eq(c,v){ if(c==='key') q._k=v; q._f[c]=v; return q; },
      order(col, opt){ q._ord = (q._ord||[]).concat([[col, !opt || opt.ascending !== false]]); return q; },
      async maybeSingle(){
        const r = window.__T.rows.find(x=>x.key===q._k);
        return { data: r ? { data: JSON.parse(JSON.stringify(r.data)) } : null, error:null };
      },
      then(res,rej){
        let out;
        if(nome === 'sac_entrada'){
          out = window.__T.entradas.filter(e => !q._f.situacao || e.situacao === q._f.situacao);
          out = JSON.parse(JSON.stringify(out));
          // ordena como o Postgres ordenaria, para o teste enxergar a ordem real
          (q._ord||[]).slice().reverse().forEach(([col, asc]) => {
            out.sort((a,b) => {
              const x = a[col], y = b[col];
              const n = (x === y) ? 0 : ((x === null || x === undefined) ? -1
                       : (y === null || y === undefined) ? 1 : (x > y ? 1 : -1));
              return asc ? n : -n;
            });
          });
        } else {
          out = JSON.parse(JSON.stringify(window.__T.rows));
        }
        return Promise.resolve({ data: out, error:null }).then(res,rej);
      }
    };
    return q;
  },
  async upsert(rows){
    window.__T.upserts++;
    (rows||[]).forEach(r=>{ const i=window.__T.rows.findIndex(x=>x.key===r.key);
      const c=JSON.parse(JSON.stringify(r.data));
      if(i>=0) window.__T.rows[i]={key:r.key,data:c}; else window.__T.rows.push({key:r.key,data:c}); });
    return { error:null };
  },
  insert(row){
    const p = { _armou:false };
    const prom = Promise.resolve().then(()=>{
      window.__T.inserts.push({ tabela:nome, row:JSON.parse(JSON.stringify(row)), pediuSelect:p._armou });
      return { error:null };
    });
    prom.select = () => { p._armou = true; return prom; };   // se alguem encadear, o teste ve
    return prom;
  },
  update(campos){
    return { eq: async (col,val) => {
      window.__T.updates.push({ tabela:nome, campos:JSON.parse(JSON.stringify(campos)), col, val });
      const e = window.__T.entradas.find(x=>x.id===val);
      if(e) Object.assign(e, campos);
      return { error:null };
    }};
  }
});
const mk = () => ({
  auth:{
    getSession: async()=>({ data:{ session:window.__T.session }, error:null }),
    getUser:    async()=>({ data:{ user:window.__T.session?window.__T.session.user:null }, error:null }),
    signInWithPassword: async()=>({ error:null }),
    signOut: async()=>{ window.__T.session=null; return { error:null }; },
    onAuthStateChange: ()=>({ data:{ subscription:{ unsubscribe(){} } } })
  },
  from: (nome) => mkTabela(nome),
  channel: ()=>({ on(){return this;}, subscribe(){return this;} })
});
Object.defineProperty(window,'supabase',{ value:{ createClient:mk }, writable:false, configurable:false });
`;

const STUB_SGQ = STUB_COMUM + `
window.Chart=function(){this.destroy=function(){};this.update=function(){};this.data={datasets:[]};this.options={};};
window.Chart.register=function(){}; window.Chart.getChart=function(){return null;};
window.XLSX={utils:{book_new:()=>({}),json_to_sheet:()=>({}),book_append_sheet:()=>{},aoa_to_sheet:()=>({})},writeFile:()=>{}};
window.jspdf={jsPDF:function(){this.text=()=>{};this.save=()=>{};this.addPage=()=>{};this.setFontSize=()=>{};}};
`;

const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

(async () => {
  const b = await chromium.launch();

  /* ===================================================================== */
  console.log('A — o formulario publico');
  {
    const p = await b.newPage();
    const erros = []; p.on('pageerror', e => erros.push(e.message));
    await p.route('**/fonts.googleapis.com/**', r => r.abort());
    await p.addInitScript(STUB_COMUM);
    await p.goto('file://' + FORM);
    await p.waitForTimeout(500);

    // 1. obrigatorios
    const semNada = await p.evaluate(() => {
      document.getElementById('botao').click();
      return { erroVisivel: !document.getElementById('erro').hidden,
               inserts: window.__T.inserts.length };
    });
    check(semNada.erroVisivel, 'formulario vazio mostra erro e nao envia');
    check(semNada.inserts === 0, 'nada foi gravado no banco');

    // 2. envio real (esperando os 3s da trava de robo)
    await p.waitForTimeout(3200);
    await p.evaluate((foto) => {
      const v=(id,val)=>{ document.getElementById(id).value = val; };
      v('nome','Maria de Souza'); v('contato','31 98888-7777');
      v('produto','Cafe Grao de Minas 500g'); v('lote','L260831-04');
      v('relato','O cafe veio com gosto diferente do de sempre.');
      // injeta a foto direto na lista interna, como se tivesse sido tirada
      window.__injetar = foto;
    }, FOTO);
    // a lista de fotos e privada; usa o caminho publico (o input) com um arquivo real
    await p.setInputFiles('#fotoLote', {
      name:'lote.jpg', mimeType:'image/jpeg',
      buffer: Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKAAf//Z','base64')
    });
    await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById('botao').click());
    await p.waitForTimeout(900);

    const env = await p.evaluate(() => ({
      inserts: window.__T.inserts,
      prontoVisivel: !document.getElementById('pronto').hidden,
      formEscondido: document.getElementById('form').hidden
    }));
    check(env.inserts.length === 1, 'gravou exatamente uma linha (gravou ' + env.inserts.length + ')');
    if(env.inserts.length === 1){
      const r = env.inserts[0].row;
      check(env.inserts[0].tabela === 'sac_entrada', 'gravou na tabela sac_entrada');
      check(env.inserts[0].pediuSelect === false,
            'NAO encadeou .select() — a policy anonima e so de INSERT');
      check(r.nome === 'Maria de Souza' && r.contato === '31 98888-7777', 'nome e contato foram junto');
      check(r.lote === 'L260831-04' && r.produto === 'Cafe Grao de Minas 500g', 'produto e lote foram junto');
      check(Array.isArray(r.fotos) && r.fotos.length === 1, 'a foto do lote foi junto');
      check(r.fotos[0] && typeof r.fotos[0].data === 'string' && /^data:image\//.test(r.fotos[0].data),
            'a foto vai como data URL, no mesmo formato que o SGQ guarda');
      check(r.situacao === undefined, 'nao manda situacao — o banco poe NOVA sozinho');
      check(!('cpf' in r), 'nao existe campo de CPF no que e enviado');
    }
    check(env.prontoVisivel && env.formEscondido, 'a tela de recebido substitui o formulario');

    const semProtocolo = await p.evaluate(() => document.getElementById('pronto').innerText);
    check(!/SAC-\d/.test(semProtocolo),
          'a tela de recebido NAO inventa numero de protocolo');

    // 3. robo
    const robo = await p.evaluate(() => {
      window.__T.inserts = [];
      location.reload();
    });
    await p.waitForTimeout(1200);
    const r2 = await p.evaluate(() => {
      document.getElementById('nome').value='Robo';
      document.getElementById('contato').value='x';
      document.getElementById('relato').value='y';
      document.getElementById('empresa_site').value='http://spam';
      document.getElementById('botao').click();
      return null;
    });
    await p.waitForTimeout(700);
    const depoisRobo = await p.evaluate(() => ({
      inserts: window.__T.inserts.length,
      pronto: !document.getElementById('pronto').hidden
    }));
    check(depoisRobo.inserts === 0, 'campo-armadilha preenchido: nada foi gravado');
    check(depoisRobo.pronto === true, 'e o robo ve a tela de sucesso, sem saber que foi barrado');

    console.log('  erros de pagina: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
    if(erros.length) falhas += erros.length;
    await p.close();
  }

  /* ===================================================================== */
  console.log('\nB — a caixa de entrada dentro do SGQ');
  {
    const p = await b.newPage();
    const erros = []; p.on('pageerror', e => erros.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.route('**/@supabase/supabase-js**', r => r.abort());
    await p.addInitScript(STUB_SGQ);
    await p.addInitScript(`window.__avisos=[];window.alert=m=>{window.__avisos.push(String(m));};window.confirm=()=>true;`);
    await p.addInitScript(`window.__T.entradas = [
      { id:'e1', criado_em:'2026-09-19T14:30:00.000Z', situacao:'NOVA',
        nome:'Maria de Souza', contato:'31 98888-7777', prefere:'WhatsApp',
        produto:'Cafe Grao de Minas 500g', lote:'L260831-04',
        relato:'O cafe veio com gosto diferente do de sempre.',
        fotos:[{nome:'lote.jpg', data:'${FOTO}'}] },
      { id:'e2', criado_em:'2026-09-19T15:00:00.000Z', situacao:'NOVA',
        nome:'Spam', contato:'-', produto:'', lote:'', relato:'compre seguidores',
        fotos:[] }
    ];`);
    await p.goto('file://' + SGQ);
    await p.waitForTimeout(2800);

    const fila = await p.evaluate(() => {
      showSection('sac');
      return new Promise(r => setTimeout(() => r({
        html: document.getElementById('sacEntradaBox').innerHTML,
        n: _entradas.length,
        menu: Array.from(document.querySelectorAll('.nav button')).map(b=>b.textContent).join('|')
      }), 600));
    });
    check(fila.n === 2, 'a fila leu as 2 manifestacoes novas (leu ' + fila.n + ')');
    check(fila.html.indexOf('Maria de Souza') > -1, 'o nome do cliente aparece na fila');
    check(fila.html.indexOf('L260831-04') > -1, 'o lote aparece na fila');
    check(fila.html.indexOf('sem foto') > -1, 'a manifestacao sem foto e marcada como tal');
    check(/SAC[^<]*\(2\)/.test(fila.menu), 'o menu do SAC mostra o contador (2)');

    // abrir sem salvar nao pode tirar da fila
    const abriu = await p.evaluate(() => {
      abrirEntrada('e1');
      return { cliente: document.getElementById('sCliente').value,
               prod:    document.getElementById('sProd').value,
               lote:    document.getElementById('sLote').value,
               desc:    document.getElementById('sDesc').value,
               fotos:   _sacFotos.length,
               pend:    _entradaPendente };
    });
    check(abriu.cliente === 'Maria de Souza', 'abriu o SAC com o cliente preenchido');
    check(abriu.prod.indexOf('Grao de Minas') > -1 && abriu.lote === 'L260831-04',
          'produto e lote vieram preenchidos');
    check(abriu.desc.indexOf('gosto diferente') > -1, 'o relato do cliente veio inteiro');
    check(abriu.desc.indexOf('31 98888-7777') > -1,
          'o contato foi junto do relato — retorno sem contato nao acontece');
    check(abriu.fotos === 1, 'a foto atravessou do formulario para o SAC');
    check(abriu.pend === 'e1', 'a manifestacao ficou marcada como pendente');

    const desistiu = await p.evaluate(() => {
      closeModal('sacModal');
      openSACModal(null);                 // abriu outro SAC por fora
      return { pend: _entradaPendente, updates: window.__T.updates.length };
    });
    check(desistiu.pend === null, 'abrir outro SAC cancela a importacao pendente');
    check(desistiu.updates === 0, 'e nada foi marcado no banco — a manifestacao continua na fila');

    // agora importar de verdade
    const importou = await p.evaluate(async () => {
      abrirEntrada('e1');
      document.getElementById('sEtapa').value = 'Envase e embalagem';
      await saveSAC();
      return new Promise(r => setTimeout(() => r({
        sacs: db.sac.length,
        num: db.sac[0] && db.sac[0].num,
        fotos: db.sac[0] && db.sac[0].fotos.length,
        updates: window.__T.updates.slice(),
        restam: _entradas.length,
        idDoSac: db.sac[0] && db.sac[0].id
      }), 900));
    });
    check(importou.sacs === 1, 'o SAC foi criado');
    check(importou.num === 'SAC-001', 'e recebeu numero de protocolo do SGQ (' + importou.num + ')');
    check(importou.fotos === 1, 'a foto ficou gravada no SAC');
    check(importou.updates.length === 1, 'a manifestacao foi marcada uma vez (' + importou.updates.length + ')');
    if(importou.updates.length){
      const u = importou.updates[0];
      check(u.campos.situacao === 'IMPORTADA', 'marcada como IMPORTADA');
      check(!!u.campos.sac_id && u.campos.sac_id === importou.idDoSac,
            'o id do SAC gravado na manifestacao e o do SAC que acabou de nascer');
      check(!!u.campos.tratado_por, 'quem importou ficou registrado');
    }
    check(importou.restam === 1, 'sobrou 1 na fila (a de spam)');

    // descartar
    const descartou = await p.evaluate(async () => {
      await descartarEntrada('e2');
      return new Promise(r => setTimeout(() => r({
        updates: window.__T.updates.slice(-1)[0],
        restam: _entradas.length,
        sacs: db.sac.length
      }), 700));
    });
    check(descartou.updates.campos.situacao === 'DESCARTADA', 'o spam foi descartado');
    check(descartou.restam === 0, 'a fila esvaziou');
    check(descartou.sacs === 1, 'e descartar NAO criou SAC nenhum');

    console.log('  erros de pagina: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
    if(erros.length) falhas += erros.length;
    await p.close();
  }

  /* ===================================================================== */
  console.log('\nC — o caso escalado fura a fila');
  {
    const p = await b.newPage();
    const erros = []; p.on('pageerror', e => erros.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.route('**/@supabase/supabase-js**', r => r.abort());
    await p.addInitScript(STUB_SGQ);
    await p.addInitScript(`window.__avisos=[];window.alert=m=>{window.__avisos.push(String(m));};window.confirm=()=>true;`);
    // A escalada chegou DEPOIS da comum. Por data, viria por ultimo.
    await p.addInitScript(`window.__T.entradas = [
      { id:'c1', criado_em:'2026-09-20T09:00:00.000Z', situacao:'NOVA', prioridade:false,
        origem:'formulario', protocolo:'ATD-2026-0011',
        nome:'Cliente comum', contato:'31 97777-0000', produto:'Cafe', lote:'L1',
        relato:'embalagem amassada', fotos:[] },
      { id:'c2', criado_em:'2026-09-20T11:00:00.000Z', situacao:'NOVA', prioridade:true,
        origem:'whatsapp', protocolo:'ATD-2026-0012',
        nome:'Cliente escalado', contato:'5531988887777', produto:'Leite em po Horizonte',
        lote:'', relato:'achei um caco de vidro dentro do pacote', fotos:[] }
    ];`);
    await p.goto('file://' + SGQ);
    await p.waitForTimeout(2800);

    const fila = await p.evaluate(() => {
      showSection('sac');
      return new Promise(r => setTimeout(() => r({
        html: document.getElementById('sacEntradaBox').innerHTML,
        ordem: _entradas.map(e => e.id)
      }), 600));
    });

    check(fila.ordem[0] === 'c2',
      'o caso com prioridade vem primeiro, mesmo sendo o mais recente (veio ' + fila.ordem.join(',') + ')');
    check(fila.html.indexOf('prioridade') > -1, 'a etiqueta de prioridade aparece na tela');
    check(fila.html.indexOf('ATD-2026-0012') > -1, 'o protocolo do cliente aparece na fila');
    check(fila.html.indexOf('WhatsApp') > -1, 'a origem WhatsApp aparece');
    check(fila.html.indexOf('site') > -1, 'a origem do formulario aparece como site');
    check(fila.html.indexOf('caco de vidro') > -1, 'o relato do caso escalado aparece');
    check(fila.html.indexOf(fila.html.indexOf('Cliente escalado') > -1 ? 'Cliente escalado' : 'xx') > -1,
      'o nome do caso escalado aparece');

    const posEscalado = fila.html.indexOf('Cliente escalado');
    const posComum    = fila.html.indexOf('Cliente comum');
    check(posEscalado > -1 && posComum > -1 && posEscalado < posComum,
      'na ordem do HTML, o escalado esta acima do comum');

    console.log('  erros de pagina: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
    if(erros.length) falhas += erros.length;
    await p.close();
  }

  console.log(falhas ? '\n>>> ' + falhas + ' FALHA(S)' : '\n>>> tudo passou');
  await b.close();
  process.exit(falhas ? 1 : 0);
})();
