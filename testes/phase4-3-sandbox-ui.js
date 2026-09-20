'use strict';

const fs=require('fs');

const src=fs.readFileSync('gmf-sandbox.js','utf8');
const workspace=fs.readFileSync('gmf-workspace.js','utf8');

let pass=0,fail=0;
function check(v,msg){
  console.log((v?'  ok    ':'  FALHA ')+msg);
  v?pass++:fail++;
}

check(workspace.includes("script.src='gmf-sandbox.js'"),'workspace carrega gmf-sandbox.js');
check(src.includes(".from('produto_sandboxes')"),'UI lê produto_sandboxes');
check(src.includes(".from('produto_revisoes')"),'UI lê revisões para comparação/base');
check(src.includes(".from('app_user_roles')"),'UI lê papéis do usuário');
check(src.includes(".from('perfis')"),'UI lê readonly do perfil');
check(src.includes(".from('produtos')"),'UI lê produto salvo para comparação');

for(const table of ['produto_sandboxes','produto_revisoes','app_user_roles','produtos']){
  const direct=new RegExp("\\.from\\(['\"]"+table+"['\"]\\)[\\s\\S]{0,220}\\.(insert|update|delete|upsert)\\s*\\(");
  check(!direct.test(src),'UI não escreve diretamente em '+table);
}

check(!/service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(src),'UI não contém service-role');

const allowed=[
  'criar_sandbox_produto',
  'atualizar_sandbox_produto',
  'arquivar_sandbox_produto',
  'promover_sandbox_revisao'
];
const calls=[...src.matchAll(/callRpc\(['"]([^'"]+)['"]/g)].map(m=>m[1]);
check((src.match(/\.rpc\(/g)||[]).length===1,'UI possui um único wrapper genérico de RPC');
check(/\.rpc\(name,args\|\|\{\}\)/.test(src),'wrapper RPC usa nome e argumentos controlados');
check(calls.length>=4,'UI liga as quatro ações de mutação');
check(calls.every(x=>allowed.includes(x)),'UI só liga ações a RPCs da allowlist');
for(const rpc of allowed)check(calls.includes(rpc),'RPC '+rpc+' está ligada à UI');

check(src.includes("arr[idx].qtde="),'editor altera quantidade do ingrediente');
check(!/arr\[idx\]\.(ref|nome|nomeExib)\s*=/.test(src),'editor não altera identidade técnica do ingrediente');
check(src.includes("if(base==='current'&&dirty())"),'criação baseada no produto atual bloqueia alteração local não salva');

check(src.includes("hasRole(ctx,'rd')||hasRole(ctx,'admin')"),'manutenção exige P&D/Admin');
check(src.includes("hasRole(ctx,'quality')||hasRole(ctx,'regulatory')"),'consulta contempla Qualidade/Regulatório');
check(src.includes("Sandbox não representa aprovação, vigência ou fórmula oficial."),'UI declara natureza não oficial');
check(src.includes("Selecione um produto cadastrado antes de abrir o Sandbox."),'UI orienta quando nenhum produto salvo está selecionado');
check(src.includes("if(!selected||selected.id==null)"),'UI intercepta novo produto antes de consultar o banco');

check(src.includes("Math.abs(formulaTotal(snapshot)-1000)<=0.001"),'baseline atual de 1000 é calculado como alerta');
check(!/formulaBalanced\([^)]*\)\s*\{?\s*return/.test(src.split("promover_sandbox_revisao")[0].slice(-1200)),'promoção não é implicitamente bloqueada pelo total');

check(src.includes("formulaDiff("),'UI possui diff de fórmula');
check(src.includes("scalarDiff("),'UI possui diff de outros campos');
check(src.includes("Somente leitura. Nenhum dado é alterado."),'comparação é declarada somente leitura');

console.log('\n'+pass+' verificações passaram; '+fail+' falharam.');
process.exit(fail?1:0);
