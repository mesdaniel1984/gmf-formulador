'use strict';

const fs=require('fs');

const src=fs.readFileSync('gmf-revisions.js','utf8');
const workspace=fs.readFileSync('gmf-workspace.js','utf8');

let pass=0,fail=0;
function check(v,msg){
  console.log((v?'  ok    ':'  FALHA ')+msg);
  v?pass++:fail++;
}

check(workspace.includes("script.src='gmf-revisions.js'"),'workspace carrega gmf-revisions.js');
check(/\.from\(['"]produto_revisoes['"]\)\s*\.select\(/s.test(src),'UI lê produto_revisoes');
check(src.includes(".from('app_user_roles').select("),'UI lê apenas os próprios papéis');
check(src.includes(".from('perfis').select('readonly')"),'UI lê readonly do perfil');

check(!/\.from\(['"]produto_revisoes['"]\)[\s\S]{0,180}\.(insert|update|delete|upsert)\s*\(/.test(src),
  'UI não escreve diretamente em produto_revisoes');
check(!/\.from\(['"]app_user_roles['"]\)[\s\S]{0,180}\.(insert|update|delete|upsert)\s*\(/.test(src),
  'UI não atribui papéis diretamente');
check(!/service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(src),'UI não contém service-role');

const allowed=[
  'criar_revisao_produto',
  'iniciar_revisao',
  'submeter_revisao_aprovacao',
  'aprovar_revisao_produto',
  'rejeitar_revisao_produto',
  'reabrir_revisao_produto',
  'colocar_revisao_vigente'
];

const rpcMatches=[...src.matchAll(/callRpc\(['"]([^'"]+)['"]/g)].map(m=>m[1]);
check((src.match(/\.rpc\(/g)||[]).length===1,'UI possui um único ponto genérico de chamada RPC');
check(/\.rpc\(name,args\|\|\{\}\)/.test(src),'wrapper RPC recebe somente nome e argumentos');
check(rpcMatches.length>=7,'UI usa RPCs controladas');
check(rpcMatches.every(x=>allowed.includes(x)),'UI só liga ações a RPCs da allowlist');
for(const rpc of allowed)check(rpcMatches.includes(rpc),'RPC '+rpc+' está ligada à UI');

check(src.includes("if(!state.productId||dirty())return"),'criação bloqueia produto sem origem ou com alteração local');
check(src.includes("canApprove(ctx)"),'aprovação depende de papel');
check(src.includes("canEffective(ctx)"),'vigência depende de papel');
check(src.includes("ctx.readonly"),'readonly é respeitado');
check(src.includes("REVISION_CONFLICT"),'conflito de lock é tratado');
check(src.includes("Papéis vêm do banco e não são inferidos pelo cargo."),'UI declara origem dos papéis');

console.log('\n'+pass+' verificações passaram; '+fail+' falharam.');
process.exit(fail?1:0);
