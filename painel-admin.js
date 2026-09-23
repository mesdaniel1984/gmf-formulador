(function(root){
  'use strict';
  function day(value){
    const s=String(value||'').trim();
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if(!m){const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(br)m=[br[0],br[3],br[2],br[1]];}
    if(!m)return null;
    const iso=m[1]+'-'+m[2]+'-'+m[3],d=new Date(iso+'T12:00:00Z');
    return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===iso?iso:null;
  }
  function period(rows,from,to){
    if(!Array.isArray(rows))return null;
    return rows.filter(r=>{if(!from&&!to)return true;const d=day(r.data);return d&&(!from||d>=from)&&(!to||d<=to);});
  }
  function model(data,from,to,today){
    const sources=data.fontes||{}, list=k=>sources[k]&&sources[k].registros;
    const filtered=k=>period(list(k),from,to);
    const groups=[
      {key:'laudos',label:'Laudos emitidos',rows:period(data.laudos,from,to),href:'gmf_formulador_wizard.html',source:'Laudos GMF',emitted:true},
      {key:'ncs',label:'NC abertas',rows:filtered('ncs'),closed:'Fechada',href:'sistema_qualidade_online.html',source:'Ocorrências SGQ'},
      {key:'sac',label:'SAC em tratativa no SGQ',rows:filtered('sac'),closed:'Encerrada',href:'sistema_qualidade_online.html',source:'SAC SGQ'},
      {key:'entrada_sac',label:'Entradas SAC novas',rows:period(data.entrada_sac,from,to),only:'NOVA',href:'sistema_qualidade_online.html',source:'Fila de entrada SAC'},
      {key:'atendimento_humano',label:'Conversas humanas abertas',rows:period(data.atendimento_humano,from,to),only:'ABERTO',href:'conversas.html',source:'Fila de conversas WhatsApp'},
      {key:'licencas',label:'Licenças e alvarás cadastrados',rows:list('licencas'),href:'sistema_qualidade_online.html',source:'Licenças SGQ'}
    ];
    groups.forEach(g=>{
      if(!Array.isArray(g.rows)){g.rows=null;g.count=null;return;}
      if(g.emitted)g.rows=g.rows.filter(r=>r.status==='Emitido');
      if(g.closed)g.rows=g.rows.filter(r=>r.status!==g.closed);
      if(g.only)g.rows=g.rows.filter(r=>r.status===g.only);
      g.count=g.rows.length;
      g.updated=sources[g.key]&&sources[g.key].atualizado_em;
    });
    const alerts=[];
    ['licencas','docs','planoacao','ncs','sac'].forEach(k=>{
      const rows=list(k);if(!Array.isArray(rows))return;
      rows.forEach(r=>{
        if(['Fechada','Encerrada','Concluída','Obsoleto'].includes(r.status))return;
        const due=day(r.prazo);if(!due||due>=today)return;
        alerts.push({source:k,title:r.numero||r.titulo||'Registro sem identificação',due,responsible:r.responsavel||'Responsável não informado'});
      });
    });
    alerts.sort((a,b)=>a.due.localeCompare(b.due));
    return {groups,alerts};
  }
  if(typeof module==='object'&&module.exports){module.exports={day,period,model};return;}
  const el=id=>document.getElementById(id);
  const key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbHpibGdyeHRkYWtwa2Noc3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzkzOTEsImV4cCI6MjA5NDI1NTM5MX0.P22Cz4osfMvKBsbXn1jmwDC0ZOmbNQjSB-TBHxu6qRw';
  let sb,data=null,selected='laudos',generation=0;
  function clear(message){data=null;el('painel').hidden=true;el('indicadores').replaceChildren();el('registros').replaceChildren();el('alertas').replaceChildren();el('analise').replaceChildren();el('analise-registros').replaceChildren();el('analise-detalhe').hidden=true;el('mensagem').textContent=message;}
  function row(title,detail){const d=document.createElement('div');d.className='record';const b=document.createElement('strong');b.textContent=title;const s=document.createElement('span');s.textContent=detail;d.append(b,s);return d;}
  function paint(){
    if(!data)return;
    const from=el('inicio').value,to=el('fim').value;
    el('analise-detalhe').hidden=true;el('analise-registros').replaceChildren();
    if(from&&to&&from>to){el('mensagem').textContent='A data inicial deve ser anterior ou igual à final.';el('indicadores').replaceChildren();el('registros').replaceChildren();el('analise').replaceChildren();el('alertas').replaceChildren();return;}
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const m=model(data,from,to,today);
    root.GMFAdminAnalytics.render(el('analise'),root.GMFAdminAnalytics.build(data,{source:el('analise-fonte').value,from,to,today},day),(title,rows,definition)=>{
      el('analise-detalhe-titulo').textContent=title;el('analise-definicao').textContent=definition;
      el('analise-registros').replaceChildren();
      if(!rows.length)el('analise-registros').textContent='Nenhum registro neste recorte.';
      rows.forEach(r=>el('analise-registros').append(row([r.numero,r.titulo].filter(Boolean).join(' · ')||'Registro sem identificação',[r.status,r.data?'Abertura '+r.data:null,r.prazo?'Prazo '+r.prazo:null,r.responsavel].filter(Boolean).join(' · '))));
      el('analise-detalhe').hidden=false;el('analise-detalhe').scrollIntoView({block:'nearest'});
    });
    el('mensagem').textContent='Acesso Admin validado. Dados consultados nas fontes abaixo.';
    el('indicadores').replaceChildren();
    m.groups.forEach(g=>{const b=document.createElement('button');b.type='button';b.className='metric';b.setAttribute('aria-pressed',String(g.key===selected));
      const label=document.createElement('span');label.textContent=g.label;const value=document.createElement('strong');value.textContent=g.count===null?'—':String(g.count);
      const note=document.createElement('small');note.textContent=g.count===null?'Fonte indisponível ou sem permissão':g.source;
      b.append(label,value,note);b.onclick=()=>{selected=g.key;paint();};el('indicadores').append(b);
    });
    el('alertas').replaceChildren();
    if(!m.alerts.length)el('alertas').textContent='Nenhum prazo vencido identificado nas fontes disponíveis. Registros sem prazo não entram nesta contagem.';
    m.alerts.forEach(a=>el('alertas').append(row(a.title,a.source+' · vencimento '+a.due+' · '+a.responsible)));
    const g=m.groups.find(x=>x.key===selected)||m.groups[0];el('detalhe-titulo').textContent=g.label;el('origem').href=g.href;
    el('detalhe-fonte').textContent=g.source+(g.updated?' · Última gravação da fonte: '+new Date(g.updated).toLocaleString('pt-BR'):'')+' · Registros sem data ficam fora de filtros por período.';
    el('registros').replaceChildren();
    if(g.rows===null)el('registros').textContent='Dados indisponíveis. A Administração também precisa de autorização no módulo de origem.';
    else if(!g.rows.length)el('registros').textContent='Nenhum registro atende ao filtro.';
    else g.rows.forEach(r=>el('registros').append(row([r.numero,r.titulo].filter(Boolean).join(' · ')||'Atendimento humano',[(day(r.data)||'Data não informada'),r.status,r.lote?'Lote '+r.lote:null,r.empresa,day(r.prazo)?'Prazo '+day(r.prazo):null,r.responsavel].filter(Boolean).join(' · '))));
    el('carimbo').textContent='Consulta ao banco: '+new Date(data.consultado_em).toLocaleString('pt-BR')+'. Rondas e OMIE ainda não integrados a este painel.';
  }
  async function load(){
    const current=++generation;clear('Validando acesso e consultando dados…');el('entrar').hidden=true;el('atualizar').disabled=true;
    try{
      if(!sb)throw new Error('CLIENT');
      const session=await sb.auth.getSession();if(current!==generation)return;
      if(session.error||!session.data.session){clear('Entre para acessar o painel gerencial.');el('entrar').hidden=false;return;}
      const r=await sb.rpc('painel_admin_dados');if(current!==generation)return;
      if(r.error){clear(r.error.code==='42501'?'Este painel é exclusivo da Administração.':'Não foi possível consultar os dados. Tente atualizar.');return;}
      if(!r.data||!r.data.consultado_em)throw new Error('DATA');
      data=r.data;el('painel').hidden=false;paint();
    }catch(e){if(current===generation)clear('Não foi possível carregar o painel. Verifique a conexão e tente atualizar.');}
    finally{if(current===generation)el('atualizar').disabled=false;}
  }
  el('atualizar').onclick=load;['inicio','fim','analise-fonte'].forEach(id=>el(id).onchange=paint);
  el('fechar-analise').onclick=()=>{el('analise-detalhe').hidden=true;};
  el('ultimos90').onclick=()=>{const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());el('inicio').value=root.GMFAdminAnalytics.offset(today,-89);el('fim').value=today;paint();};
  el('limpar').onclick=()=>{el('inicio').value='';el('fim').value='';paint();};
  el('sair').onclick=async()=>{++generation;clear('Encerrando sessão…');if(sb){const r=await sb.auth.signOut();if(r.error){clear('Não foi possível encerrar a sessão. Tente novamente.');return;}}location.href='login.html?next=admin';};
  try{sb=root.supabase.createClient('https://ailzblgrxtdakpkchstl.supabase.co',key);
    sb.auth.onAuthStateChange(event=>{
      if(event==='SIGNED_OUT'){++generation;clear('Sessão encerrada. Entre novamente.');el('entrar').hidden=false;el('atualizar').disabled=false;}
      if(event==='SIGNED_IN'||event==='USER_UPDATED'){++generation;clear('Revalidando acesso…');setTimeout(load,0);}
    });
  }catch(e){/* load displays a recoverable failure */}
  load();
})(typeof window==='object'?window:globalThis);
