const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('sistema_qualidade_online.html','utf8');
const ini=src.indexOf('async function atualizarCentral(){');
const fim=src.indexOf('\n// Periodo filtra',ini);
assert(ini>0&&fim>ini,'função de atualização encontrada');
const el={cfAtualizarBtn:{disabled:false,textContent:'Atualizar dados'},cfCarimbo:{textContent:'Anterior'},
  cfEmpresa:{value:'DMS',options:[{value:'DMS'}],set innerHTML(v){this.options=v?[{value:'DMS'}]:[];}},
  cfPeriodo:{value:'2026-9',options:[{value:'2026-9'}],set innerHTML(v){this.options=v?[{value:'2026-9'}]:[];}}};
let buscas=0,redraw=0,dirty=false;
const c={document:{getElementById:id=>el[id]},db:{docs:[{id:1}]},_snap:{docs:JSON.stringify([{id:1}])},
  _saveTimer:null,clearTimeout(){},console:{error(){}},Date,Array,Object,JSON,
  async pushChanges(){},async loadDB(){buscas++;this.db={docs:[{id:2}]};this._snap={docs:JSON.stringify(this.db.docs)};},
  renderCentral(){redraw++;if(!el.cfEmpresa.options.length)el.cfEmpresa.options=[{value:'DMS'},{value:'MFParis'}];if(!el.cfPeriodo.options.length)el.cfPeriodo.options=[{value:'2026-9'}];},
  renderDashboard(){},async fiscalCarregar(){}};
// Closure functions in the real browser resolve globals; the mock keeps the same binding.
c.loadDB=async()=>{buscas++;c.db={docs:[{id:2}]};c._snap={docs:JSON.stringify(c.db.docs)};};
vm.createContext(c);vm.runInContext('var db=globalThis.db,_snap=globalThis._snap,_saveTimer=null;let _cUltimaBusca=null;'+src.slice(ini,fim),c);
(async()=>{
  await c.atualizarCentral();
  assert.equal(buscas,1,'atualização consulta o banco');
  assert.equal(redraw,2,'painel redesenhado com filtros preservados');
  assert.equal(el.cfEmpresa.value,'DMS');assert.match(el.cfCarimbo.textContent,/Consultando/);
  c.db.docs=[{id:3}];c._snap.docs=JSON.stringify([{id:2}]);
  await c.atualizarCentral();
  assert.equal(buscas,1,'alteração local pendente impede recarga destrutiva');
  assert.match(el.cfCarimbo.textContent,/Falha ao buscar dados/);
  assert.equal(el.cfAtualizarBtn.disabled,false);
  c.db.docs=[{id:2}];c._snap.docs=JSON.stringify(c.db.docs);
  c.loadDB=async()=>{c.db={};c._snap={};throw Error('Falha de rede');};
  await c.atualizarCentral();
  assert.equal(c.db.docs[0].id,2,'falha da rede mantém os dados já exibidos');
  assert.equal(buscas,1,'falha da rede não simula carga bem-sucedida');
  assert.match(el.cfCarimbo.textContent,/Falha de rede/);
  console.log('Atualização Central: consulta real e preservação de alterações pendentes passaram.');
})().catch(e=>{console.error(e);process.exitCode=1;});
