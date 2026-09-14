# -*- coding: utf-8 -*-
"""
B8 - o numero do SAC e a gravacao concorrente.

Achado de 14/09/2026: a tela mostrava dois SAC-003 e nenhum SAC-001.
O console provou que os quatro numeros estao GRAVADOS - nao era a tela
inventando. Duas causas, uma em cima da outra:

  1. proximoNum devolve maior+1 da lista que ESTA ABA tem na memoria.
     Lista velha -> numero repetido.
  2. db.sac e um array inteiro numa linha so de app_state. pushChanges faz
     upsert dessa linha. Quem salvar por ultimo substitui a lista inteira -
     e leva junto o registro que a outra pessoa criou enquanto isso.

A (2) e a grave: nao e numeracao, e perda de reclamacao de cliente.
"""
import io, sys, re

alvo = sys.argv[1]
s = io.open(alvo, encoding='utf-8').read()
orig = s
trocas = []

def troca(velho, novo, nome, n=1):
    global s
    c = s.count(velho)
    if c != n:
        raise SystemExit('FALHOU [%s]: esperava %d ocorrencia(s), achei %d' % (nome, n, c))
    s = s.replace(velho, novo)
    trocas.append(nome)

# ---------------------------------------------------------------- 1
# proximoNum nunca devolve um numero que ja esta na lista.
troca(
"""function proximoNum(lista, prefixo){
  const maior = (lista||[]).reduce((m,o) => {
    const n = parseInt(String((o && o.num) || '').replace(/\\D/g,''), 10);
    return (isFinite(n) && n > m) ? n : m;
  }, 0);
  return prefixo + String(maior + 1).padStart(3,'0');
}""",
"""function proximoNum(lista, prefixo){
  const usados = new Set((lista||[]).map(o => String((o && o.num) || '').toUpperCase()));
  const maior = (lista||[]).reduce((m,o) => {
    const n = parseInt(String((o && o.num) || '').replace(/\\D/g,''), 10);
    return (isFinite(n) && n > m) ? n : m;
  }, 0);
  // maior+1 nao basta: se a lista ja tem esse numero (veio de outra aba, ou de
  // um merge), devolver ele de novo cria dois casos com o mesmo protocolo e o
  // cliente perde a unica referencia que tem. Anda ate achar um livre.
  let n = maior + 1;
  while (usados.has((prefixo + String(n).padStart(3,'0')).toUpperCase())) n++;
  return prefixo + String(n).padStart(3,'0');
}""",
'1. proximoNum nao repete numero')

