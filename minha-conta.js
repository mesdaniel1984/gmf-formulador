(function(){
'use strict';
const byId=id=>document.getElementById(id);
const form=byId('passwordForm'), status=byId('accountStatus'), submit=byId('savePassword');
let client, identity=null, busy=false, revision=0;
function clearFields(){byId('newPassword').value='';byId('confirmPassword').value='';}
function locked(message){identity=null;revision++;form.hidden=true;clearFields();status.textContent=message;byId('accountLogin').hidden=false;}
async function verify(){
 const turn=++revision;
 try {
  const {data,error}=await client.auth.getUser();
  if(turn!==revision)return;
  if(error||!data.user||data.user.is_anonymous){locked('Entre na Central para alterar sua senha.');return;}
  identity=data.user.id;byId('accountEmail').textContent=data.user.email;
  form.hidden=false;byId('accountLogin').hidden=true;status.textContent='';
 }catch(e){locked('Não foi possível verificar sua conta. Tente entrar novamente.');}
}
form.addEventListener('submit',async function(event){
 event.preventDefault();
 if(busy||!identity)return;
 const password=byId('newPassword').value, confirmation=byId('confirmPassword').value;
 if(password.length<12){status.textContent='Use pelo menos 12 caracteres.';return;}
 if(password!==confirmation){status.textContent='As senhas não coincidem.';return;}
 busy=true;submit.disabled=true;
 const expectedIdentity=identity, turn=revision;
 try{
  const {data,error}=await client.auth.getUser();
  if(turn!==revision||error||!data.user||data.user.is_anonymous||data.user.id!==expectedIdentity){locked('Sua sessão mudou. Entre novamente antes de alterar a senha.');return;}
  const result=await client.auth.updateUser({password});
  if(result.error){status.textContent=result.error.code==='reauthentication_needed'
   ? 'Entre novamente na Central para confirmar a troca de senha.'
   : 'Não foi possível alterar a senha. Verifique as exigências da conta ou entre novamente.';return;}
  clearFields();status.textContent='Senha da Central atualizada. Use a nova senha no próximo acesso.';
 }catch(e){status.textContent='Não foi possível confirmar a alteração. Verifique sua conexão antes de tentar novamente.';}
 finally{busy=false;submit.disabled=false;}
});
try{
 client=window.supabase.createClient("https://ailzblgrxtdakpkchstl.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbHpibGdyeHRkYWtwa2Noc3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzkzOTEsImV4cCI6MjA5NDI1NTM5MX0.P22Cz4osfMvKBsbXn1jmwDC0ZOmbNQjSB-TBHxu6qRw");
 client.auth.onAuthStateChange(function(event){
  if(event==='SIGNED_OUT')locked('Sessão encerrada. Entre na Central.');
  else if(event==='SIGNED_IN')setTimeout(verify,0);
 });
 verify();
}catch(e){locked('Não foi possível carregar o acesso. Recarregue a página.');}
})();