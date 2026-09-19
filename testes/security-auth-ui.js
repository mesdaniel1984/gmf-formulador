// Security Gate P0 — frontend auth
// Não faz chamadas de rede nem altera dados.
'use strict';
const fs=require('fs');

const files=['login.html','gmf_login.html','register.html'];
let pass=0, fail=0;
function check(v,msg){
  console.log((v?'  ok    ':'  FALHA ')+msg);
  v?pass++:fail++;
}
function read(p){return fs.readFileSync(p,'utf8');}

const login=read('login.html');
const alt=read('gmf_login.html');
const reg=read('register.html');

for(const [name,src] of [['login.html',login],['gmf_login.html',alt],['register.html',reg]]){
  check(!/\.auth\.signUp\s*\(/.test(src), name+' não contém signUp');
  check(!/service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(src), name+' não contém service role');
  check(!/mín\.?\s*6|mínimo\s*6|pelo menos\s*6|length\s*<\s*6/i.test(src), name+' não anuncia política legada de 6 caracteres');
}

for(const [name,src] of [['login.html',login],['gmf_login.html',alt]]){
  check(/shouldCreateUser\s*:\s*false/.test(src), name+' impede criação por Magic Link');
  check(!/Criar conta/i.test(src), name+' não oferece autocadastro');
  check(/signInWithPassword/.test(src), name+' mantém login por senha');
}

check(/Cadastro de contas desativado/i.test(reg),'register.html informa cadastro fechado');
check(!/supabase-js/i.test(reg),'register.html não carrega SDK Supabase');
check(!/createClient\s*\(/.test(reg),'register.html não cria cliente Supabase');

console.log('\n'+pass+' verificações passaram; '+fail+' falharam.');
process.exit(fail?1:0);