# ---------------------------------------------------------------- 2
# merge de 3 vias + numero conferido no servidor
troca(
"""function saveDB(){ clearTimeout(_saveTimer); _saveTimer = setTimeout(pushChanges, 350); }""",
"""function saveDB(){ clearTimeout(_saveTimer); _saveTimer = setTimeout(pushChanges, 350); }

/* ===========================================================================
 * B8 - GRAVAR SEM APAGAR O QUE E DOS OUTROS
 *
 * Cada chave de ARRAY_KEYS e UM array inteiro em UMA linha de app_state.
 * `upsert` substitui a linha. Entao salvar aqui nao "adiciona o meu": troca a
 * lista do servidor pela lista desta aba. Se a aba estava dormindo (notebook
 * fechado, realtime caido), a lista desta aba e velha, e o SAC que a outra
 * pessoa registrou nesse meio-tempo some sem erro nenhum na tela.
 *
 * O merge abaixo e de 3 vias, e a base e `_snap[k]` - o retrato do servidor
 * que esta aba viu pela ultima vez. Com a base da para distinguir as duas
 * coisas que, sem ela, sao identicas:
 *
 *   "esse registro sumiu da minha lista porque EU apaguei"   -> apaga mesmo
 *   "esse registro nao esta na minha lista porque eu NUNCA vi" -> mantem
 *
 * Regra de empate: quem mexeu, ganha. Se eu editei o registro e o outro nao,
 * vale o meu; se eu nao toquei nele, vale o do servidor. Os dois editando o
 * MESMO registro ao mesmo tempo continua sendo ultimo-a-salvar-vence - mas ai
 * e um registro, nao a lista toda.
 * ======================================================================== */
function _idDe(o){ return (o && o.id !== undefined && o.id !== null) ? String(o.id) : null; }

function _mergeArray(base, local, remoto){
  const temTodos = a => Array.isArray(a) && a.every(o => _idDe(o) !== null);
  // Sem id nao da para casar item com item. Nesse caso devolve null e quem
  // chamou mantem o comportamento antigo - errar por merge cego seria pior.
  if(!temTodos(base) || !temTodos(local) || !temTodos(remoto)) return null;

  const mapa = a => { const m = new Map(); a.forEach(o => m.set(_idDe(o), o)); return m; };
  const B = mapa(base), R = mapa(remoto);
  const igual = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const saida = [], vistos = new Set();

  // Ordem: primeiro a ordem local (e a que a pessoa esta vendo na tela),
  // depois o que so existe no servidor, na ordem dele.
  local.forEach(o => {
    const i = _idDe(o); vistos.add(i);
    const b = B.get(i);
    if(!b || !igual(b, o)) { saida.push(o); return; }   // criado ou editado aqui
    if(!R.has(i)) return;                                // outro apagou, eu nao mexi
    saida.push(R.get(i));                                // eu nao mexi: vale o servidor
  });
  remoto.forEach(o => {
    const i = _idDe(o);
    if(vistos.has(i)) return;
    if(B.has(i)) return;        // estava na base e sumiu daqui: EU apaguei
    saida.push(o);              // criado por outra pessoa enquanto eu estava aqui
  });
  return saida;
}

// Puxa a versao do servidor e junta com a daqui. Devolve true se a lista mudou.
async function _sincronizarChave(k){
  if(!sb || ARRAY_KEYS.indexOf(k) < 0) return false;
  const { data, error } = await sb.from(TABLE).select('data').eq('key', k).maybeSingle();
  if(error || !data) return false;
  const base = _snap[k] ? JSON.parse(_snap[k]) : [];
  const juntos = _mergeArray(base, db[k], data.data);
  if(!juntos) return false;
  const mudou = JSON.stringify(juntos) !== JSON.stringify(db[k]);
  db[k] = juntos;
  _snap[k] = JSON.stringify(data.data);
  return mudou;
}

/* O numero e a referencia que o cliente recebe pelo WhatsApp. Carimbar ele a
 * partir da lista que esta na memoria desta aba e como emitir protocolo de um
 * talao que outra pessoa tambem esta usando: so se descobre o repetido depois,
 * quando o cliente liga citando um numero que aponta para dois casos.
 * Por isso: conferir no servidor ANTES de carimbar. Se o servidor nao
 * responder, carimba com o que tem e avisa - recusar o registro seria pior. */
async function numeroNovo(chave, prefixo){
  try{ await _sincronizarChave(chave); }
  catch(e){ console.error('Nao consegui conferir a numeracao no servidor:', e); }
  return proximoNum(db[chave], prefixo);
}""",
'2. merge de 3 vias + numeroNovo')

# ---------------------------------------------------------------- 3
troca(
"""async function pushChanges(){
  if(!sb) return;
  marcarAutoria();
  const rows = [], novos = {};
  Object.keys(db).forEach(k => {
    const s = JSON.stringify(db[k]);
    if(_snap[k] !== s){ rows.push({ key:k, data:db[k], updated_at:new Date().toISOString() }); novos[k] = s; }
  });
  if(!rows.length) return;""",
"""async function pushChanges(){
  if(!sb) return;
  marcarAutoria();

  // B8: reler e juntar ANTES de gravar. Sem isto o upsert abaixo troca a lista
  // inteira do servidor pela desta aba.
  let sujas = Object.keys(db).filter(k => _snap[k] !== JSON.stringify(db[k]));
  const arrays = sujas.filter(k => ARRAY_KEYS.indexOf(k) > -1);
  let entrouCoisaNova = false;
  for(const k of arrays){
    try{ if(await _sincronizarChave(k)) entrouCoisaNova = true; }
    catch(e){ console.error('Merge antes de salvar falhou em "'+k+'"; segue com o local:', e); }
  }

  const rows = [], novos = {};
  Object.keys(db).forEach(k => {
    const s = JSON.stringify(db[k]);
    if(_snap[k] !== s){ rows.push({ key:k, data:db[k], updated_at:new Date().toISOString() }); novos[k] = s; }
  });
  if(!rows.length){ if(entrouCoisaNova) _redesenhar(); return; }""",
'3. pushChanges junta antes de gravar')

