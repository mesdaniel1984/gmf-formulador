// SAC — tela de Conversas do WhatsApp
// Uso: node testes/sac-conversas-ui.js
//
// Protege as correcoes pedidas na revisao de 22/09/2026:
//   1 rascunho por destinatario, resposta velha descartada, destino fixado
//   2 envio duplo travado no botao e no teclado
//   3 pagina recente + anteriores sob demanda; janela de 24h independente
//   4 logout limpa a tela, para o relogio e trava as acoes
//   5 "Resolvido" so depois de o banco confirmar a linha certa
//   6 perfil sem permissao nao responde
//
// Nao toca em rede: o supabase-js do CDN e' substituido por um duble, e as
// chamadas ao servidor do SAC sao interceptadas.

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

let passou = 0, falhou = 0;
function check(cond, nome, detalhe){
  if(cond){ passou++; console.log('  ok    ' + nome); }
  else { falhou++; console.log('  FALHOU: ' + nome + (detalhe ? '  -> ' + detalhe : '')); }
}
function titulo(t){ console.log('\n' + t); }

const ARQUIVO = path.join(__dirname, '..', 'conversas.html');

/* ----------------------------------------------------------- duble do SDK */
/* Implementa so o que a tela usa, com o encadeamento do supabase-js. */
const DUBLE = `
window.__espiao = { consultas: [], envios: [], updates: [], intervalos: 0 };
(function(){
  const orig = window.setInterval;
  window.setInterval = function(f, ms){ window.__espiao.intervalos++; return orig(f, ms); };
  const origClear = window.clearInterval;
  window.clearInterval = function(id){ window.__espiao.intervalos--; return origClear(id); };
})();

window.__dados = Object.assign({
  sessao: { access_token:'tok', user:{ email:'izadora@mfparis.com.br' } },
  fila: [],
  mensagens: {},          // telefone -> [{direcao,tipo,texto,criado_em}]
  atrasoConversa: 0,      // ms de atraso na leitura de wa_mensagem
  updateDevolve: null     // null = comportamento normal
}, window.__semear || {});

function consulta(tabela){
  const f = { tabela, filtros:{}, ordem:null, limite:null, tipo:'select', patch:null, lt:null };
  const api = {
    select(){ return api; },
    eq(col, val){ f.filtros[col] = val; return api; },
    lt(col, val){ f.lt = { col, val }; return api; },
    order(col, o){ f.ordem = { col, asc: o && o.ascending }; return api; },
    limit(n){ f.limite = n; return api; },
    maybeSingle(){ f.single = true; return api.then.bind(api); },
    update(patch){ f.tipo='update'; f.patch = patch; return api; },
    then(resolve){ return executar(f).then(resolve); }
  };
  return api;
}

async function executar(f){
  window.__espiao.consultas.push({ tabela:f.tabela, tipo:f.tipo, filtros:{...f.filtros} });

  if(f.tabela === 'wa_atendimento' && f.tipo === 'update'){
    window.__espiao.updates.push({ filtros:{...f.filtros}, patch:f.patch });
    if(window.__dados.updateDevolve !== null)
      return { data: window.__dados.updateDevolve, error: null };
    const a = window.__dados.fila.find(x => x.telefone === f.filtros.telefone);
    if(!a || (f.filtros.situacao && a.situacao !== f.filtros.situacao))
      return { data: [], error: null };
    a.situacao = 'RESOLVIDO';
    a.resolvido_em = new Date().toISOString();
    a.resolvido_por = 'carimbo-do-banco@mfparis.com.br';   // veio do gatilho
    return { data:[{ telefone:a.telefone, situacao:a.situacao,
                     resolvido_em:a.resolvido_em, resolvido_por:a.resolvido_por }], error:null };
  }

  if(f.tabela === 'wa_atendimento'){
    const linhas = window.__dados.fila.filter(a =>
      !f.filtros.situacao || a.situacao === f.filtros.situacao);
    return { data: linhas, error: null };
  }

  if(f.tabela === 'wa_mensagem'){
    if(window.__dados.atrasoConversa)
      await new Promise(r => setTimeout(r, window.__dados.atrasoConversa));
    let linhas = (window.__dados.mensagens[f.filtros.telefone] || []).slice();
    if(f.filtros.direcao) linhas = linhas.filter(m => m.direcao === f.filtros.direcao);
    if(f.lt) linhas = linhas.filter(m => m.criado_em < f.lt.val);
    linhas.sort((a,b) => f.ordem && f.ordem.asc
      ? a.criado_em.localeCompare(b.criado_em)
      : b.criado_em.localeCompare(a.criado_em));
    if(f.limite) linhas = linhas.slice(0, f.limite);
    return { data: linhas, error: null };
  }
  return { data: [], error: null };
}

window.supabase = {
  createClient(){
    return {
      auth: {
        async getSession(){ return { data:{ session: window.__dados.sessao } }; },
        onAuthStateChange(cb){ window.__authCb = cb; return { data:{ subscription:{} } }; }
      },
      from(tabela){ return consulta(tabela); }
    };
  }
};
`;

