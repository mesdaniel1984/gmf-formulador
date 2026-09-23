(function(){
'use strict';
const status=document.getElementById('centralSessionStatus'),enter=document.getElementById('centralEnter'),out=document.getElementById('centralSignOut');
if(!status||!enter||!out)return;
let client=null,revision=0;
function clear(message){status.textContent=message;enter.hidden=false;out.hidden=true;}
async function refresh(){
 const turn=++revision;
 try{
  const {data,error}=await client.auth.getUser();
  if(turn!==revision)return;
  if(error||!data.user||data.user.is_anonymous){clear('Entre para acessar os módulos com sua conta.');return;}
  status.textContent='Conectado: '+data.user.email;
  enter.hidden=true;out.hidden=false;
 }catch(e){if(turn===revision)clear('Não foi possível verificar a sessão. Tente entrar novamente.');}
}
try{
 if(!window.supabase)throw new Error('SDK indisponível');
 client=window.supabase.createClient("https://ailzblgrxtdakpkchstl.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbHpibGdyeHRkYWtwa2Noc3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzkzOTEsImV4cCI6MjA5NDI1NTM5MX0.P22Cz4osfMvKBsbXn1jmwDC0ZOmbNQjSB-TBHxu6qRw");
 client.auth.onAuthStateChange(function(event){
  if(event==='SIGNED_OUT'){revision++;clear('Sessão encerrada neste navegador.');}
  else if(event==='SIGNED_IN'||event==='USER_UPDATED')setTimeout(refresh,0);
 });
 out.addEventListener('click',async function(){
  out.disabled=true;
  try{const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;revision++;clear('Sessão encerrada neste navegador.');}
  catch(e){status.textContent='Não foi possível sair. Tente novamente.';}
  finally{out.disabled=false;}
 });
 refresh();
}catch(e){clear('Acesso disponível pela página de login.');}
})();