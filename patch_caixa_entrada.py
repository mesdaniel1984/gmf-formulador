# -*- coding: utf-8 -*-
"""
A CAIXA DE ENTRADA DO SAC no SGQ.

O formulario publico grava em public.sac_entrada. Esta tela le de la e
transforma cada manifestacao em SAC com um clique — sem redigitar nada.

O que ela NAO faz, de proposito: virar SAC sozinha. Manifestacao que entra
por formulario ainda passa por uma pessoa, que le, confere e grava. E a mesma
regra da ponte da ronda: o sistema detecta, quem registra e gente.
"""
import io, sys

alvo = sys.argv[1]
s = io.open(alvo, encoding='utf-8').read()
orig = s
trocas = []

def troca(velho, novo, nome, n=1):
    global s
    c = s.count(velho)
    if c != n:
        raise SystemExit('FALHOU [%s]: esperava %d, achei %d' % (nome, n, c))
    s = s.replace(velho, novo)
    trocas.append(nome)

# ------------------------------------------------------------------ 1. HTML
troca("""<div class="section" id="sac">
  <div class="section-title">SAC — Reclamações de Clientes</div>
  <div class="section-sub">Registro, tratativa e resposta ao consumidor</div>
""",
"""<div class="section" id="sac">
  <div class="section-title">SAC — Reclamações de Clientes</div>
  <div class="section-sub">Registro, tratativa e resposta ao consumidor</div>

  <!-- A caixa de entrada do formulario publico. Fica vazia (e escondida)
       enquanto nao houver manifestacao nova. -->
  <div id="sacEntradaBox"></div>
""", '1. caixa no HTML')

# ------------------------------------------------------------------ 2. estado
troca("""let _sacFotos = [];""",
"""let _sacFotos = [];

/* ---------------------------------------------------------------------------
 * CAIXA DE ENTRADA — as manifestacoes que chegam pelo formulario publico.
 *
 * `_entradas`        a fila lida de public.sac_entrada (situacao = 'NOVA')
 * `_entradaPendente` o id da manifestacao que esta virando SAC agora; so e
 *                    marcada como IMPORTADA depois que o SAC for salvo, para
 *                    que fechar o modal sem salvar nao suma com ela da fila.
 * ------------------------------------------------------------------------ */
let _entradas = [];
let _entradaPendente = null;""", '2. estado')