function servidor(){
  const s = http.createServer((req, res) => {
    if(req.url.startsWith('/conversas.html')){
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
      res.end(fs.readFileSync(ARQUIVO));
    } else { res.writeHead(404); res.end(); }
  });
  return new Promise(r => s.listen(0, () => r(s)));
}

function agora(menos){ return new Date(Date.now() - (menos||0)).toISOString(); }

(async () => {
  const srv = await servidor();
  const porta = srv.address().port;
  const browser = await chromium.launch();
  const url = 'http://127.0.0.1:' + porta + '/conversas.html';

  async function nova(dados, opc){
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    const espiao = { respostas:0, corpos:[] };
    const eu = (opc && opc.eu) || { email:'izadora@mfparis.com.br', papel:'ATENDENTE', podeResponder:true };

    // Fonte de fora nao pode segurar o teste.
    await page.route('**://fonts.googleapis.com/**', r => r.abort());
    await page.route('**://fonts.gstatic.com/**',   r => r.abort());

    await page.route('**supabase-js@2**', r =>
      r.fulfill({ status:200, contentType:'application/javascript', body: DUBLE }));
    await page.route('**/atendimento/eu', r =>
      r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(eu) }));
    await page.route('**/atendimento/responder', async r => {
      espiao.respostas++;
      const corpo = JSON.parse(r.request().postData() || '{}');
      espiao.corpos.push(corpo);
      if(opc && opc.atrasoEnvio) await new Promise(x => setTimeout(x, opc.atrasoEnvio));
      if(opc && opc.envioFalha)
        return r.fulfill({ status:502, contentType:'application/json',
                           body: JSON.stringify({ erro:'a Meta recusou o envio' }) });
      return r.fulfill({ status:200, contentType:'application/json',
                         body: JSON.stringify({ ok:true }) });
    });

    await page.addInitScript(d => { window.__semear = d; }, dados);
    await page.goto(url, { waitUntil:'domcontentloaded' });
    await page.waitForSelector('#tela:not([hidden])', { timeout: 8000 }).catch(()=>{});
    await page.waitForTimeout(150);
    return { page, ctx, espiao };
  }

  const DUAS = {
    fila: [
      { telefone:'5531900000001', nome:'Ana',  motivo:'NAO_SAC', situacao:'ABERTO',
        resumo:'quero comprar', aberto_em: agora(7200000), atualizado_em: agora(600000) },
      { telefone:'5531900000002', nome:'Bruno', motivo:'NAO_SAC', situacao:'ABERTO',
        resumo:'sou representante', aberto_em: agora(3600000), atualizado_em: agora(300000) }
    ],
    mensagens: {
      '5531900000001': [{ direcao:'ENTRADA', tipo:'texto', texto:'quero comprar', criado_em: agora(600000) }],
      '5531900000002': [{ direcao:'ENTRADA', tipo:'texto', texto:'sou representante', criado_em: agora(300000) }]
    }
  };

  // ------------------------------------------------------------------ 1
  {
    titulo('1. Rascunho por destinatario e destino fixado no envio');
    const { page, ctx } = await nova(DUAS);
    await page.click('.item[data-telefone="5531900000001"]');
    await page.fill('#texto', 'rascunho da Ana');
    await page.click('.item[data-telefone="5531900000002"]');
    check(await page.inputValue('#texto') === '', 'trocar de conversa nao leva o texto junto');
    await page.fill('#texto', 'rascunho do Bruno');
    await page.click('.item[data-telefone="5531900000001"]');
    check(await page.inputValue('#texto') === 'rascunho da Ana',
          'voltar para a primeira conversa traz o rascunho dela');
    await page.click('.item[data-telefone="5531900000002"]');
    check(await page.inputValue('#texto') === 'rascunho do Bruno',
          'e a segunda traz o dela');
    const aviso = await page.locator('.item[data-telefone="5531900000001"] .lapis').count();
    check(aviso === 1, 'a fila marca a conversa que tem rascunho nao enviado');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 2
  {
    titulo('2. Resposta de consulta antiga nao pinta a conversa nova');
    const { page, ctx } = await nova(Object.assign({}, DUAS, { atrasoConversa: 900 }));
    await page.click('.item[data-telefone="5531900000001"]');
    await page.waitForTimeout(100);
    await page.click('.item[data-telefone="5531900000002"]');   // troca no meio
    await page.waitForTimeout(1600);
    const txt = await page.locator('#conversa').innerText();
    check(txt.includes('sou representante'), 'a conversa aberta e a que ficou na tela');
    check(!txt.includes('quero comprar'), 'a resposta atrasada da outra conversa foi descartada');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 3
  {
    titulo('3. Envio duplo travado no botao e no teclado');
    const { page, ctx, espiao } = await nova(DUAS, { atrasoEnvio: 1200 });
    await page.click('.item[data-telefone="5531900000001"]');
    await page.fill('#texto', 'bom dia');
    await page.click('#btnEnviar');
    check(await page.isDisabled('#btnEnviar'), 'o botao desabilita ao comecar o envio');
    check((await page.locator('#btnEnviar').innerText()).includes('Enviando'),
          'e diz que esta enviando');
    await page.locator('#texto').press('Control+Enter').catch(()=>{});
    await page.evaluate(() => document.getElementById('btnEnviar').click());
    await page.waitForTimeout(1800);
    check(espiao.respostas === 1, 'apenas UM envio chegou ao servidor',
          'chegaram ' + espiao.respostas);
    check(!!espiao.corpos[0].chave, 'o envio carrega chave de idempotencia');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 4
  {
    titulo('4. Atualizacao automatica nao reabilita o botao durante o envio');
    const { page, ctx, espiao } = await nova(DUAS, { atrasoEnvio: 1500 });
    await page.click('.item[data-telefone="5531900000001"]');
    await page.fill('#texto', 'oi');
    await page.click('#btnEnviar');
    await page.evaluate(async () => { await window.__tiqueTeste?.(); });   // se existir
    await page.waitForTimeout(400);
    check(await page.isDisabled('#btnEnviar'), 'o botao continua travado durante o envio');
    check(await page.isDisabled('#texto'), 'e o campo tambem');
    await page.waitForTimeout(1600);
    check(espiao.respostas === 1, 'continua sendo um unico envio');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 5
  {
    titulo('5. Pagina recente, anteriores sob demanda, janela pela ultima recebida');
    const muitas = [];
    for(let i = 0; i < 95; i++)
      muitas.push({ direcao: i === 0 ? 'ENTRADA' : 'SAIDA', tipo:'texto',
                    texto:'m' + i, criado_em: new Date(Date.now() - (95 - i) * 60000).toISOString() });
    const dados = {
      fila:[{ telefone:'5531900000003', nome:'Carla', motivo:'NAO_SAC', situacao:'ABERTO',
              resumo:'conversa longa', aberto_em: agora(7200000), atualizado_em: agora(60000) }],
      mensagens:{ '5531900000003': muitas }
    };
    const { page, ctx } = await nova(dados);
    await page.click('.item[data-telefone="5531900000003"]');
    await page.waitForTimeout(300);
    const baloes1 = await page.locator('#conversa .balao').count();
    check(baloes1 === 40, 'carrega so as 40 mais recentes', 'carregou ' + baloes1);
    check(await page.locator('#btnAnteriores').count() === 1, 'oferece ver as anteriores');
    const texto1 = await page.locator('#conversa').innerText();
    check(texto1.includes('m94') && !texto1.includes('m0\n'), 'as recentes sao as que aparecem');

    await page.click('#btnAnteriores');
    await page.waitForTimeout(300);
    const baloes2 = await page.locator('#conversa .balao').count();
    check(baloes2 === 80, 'ver anteriores acrescenta a pagina anterior', 'ficou ' + baloes2);

    // A unica mensagem RECEBIDA tem 95 minutos: janela aberta, mesmo estando
    // fora da pagina carregada.
    const dica = await page.locator('#dica').innerText();
    check(/Restam|Menos de/.test(dica), 'a janela de 24h foi calculada pela ultima recebida',
          'dica: ' + dica);
    check(!await page.isDisabled('#texto'), 'e o campo de resposta esta liberado');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 5b
  {
    titulo('5b. Janela fechada quando a ultima recebida passou de 24h');
    const dados = {
      fila:[{ telefone:'5531900000004', nome:'Dora', motivo:'NAO_SAC', situacao:'ABERTO',
              resumo:'antiga', aberto_em: agora(200000000), atualizado_em: agora(200000000) }],
      mensagens:{ '5531900000004':[
        { direcao:'ENTRADA', tipo:'texto', texto:'oi', criado_em: agora(30*3600000) }] }
    };
    const { page, ctx } = await nova(dados);
    await page.click('.item[data-telefone="5531900000004"]');
    await page.waitForTimeout(300);
    check(await page.isDisabled('#texto'), 'campo bloqueado com a janela fechada');
    check(await page.isDisabled('#btnEnviar'), 'botao bloqueado tambem');
    check((await page.locator('#avisoJanela').innerText()).includes('24 horas'),
          'e a tela explica por que');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 6
  {
    titulo('6. Sair limpa a tela, para o relogio e trava as acoes');
    const { page, ctx } = await nova(DUAS);
    await page.click('.item[data-telefone="5531900000001"]');
    await page.fill('#texto', 'texto que nao pode ficar na tela');
    const antes = await page.evaluate(() => window.__espiao.intervalos);
    check(antes >= 1, 'o relogio estava rodando');

    await page.evaluate(() => { window.__dados.sessao = null; window.__authCb('SIGNED_OUT', null); });
    await page.waitForTimeout(300);

    check(await page.locator('#lista').innerText() === '', 'a fila sai da tela');
    check(await page.inputValue('#texto') === '', 'o texto digitado sai da tela');
    check(await page.locator('#conversa').innerText() === '', 'a conversa sai da tela');
    check(await page.isDisabled('#btnEnviar'), 'enviar fica travado');
    check(await page.isDisabled('#btnResolver'), 'resolver fica travado');
    check(!await page.locator('#portao').isHidden(), 'e a tela explica o que houve');
    const depois = await page.evaluate(() => window.__espiao.intervalos);
    check(depois === antes - 1, 'o relogio foi parado', 'antes ' + antes + ', depois ' + depois);
    await ctx.close();
  }

  // ------------------------------------------------------------------ 7
  {
    titulo('7. "Resolvido" so depois de o banco confirmar a linha certa');
    const { page, ctx } = await nova(DUAS);
    await page.click('.item[data-telefone="5531900000001"]');
    await page.waitForTimeout(200);

    // Banco devolve zero linhas: outra pessoa resolveu antes, ou sem permissao.
    await page.evaluate(() => { window.__dados.updateDevolve = []; });
    await page.click('#btnResolver');
    await page.waitForTimeout(300);
    check(!(await page.locator('#btnResolver').innerText()).startsWith('Resolvido'),
          'zero linhas NAO vira "Resolvido" na tela');
    check(!await page.locator('#erro').isHidden(), 'e a tela avisa o que aconteceu');

    // Agora o caminho normal: o gatilho do banco carimba autor e hora.
    await page.evaluate(() => { window.__dados.updateDevolve = null; });
    await page.click('#btnResolver');
    await page.waitForTimeout(300);
    const rotulo = await page.locator('#btnResolver').innerText();
    check(rotulo.includes('Resolvido'), 'confirmado vira "Resolvido"', rotulo);
    check(rotulo.includes('carimbo-do-banco'),
          'mostrando a autoria que veio do banco, nao a do navegador', rotulo);

    const up = await page.evaluate(() => window.__espiao.updates);
    const ultimo = up[up.length - 1];
    check(!('resolvido_por' in ultimo.patch) && !('resolvido_em' in ultimo.patch),
          'a tela NAO manda autoria nem horario no update');
    check(ultimo.filtros.telefone === '5531900000001' && ultimo.filtros.situacao === 'ABERTO',
          'e o update aponta para a linha certa, so se ainda estiver aberta');
    await ctx.close();
  }

  // ------------------------------------------------------------------ 8
  {
    titulo('8. Perfil sem permissao de resposta');
    const { page, ctx, espiao } = await nova(DUAS,
      { eu:{ email:'leitor@mfparis.com.br', papel:'LEITURA', podeResponder:false } });
    await page.click('.item[data-telefone="5531900000001"]');
    await page.waitForTimeout(300);
    check(await page.isDisabled('#texto'), 'perfil de leitura nao digita resposta');
    check(await page.isDisabled('#btnEnviar'), 'nem envia');
    check(await page.isDisabled('#btnResolver'), 'nem resolve');
    check((await page.locator('#avisoJanela').innerText()).includes('Somente leitura'),
          'e a tela diz por que');
    check(espiao.respostas === 0, 'nenhuma chamada de envio partiu');
    await ctx.close();
  }

  await browser.close();
  srv.close();

  console.log('\n' + '='.repeat(56));
  console.log(passou + ' verificacoes passaram, ' + falhou + ' falharam');
  process.exit(falhou ? 1 : 0);
})();