troca(
"""    Object.keys(novos).forEach(k => { _snap[k] = novos[k]; });
    _falhasSave = 0;
    setConn('ok');
    limparAvisoSync();""",
"""    Object.keys(novos).forEach(k => { _snap[k] = novos[k]; });
    _falhasSave = 0;
    setConn('ok');
    limparAvisoSync();
    if(entrouCoisaNova) _redesenhar();""",
'4. redesenha se o merge trouxe registro novo')

# ---------------------------------------------------------------- 4
troca(
"""function subscribeRealtime(){""",
"""// Redesenha a secao aberta. Nao mexe na tela com modal aberto: trocar o que
// esta atras do formulario enquanto a pessoa digita e pior que esperar.
function _redesenhar(){
  try{
    if(document.querySelector('.modal.open')) return;
    const active = document.querySelector('.section.active');
    if(active) showSection(active.id);
  }catch(e){}
}

function subscribeRealtime(){""",
'5. _redesenhar')

# ---------------------------------------------------------------- 5
# a tela para de inventar numero por posicao
troca(
"""  document.getElementById('sacTable').innerHTML=rows.map(function(s,i){""",
"""  // Quantas vezes cada numero aparece na base INTEIRA (nao so no filtro):
  // numero repetido tem que doer na tela, senao volta a passar despercebido.
  var _quantos={};
  (db.sac||[]).forEach(function(x){ var n=String(x.num||''); if(n) _quantos[n]=(_quantos[n]||0)+1; });

  document.getElementById('sacTable').innerHTML=rows.map(function(s,i){""",
'6. contagem de numeros repetidos')

troca(
"""      +'<td>'+(s.num||('SAC-'+String(i+1).padStart(3,'0')))+'</td>'""",
"""      +'<td>'+sacCelulaNumero(s,_quantos)+'</td>'""",
'7. celula do numero')

troca(
"""function renderSAC(){""",
"""/* O numero na tela NAO pode sair da posicao da linha. Ate hoje saia:
 * (s.num || 'SAC-'+(i+1)). Como a lista e filtravel, o mesmo registro mudava
 * de numero conforme o filtro - e um protocolo que muda de valor nao e
 * protocolo. Registro velho sem numero agora aparece como "s/n", que e a
 * verdade, e pede decisao humana em vez de inventar uma resposta. */
function sacCelulaNumero(s, quantos){
  var n = String(s.num||'');
  if(!n) return '<span class="badge warn" title="Registro gravado sem numero de protocolo. '
              + 'Numerar e decisao de quem atende: se o numero ja foi dito ao cliente, ele manda.">s/n&ordm;</span>';
  var rep = (quantos && quantos[n] > 1)
    ? ' <span class="badge danger" title="Este numero esta em '+quantos[n]+' registros. '
      + 'Enquanto estiver assim, o cliente que citar este protocolo aponta para mais de um caso.">repetido</span>'
    : '';
  return n + rep;
}

function renderSAC(){""",
'8. sacCelulaNumero')

# ---------------------------------------------------------------- 6
# saveSAC: async + numero conferido no servidor + guarda contra indice -1
troca("""function saveSAC(){
  var id=document.getElementById('sacEditId').value;""",
"""async function saveSAC(){
  var id=document.getElementById('sacEditId').value;""",
'9. saveSAC async')

troca("""  var obj={
    id:id||uid(),
    num:(ant&&ant.num)||proximoNum(db.sac,'SAC-'),""",
"""  // Numero: carimbado UMA vez e nunca recalculado. Para registro novo, sai da
  // lista conferida no servidor (ver numeroNovo). Registro que ja tem numero
  // guarda o dele mesmo em edicao - era por aqui que um SAC antigo sem numero
  // ganhava um numero novo so por alguem abrir e salvar.
  var _num = (ant && ant.num) || await numeroNovo('sac','SAC-');
  ant = id ? db.sac.find(function(s){return s.id===id;}) || ant : ant;

  var obj={
    id:id||uid(),
    num:_num,""",
'10. saveSAC usa numeroNovo')