# ------------------------------------------------------------------ 3. funcoes
troca("""function sacRenderFotos(){""",
"""function _esc(t){
  return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _quando(iso){
  try{
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' +
           d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){ return ''; }
}

async function carregarEntradas(){
  if(!sb) return;
  try{
    const { data, error } = await sb.from('sac_entrada')
      .select('*').eq('situacao','NOVA')
      .order('prioridade', { ascending:false })   // caso escalado vem antes de tudo
      .order('criado_em',  { ascending:true  });
    if(error) throw error;
    _entradas = data || [];
  }catch(e){
    // Tabela ainda nao criada, ou sem permissao: a tela some, o resto do SGQ
    // continua igual. Caixa de entrada nao pode derrubar o modulo do SAC.
    console.warn('Caixa de entrada indisponivel:', e && e.message);
    _entradas = [];
  }
  renderEntradas();
}

function renderEntradas(){
  var box = document.getElementById('sacEntradaBox');
  if(box){
    if(!_entradas.length){ box.innerHTML = ''; }
    else{
      box.innerHTML =
        '<div class="panel" style="border-left:4px solid #0d9488;margin-bottom:14px">'
        + '<div style="padding:13px 15px 4px">'
        +   '<b style="font-size:15px">'+_entradas.length+' manifesta\\u00e7\\u00e3o'
        +   (_entradas.length>1?'es':'')+' nova'+(_entradas.length>1?'s':'')
        +   ' aguardando triagem</b>'
        +   '<div style="font-size:12.5px;color:#64748b;margin-top:3px">'
        +     'Chegam do formul\\u00e1rio e do WhatsApp. Ainda n\\u00e3o s\\u00e3o registro: '
        +     'viram SAC quando voc\\u00ea abrir e salvar.'
        +   '</div>'
        + '</div>'
        + _entradas.map(function(e){
            var fotos = Array.isArray(e.fotos) ? e.fotos.length : 0;
            var origem = (e.origem === 'whatsapp') ? 'WhatsApp'
                       : (e.origem === 'formulario') ? 'site' : (e.origem || '');
            return '<div style="padding:12px 15px;border-top:1px solid var(--border)'
              + (e.prioridade ? ';background:#fff1f2' : '') + '">'
              + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline">'
              +   (e.prioridade
                    ? '<span class="badge danger">prioridade</span>' : '')
              +   '<b>'+_esc(e.nome||'sem nome')+'</b>'
              +   '<span style="font-size:12.5px;color:#64748b">'+_quando(e.criado_em)+'</span>'
              +   (origem ? '<span class="badge gray">'+_esc(origem)+'</span>' : '')
              +   (e.protocolo
                    ? '<span style="font-size:12px;color:#64748b;font-family:ui-monospace,monospace">'
                      +_esc(e.protocolo)+'</span>' : '')
              +   (e.produto ? '<span class="badge blue">'+_esc(e.produto)+'</span>' : '')
              +   (e.lote ? '<span class="badge warn">lote '+_esc(e.lote)+'</span>' : '')
              +   (fotos ? '<span class="badge gray">'+fotos+' foto'+(fotos>1?'s':'')+'</span>'
                         : '<span class="badge danger">sem foto</span>')
              + '</div>'
              + '<div style="font-size:13.5px;margin-top:6px;color:#334155">'
              +   _esc(String(e.relato||'').slice(0,240))
              +   (String(e.relato||'').length>240?'\\u2026':'')
              + '</div>'
              + '<div style="font-size:12.5px;color:#64748b;margin-top:5px">'
              +   'Contato: '+_esc(e.contato||'\\u2014')
              +   (e.prefere?' \\u00b7 prefere '+_esc(e.prefere):'')
              + '</div>'
              + '<div style="margin-top:9px;display:flex;gap:8px;flex-wrap:wrap">'
              +   '<button class="btn btn-primary" onclick="abrirEntrada(\\''+e.id+'\\')">Abrir como SAC</button>'
              +   '<button class="btn" onclick="descartarEntrada(\\''+e.id+'\\')">Descartar</button>'
              + '</div>'
              + '</div>';
          }).join('')
        + '</div>';
    }
  }
  // Marcador no menu, para a fila nao depender de alguem abrir a tela do SAC.
  try{
    var bts = document.querySelectorAll('.nav button');
    var b = bts[['central','dashboard','documentos','indicadores','fornecedores',
                 'analises','ncs','sac','licencas','treinamentos','planoacao'].indexOf('sac')];
    if(b){
      var limpo = b.textContent.replace(/\\s*\\(\\d+\\)\\s*$/,'');
      b.textContent = _entradas.length ? (limpo + ' (' + _entradas.length + ')') : limpo;
    }
  }catch(e){}
}

function abrirEntrada(id){
  var e = _entradas.filter(function(x){ return x.id === id; })[0];
  if(!e){ alert('Essa manifesta\\u00e7\\u00e3o n\\u00e3o est\\u00e1 mais na fila. Atualize a tela.'); return; }
  openSACModal(null);
  _entradaPendente = id;

  var p = function(campo, valor){ var el=document.getElementById(campo); if(el && valor) el.value = valor; };
  p('sData',    String(e.criado_em||'').slice(0,10));
  p('sCliente', e.nome);
  p('sProd',    e.produto);
  p('sLote',    e.lote);
  p('sOrigem',  'Consumidor Final');

  // O contato vai junto do relato porque o SAC nao tem campo proprio para ele
  // — e retorno sem contato e retorno que nao acontece.
  var rodape = '\\n\\n\\u2014 recebido pelo formul\\u00e1rio em ' + _quando(e.criado_em)
             + ' \\u00b7 contato: ' + (e.contato||'nao informado')
             + (e.prefere ? ' (prefere ' + e.prefere + ')' : '');
  p('sDesc', String(e.relato||'') + rodape);

  _sacFotos = (Array.isArray(e.fotos) ? e.fotos : []).slice();
  sacRenderFotos();

  var aviso = document.getElementById('sacEntradaAviso');
  if(aviso) aviso.style.display = 'block';
}

async function descartarEntrada(id){
  if(!confirm('Descartar esta manifesta\\u00e7\\u00e3o?\\n\\nUse s\\u00f3 para spam ou teste. '
    + 'Reclama\\u00e7\\u00e3o de cliente, mesmo incompleta, vira SAC.')) return;
  await _marcarEntrada(id, 'DESCARTADA', null);
  await carregarEntradas();
}

async function _marcarEntrada(id, situacao, sacId){
  if(!sb || !id) return;
  try{
    const { error } = await sb.from('sac_entrada').update({
      situacao    : situacao,
      sac_id      : sacId,
      tratado_em  : new Date().toISOString(),
      tratado_por : _usuarioAtual || ''
    }).eq('id', id);
    if(error) throw error;
  }catch(e){
    console.error('Nao consegui marcar a manifestacao:', e);
    alert('O SAC foi gravado, mas a manifesta\\u00e7\\u00e3o continua na fila do '
      + 'formul\\u00e1rio \\u2014 o banco recusou a marca\\u00e7\\u00e3o. Descarte ela na m\\u00e3o '
      + 'para n\\u00e3o registrar duas vezes.');
  }
}

function sacRenderFotos(){""", '3. funcoes da caixa')

# ------------------------------------------------------------------ 4. saveSAC
troca("""  vincularSACNC(obj.id, v('sNcId'));
  saveDB();closeModal('sacModal');renderSAC();""",
"""  vincularSACNC(obj.id, v('sNcId'));
  saveDB();closeModal('sacModal');renderSAC();

  // A manifestacao so sai da fila agora, com o SAC ja gravado. Fechar o modal
  // sem salvar deixa ela onde estava, que e o comportamento certo.
  if(_entradaPendente){
    var _ep = _entradaPendente; _entradaPendente = null;
    _marcarEntrada(_ep, 'IMPORTADA', obj.id).then(carregarEntradas);
  }""", '4. saveSAC fecha a entrada')

# ------------------------------------------------------------------ 5. limpar
troca("""function openSACModal(s){""",
"""function openSACModal(s){
  // Abrir o modal por qualquer outro caminho cancela a importacao em curso.
  _entradaPendente = null;""", '5. openSACModal limpa a pendencia')

# ------------------------------------------------------------------ 6. boot
troca("""  if (id === 'sac') renderSAC();""",
"""  if (id === 'sac') { renderSAC(); carregarEntradas(); }""", '6. showSection carrega a fila')

troca("""    subscribeRealtime();
    setConn('ok');""",
"""    subscribeRealtime();
    carregarEntradas();
    setConn('ok');""", '7. startApp carrega a fila')

io.open(alvo, 'w', encoding='utf-8').write(s)
print('OK - %d trocas em %s' % (len(trocas), alvo))
for t in trocas: print('   . ' + t)
print('bytes: %d -> %d' % (len(orig), len(s)))