troca("""  if(id){var i=db.sac.findIndex(function(s){return s.id===id;});db.sac[i]=obj;}else{db.sac.push(obj);}""",
"""  // i<0 acontece se outra pessoa apagou este registro enquanto o formulario
  // estava aberto. Gravar em db.sac[-1] perderia o que a pessoa acabou de
  // digitar sem dizer nada; reentra na lista.
  if(id){var i=db.sac.findIndex(function(s){return s.id===id;}); if(i>=0){db.sac[i]=obj;}else{db.sac.push(obj);}}else{db.sac.push(obj);}""",
'11. saveSAC nao grava em indice -1')

# ---------------------------------------------------------------- 7
# saveNC: mesma doenca, mesmo remedio
troca("""function saveNC(){
  const id=document.getElementById('ncEditId').value;""",
"""async function saveNC(){
  const id=document.getElementById('ncEditId').value;""",
'12. saveNC async')

troca("""  ncSeq++;
  const obj={
    id:id||uid(),
    num:id?((db.ncs.find(n=>n.id===id)||{}).num||proximoNum(db.ncs,'NC-')):proximoNum(db.ncs,'NC-'),""",
"""  ncSeq++;
  const _ncAnt = id ? (db.ncs.find(n=>n.id===id)||{}) : {};
  const _ncNum = _ncAnt.num || await numeroNovo('ncs','NC-');
  const obj={
    id:id||uid(),
    num:_ncNum,""",
'13. saveNC usa numeroNovo')

troca("""  if(id){const i=db.ncs.findIndex(n=>n.id===id);db.ncs[i]=obj;}else{db.ncs.push(obj);}""",
"""  if(id){const i=db.ncs.findIndex(n=>n.id===id); if(i>=0){db.ncs[i]=obj;}else{db.ncs.push(obj);}}else{db.ncs.push(obj);}""",
'14. saveNC nao grava em indice -1')


# ---------------------------------------------------------------- 8
# Trava de clique duplo. saveSAC/saveNC agora esperam o servidor antes de
# carimbar o numero. Nesse intervalo o botao continua clicavel, e dois cliques
# gerariam dois registros da mesma reclamacao com numeros diferentes.
troca("""async function saveSAC(){
  var id=document.getElementById('sacEditId').value;""",
"""async function saveSAC(){
  if(_salvandoSAC) return;
  var id=document.getElementById('sacEditId').value;""",
'15. saveSAC: trava de clique duplo (entrada)')

troca("""  var _num = (ant && ant.num) || await numeroNovo('sac','SAC-');""",
"""  _salvandoSAC = true;
  var _num;
  try{ _num = (ant && ant.num) || await numeroNovo('sac','SAC-'); }
  finally{ _salvandoSAC = false; }""",
'16. saveSAC: trava de clique duplo (saida)')

troca("""async function saveNC(){
  const id=document.getElementById('ncEditId').value;""",
"""async function saveNC(){
  if(_salvandoNC) return;
  const id=document.getElementById('ncEditId').value;""",
'17. saveNC: trava de clique duplo (entrada)')

troca("""  const _ncNum = _ncAnt.num || await numeroNovo('ncs','NC-');""",
"""  _salvandoNC = true;
  let _ncNum;
  try{ _ncNum = _ncAnt.num || await numeroNovo('ncs','NC-'); }
  finally{ _salvandoNC = false; }""",
'18. saveNC: trava de clique duplo (saida)')

troca("""let _lastLocalSave = 0;""",
"""let _lastLocalSave = 0;
let _salvandoSAC = false, _salvandoNC = false;""",
'19. flags da trava')


io.open(alvo,'w',encoding='utf-8').write(s)
print('OK - %d trocas aplicadas em %s' % (len(trocas), alvo))
for t in trocas: print('   . ' + t)
print('bytes: %d -> %d' % (len(orig), len(s)))
