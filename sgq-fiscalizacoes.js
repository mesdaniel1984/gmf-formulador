/* Fiscalizações e decisões de equivalência. Registros mantidos no banco com RLS. */
let fiscalRegistros=[],fiscalExigencias=[],fiscalDocumentos=[],fiscalEquivalencias=[];
let fiscalPodeEscrever=false,fiscalSelecionada=null;
const fiEl=id=>document.getElementById(id);
const fiEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fiVal=id=>fiEl(id).value.trim();
function fiscalErro(e){const mensagem=e&&e.message||String(e);
  fiEl('fiscalAviso').textContent=mensagem==='Failed to fetch'?'Falha de conexão. A ação não foi concluída; confira o registro antes de tentar novamente.':mensagem;
  fiEl('fiscalAviso').style.color='#b91c1c';}
async function fiscalCarregar(){
  try{
    const role=await sb.rpc('fiscal_pode_escrever');
    if(role.error)throw role.error;
    fiscalPodeEscrever=!!role.data;
    const queries=await Promise.all(['fiscalizacoes','fiscalizacao_exigencias','fiscalizacao_documentos','fiscalizacao_equivalencias'].map(t=>sb.from(t).select('*')));
    const err=queries.find(q=>q.error);if(err)throw err.error;
    [fiscalRegistros,fiscalExigencias,fiscalDocumentos,fiscalEquivalencias]=queries.map(q=>q.data||[]);
    fiEl('fiscalNovoBtn').style.display=fiscalPodeEscrever?'':'none';
    fiEl('fiscalAviso').textContent='';
    fiscalRender();
    if(typeof renderAnal==='function')renderAnal();
  }catch(e){
    fiscalRegistros=[];fiscalExigencias=[];fiscalDocumentos=[];fiscalEquivalencias=[];
    fiscalPodeEscrever=false;fiEl('fiscalNovoBtn').style.display='none';fiscalErro(e);
  }
}
function fiscalRender(){
  const lista=fiEl('fiscalLista');if(!lista)return;
  const ativas=fiscalRegistros.filter(f=>['Aberta','Em atendimento'].includes(f.situacao));
  const historicas=fiscalRegistros.filter(f=>f.situacao==='Histórico a validar');
  const vencidas=ativas.filter(f=>f.prazo_resposta&&f.prazo_resposta<today());
  const filtro=fiEl('fiscalFiltroEstado').dataset.atual||fiVal('fiscalFiltroEstado'),empresa=fiVal('fiscalFiltroEmpresa');
  const metricas=[['urgente','Prazos vencidos',vencidas.length,'Resposta a conferir','vencidas'],
    ['ativo','Em atendimento',ativas.length,'Demandas em curso','ativas'],
    ['historico','Histórico a validar',historicas.length,'Confirmar situação e documentos','Histórico a validar'],
    ['fechado','Concluídas',fiscalRegistros.filter(f=>f.situacao==='Concluída').length,'Com evidência de fechamento','Concluída']];
  fiEl('fiscalResumo').innerHTML=metricas.map(([cor,titulo,total,apoio,chave])=>`<button class="fiscal-metrica ${cor}" type="button" aria-pressed="${filtro===chave}" onclick="fiscalFiltrar('${chave}')"><span>${titulo}</span><strong>${total}</strong><small>${apoio}</small></button>`).join('');
  const busca=fiVal('fiscalBusca').toLocaleLowerCase('pt-BR');
  const visiveis=fiscalRegistros.filter(f=>(!empresa||f.empresa===empresa)
    &&(!filtro||f.situacao===filtro||filtro==='ativas'&&ativas.includes(f)||filtro==='vencidas'&&vencidas.includes(f))
    &&(!busca||[f.orgao,f.processo,f.empresa,f.responsavel].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(busca))))
    .sort((a,b)=>Number(!!b.prazo_resposta&&b.prazo_resposta<today()&&b.situacao!=='Concluída'&&b.situacao!=='Histórico a validar')
      -Number(!!a.prazo_resposta&&a.prazo_resposta<today()&&a.situacao!=='Concluída'&&a.situacao!=='Histórico a validar')
      ||b.data_fiscalizacao.localeCompare(a.data_fiscalizacao));
  fiEl('fiscalContagem').textContent=`${visiveis.length} de ${fiscalRegistros.length} processos`;
  if(!visiveis.some(f=>f.id===fiscalSelecionada))fiscalSelecionada=visiveis[0]?.id||null;
  lista.innerHTML=visiveis.map(f=>{
    const tarefas=fiscalExigencias.filter(x=>x.fiscalizacao_id===f.id&&x.situacao!=='Cumprida').length;
    const atraso=f.situacao!=='Histórico a validar'&&f.situacao!=='Concluída'&&f.prazo_resposta&&f.prazo_resposta<today();
    return `<button class="fiscal-item" type="button" aria-current="${f.id===fiscalSelecionada}" onclick="fiscalAbrir('${f.id}')"><span class="fiscal-item-top"><strong>${fiEsc(f.orgao)} · ${fiEsc(f.processo)}</strong>${statusBadge(f.situacao)}</span><small>${fiEsc(f.empresa)} · ${fmtDate(f.data_fiscalizacao)}${atraso?' · Prazo vencido':f.prazo_resposta?' · Prazo '+fmtDate(f.prazo_resposta):''}</small><small>${tarefas} encaminhamento${tarefas===1?'':'s'} pendente${tarefas===1?'':'s'} · ${fiEsc(f.responsavel)}</small></button>`;
  }).join('')||'<div class="fiscal-vazio">Nenhum processo corresponde aos filtros. Limpe a busca para ver toda a fila.</div>';
  if(fiscalSelecionada)fiscalAbrir(fiscalSelecionada);else fiEl('fiscalDetalhe').innerHTML='<div class="fiscal-vazio">Selecione um processo na fila para ver as ações e documentos.</div>';
}
function fiscalFiltrar(chave){const filtro=fiEl('fiscalFiltroEstado');
  const novo=(filtro.dataset.atual||filtro.value)===chave?'':chave;
  filtro.value=novo==='ativas'||novo==='vencidas'?'':novo;filtro.dataset.atual=novo;fiscalRender();}
function fiscalNovo(id){
  if(!fiscalPodeEscrever)return;
  const f=fiscalRegistros.find(r=>r.id===id)||{};
  fiEl('fiId').value=f.id||'';fiEl('fiEmpresa').value=f.empresa||'DMS';
  fiEl('fiOrgao').value=f.orgao||'MAPA';fiEl('fiOrgaoOutro').value=f.orgao_outro||'';
  fiEl('fiProcesso').value=f.processo||'';fiEl('fiData').value=f.data_fiscalizacao||today();
  fiEl('fiPrazo').value=f.prazo_resposta||'';fiEl('fiResponsavel').value=f.responsavel||'';
  fiEl('fiSituacao').value=f.situacao||'Aberta';fiEl('fiObs').value=f.observacao||'';
  fiEl('fiDocumentos').value='';
  fiEl('fiscalModalTitulo').textContent=f.id?'Editar fiscalização':'Registrar fiscalização';
  fiEl('fiscalModal').classList.add('open');
}
async function fiscalSalvar(){
  if(!fiscalPodeEscrever)return;
  if(!fiVal('fiProcesso')||!fiVal('fiData')||!fiVal('fiResponsavel'))return alert('Preencha processo, data e responsável.');
  const v={empresa:fiVal('fiEmpresa'),orgao:fiVal('fiOrgao'),orgao_outro:fiVal('fiOrgaoOutro')||null,
    processo:fiVal('fiProcesso'),data_fiscalizacao:fiVal('fiData'),prazo_resposta:fiVal('fiPrazo')||null,
    responsavel:fiVal('fiResponsavel'),situacao:fiVal('fiSituacao'),observacao:fiVal('fiObs')};
  const id=fiVal('fiId'),files=Array.from(fiEl('fiDocumentos').files||[]);
  if(files.some(file=>!['application/pdf','image/png','image/jpeg'].includes(file.type)||file.size>10485760))
    return alert('Cada documento deve ser PDF, PNG ou JPG com até 10 MB.');
  fiEl('fiSalvar').disabled=true;
  try{
    const r=id?await sb.from('fiscalizacoes').update(v).eq('id',id).select('id').single():
      await sb.from('fiscalizacoes').insert(v).select('id').single();
    if(r.error)throw r.error;
    fiscalSelecionada=r.data.id;closeModal('fiscalModal');await fiscalCarregar();
    for(const file of files)await fiscalEnviarArquivo(file);
    if(files.length)await fiscalCarregar();
  }catch(e){fiscalErro(e);}finally{fiEl('fiSalvar').disabled=false;}
}
function fiscalAbrir(id){
  const f=fiscalRegistros.find(r=>r.id===id);if(!f)return;
  fiscalSelecionada=id;const ex=fiscalExigencias.filter(x=>x.fiscalizacao_id===id);
  const docs=fiscalDocumentos.filter(x=>x.fiscalizacao_id===id);
  const analises=(typeof db==='object'?db.analises||[]:[]).filter(a=>a.fiscalizacaoId===id);
  const eqs=fiscalEquivalencias.filter(e=>e.fiscalizacao_id===id);
  const write=fiscalPodeEscrever;
  const origem=String(f.observacao||'');
  const fontes=[...new Set(origem.match(/https:\/\/onedrive\.live\.com\?cid=[A-Za-z0-9]+&id=[A-Za-z0-9!]+/g)||[])];
  const nota=origem.replace(/https:\/\/onedrive\.live\.com\?cid=[A-Za-z0-9]+&id=[A-Za-z0-9!]+/g,'[documento no OneDrive]');
  const atraso=f.situacao!=='Concluída'&&f.situacao!=='Histórico a validar'&&f.prazo_resposta&&f.prazo_resposta<today();
  fiEl('fiscalLista').querySelectorAll('.fiscal-item').forEach(el=>el.setAttribute('aria-current',String(el.getAttribute('onclick')?.includes(id))));
  fiEl('fiscalDetalhe').innerHTML=`<div class="fiscal-titulo"><div><span class="fiscal-muted">${fiEsc(f.empresa)} · ${fmtDate(f.data_fiscalizacao)}</span>
      <h3>${fiEsc(f.orgao)} · ${fiEsc(f.processo)}</h3></div>${statusBadge(f.situacao)}</div>
    <div class="fiscal-dados"><div><small>Coordenação interna</small><strong>${fiEsc(f.responsavel)}</strong></div>
      <div><small>Prazo de resposta</small><strong>${atraso?'⚠️ ':''}${f.prazo_resposta?fmtDate(f.prazo_resposta):'A confirmar'}</strong></div></div>
    <div class="fiscal-acoes">${write?`<button class="btn btn-primary" onclick="fiscalEditarExigencia()">+ Encaminhar ação</button>
      <button class="btn btn-outline" onclick="fiscalNovo('${id}')">${f.situacao==='Histórico a validar'?'Validar situação':'Editar processo'}</button>`:''}</div>
    ${f.situacao==='Histórico a validar'?'<p class="fiscal-nota" style="margin-top:14px">Registro histórico. Confirme a situação, o prazo e a resposta oficial antes de tratá-lo como pendência atual.</p>':''}
    <div id="fiscalDecisao"></div>
    <div class="fiscal-bloco"><h4>Encaminhamentos · ${ex.length}</h4>
    ${ex.slice().sort((a,b)=>Number(a.situacao==='Cumprida')-Number(b.situacao==='Cumprida')||(a.prazo||'9999').localeCompare(b.prazo||'9999')).map(x=>`<div class="fiscal-tarefa ${x.situacao==='Cumprida'?'cumprida':''}">
      <div class="fiscal-titulo"><strong>${fiEsc(x.descricao)}</strong>${statusBadge(x.situacao)}</div>
      <p><b>Destino:</b> ${fiEsc(x.responsavel)} · <b>Prazo:</b> ${x.prazo?fmtDate(x.prazo):'A definir'}</p>
      ${x.evidencia?`<p><b>Evidência:</b> ${fiEsc(x.evidencia)}</p>`:''}
      ${write?`<button class="btn btn-sm btn-outline" onclick="fiscalEditarExigencia('${x.id}')">Atualizar ação</button>`:''}</div>`).join('')||'<p class="fiscal-muted">Nenhuma ação atribuída. Encaminhe a exigência para uma área e defina um prazo.</p>'}</div>
    <div class="fiscal-bloco"><h4>Documentos e origem · ${docs.length+fontes.length}</h4>
    ${docs.map(d=>`<p><button class="btn btn-sm btn-outline" onclick="fiscalAbrirDocumento('${d.id}')">📎 ${fiEsc(d.nome)}</button></p>`).join('')}
    ${fontes.map((url,i)=>`<p><a href="${fiEsc(url)}" target="_blank" rel="noopener noreferrer">↗ Abrir documento ${i+1} no OneDrive</a></p>`).join('')}
    ${!docs.length&&!fontes.length?'<p class="fiscal-muted">Nenhum documento relacionado.</p>':''}
    ${write?`<label class="fiscal-muted">Anexar PDF, PNG ou JPG (até 10 MB) <input type="file" accept=".pdf,.png,.jpg,.jpeg" multiple onchange="fiscalUpload(event)"></label>`:''}</div>
    <div class="fiscal-bloco"><h4>Resumo e contexto</h4><p class="fiscal-nota">${fiEsc(nota)||'Sem observações.'}</p></div>
    <div class="fiscal-bloco"><h4>Análises oficiais</h4>
    ${analises.map(a=>`<p>${fiEsc(a.produto)} · ${fiEsc(a.laudo||'sem nº de laudo')} · ${fmtDate(a.data)}
      ${eqs.some(e=>e.analise_id===a.id&&!e.revogada_em)?'<span class="badge ok">Equivalência aprovada</span>':'<span class="badge warn">Não dá baixa no plano</span>'}
      ${write&&a.status==='Aprovado'&&!eqs.some(e=>e.analise_id===a.id&&!e.revogada_em)?`<button class="btn btn-sm btn-outline" onclick="fiscalFormularioEquivalencia('${fiEsc(a.id)}')">Avaliar equivalência</button>`:''}</p>`).join('')||'<p>Nenhum laudo oficial vinculado.</p>'}
    ${write?`<button class="btn btn-sm btn-outline" onclick="fiscalCriarAnalise('${id}')">+ Vincular laudo oficial</button>`:''}</div>
    <div class="fiscal-bloco"><h4>Decisões de equivalência</h4>
    ${eqs.map(e=>`<p>${fiEsc(e.numero_laudo)} · ${fiEsc(e.produto)} · plano ${fiEsc(e.plano_id)} · próximo prazo ${fmtDate(e.proximo_prazo)} · ${e.revogada_em?'Revogada em '+fiEsc(e.revogada_em.slice(0,10)):'Aprovada'}<br>
      Responsável: ${fiEsc(e.aprovada_por)} · Justificativa: ${fiEsc(e.justificativa)}
      ${e.revogada_em?`<br>Revogação: ${fiEsc(e.motivo_revogacao)}`:write?`<button class="btn btn-sm btn-danger" onclick="fiscalRevogar('${e.id}')">Revogar</button>`:''}</p>`).join('')||'<p>Nenhuma decisão registrada.</p>'}
    </div>`;
}
function fiscalEditarExigencia(id){
  if(!fiscalPodeEscrever||!fiscalSelecionada)return;
  const x=fiscalExigencias.find(y=>y.id===id)||{};
  const areas=['Qualidade','Produção','P&D','Manutenção','Logística','Comercial','Diretoria','Jurídico','Outros'];
  const destino=String(x.responsavel||'').split(' · ');
  const area=areas.includes(destino[0])?destino[0]:'Outros';
  const pessoa=area==='Outros'?x.responsavel||'':destino.slice(1).join(' · ');
  fiEl('fiscalDecisao').innerHTML=`<div class="fiscal-form"><h4>${id?'Atualizar encaminhamento':'Novo encaminhamento'}</h4>
    <label for="fxDescricao">O que a área precisa fazer? *</label>
    <textarea id="fxDescricao" rows="3" maxlength="2000" placeholder="Descreva a exigência e o resultado esperado">${fiEsc(x.descricao)}</textarea>
    <div class="fiscal-form-grid"><div><label for="fxArea">Área responsável *</label>
    <select id="fxArea">${areas.map(a=>`<option ${area===a?'selected':''}>${a}</option>`).join('')}</select></div>
    <div><label for="fxResponsavel">Pessoa responsável *</label><input id="fxResponsavel" maxlength="120" value="${fiEsc(pessoa)}" placeholder="Nome da pessoa"></div>
    <div><label for="fxPrazo">Prazo da ação *</label><input id="fxPrazo" type="date" value="${fiEsc(x.prazo||'')}"></div>
    <div><label for="fxSituacao">Andamento</label><select id="fxSituacao">${['Pendente','Em andamento','Cumprida'].map(s=>`<option ${x.situacao===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
    <label for="fxEvidencia">Evidência ou resposta (obrigatória para concluir)</label>
    <textarea id="fxEvidencia" rows="2" maxlength="2000" placeholder="Registro do que foi feito e onde consultar a evidência">${fiEsc(x.evidencia||'')}</textarea>
    <div class="fiscal-acoes" style="margin-top:12px"><button class="btn btn-primary" id="fxSalvar" onclick="fiscalSalvarExigencia('${id||''}')">Salvar encaminhamento</button>
    <button class="btn btn-outline" onclick="document.getElementById('fiscalDecisao').innerHTML=''">Cancelar</button></div></div>`;
  fiEl('fiscalDecisao').scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function fiscalSalvarExigencia(id){
  if(!fiVal('fxDescricao')||!fiVal('fxResponsavel')||!fiVal('fxPrazo'))return alert('Informe a ação, a pessoa responsável e o prazo.');
  if(fiVal('fxSituacao')==='Cumprida'&&!fiVal('fxEvidencia'))return alert('Registre a evidência antes de concluir a ação.');
  const v={descricao:fiVal('fxDescricao'),prazo:fiVal('fxPrazo'),responsavel:(fiVal('fxArea')+' · '+fiVal('fxResponsavel')).slice(0,160),situacao:fiVal('fxSituacao'),evidencia:fiVal('fxEvidencia')};
  fiEl('fxSalvar').disabled=true;
  try{const r=id?await sb.from('fiscalizacao_exigencias').update(v).eq('id',id):await sb.from('fiscalizacao_exigencias').insert({...v,fiscalizacao_id:fiscalSelecionada});
    if(r.error)throw r.error;await fiscalCarregar();}catch(e){fiscalErro(e);fiEl('fxSalvar').disabled=false;}
}
async function fiscalEnviarArquivo(file){
  if(!file||!fiscalSelecionada||!fiscalPodeEscrever)throw new Error('Selecione uma fiscalização antes de anexar.');
  const tipos={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'};
  if(!tipos[file.type]||file.size>10485760)throw new Error('Arquivo inválido. Use PDF, PNG ou JPG com até 10 MB.');
  const path=`fiscalizacoes/${fiscalSelecionada}/${crypto.randomUUID()}.${tipos[file.type]}`;
  const up=await sb.storage.from('fiscalizacoes').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
  const row=await sb.from('fiscalizacao_documentos').insert({fiscalizacao_id:fiscalSelecionada,nome:file.name.slice(0,255),caminho:path});
  if(row.error)throw row.error;
}
async function fiscalUpload(ev){
  const files=Array.from(ev.target.files||[]);if(!files.length)return;
  try{
    for(const file of files)await fiscalEnviarArquivo(file);
    await fiscalCarregar();
  }catch(e){fiscalErro(e);}
}
async function fiscalAbrirDocumento(id){
  const doc=fiscalDocumentos.find(d=>d.id===id);if(!doc)return;
  const aba=window.open('','_blank');
  try{const r=await sb.storage.from('fiscalizacoes').createSignedUrl(doc.caminho,60);if(r.error)throw r.error;
    if(aba)aba.location=r.data.signedUrl;else location.href=r.data.signedUrl;
  }catch(e){if(aba)aba.close();fiscalErro(e);}
}
function fiscalPreencherSelect(id){
  fiEl('aFiscalizacaoId').innerHTML='<option value="">Selecione</option>'+fiscalRegistros.map(f=>`<option value="${f.id}">${fiEsc(f.orgao)} · ${fiEsc(f.processo)}</option>`).join('');
  fiEl('aFiscalizacaoId').value=id||'';
}
function fiscalMostrarOrigemAnalise(){
  const oficial=fiVal('aOrigem')==='OFICIAL';
  fiEl('aFiscalizacaoWrap').style.display=oficial?'':'none';fiEl('aOficialCampos').style.display=oficial?'':'none';
  ['aFiscalizacaoId','aAmostra','aCriterios'].forEach(id=>fiEl(id).required=oficial);
}
function fiscalCriarAnalise(id){
  showSection('analises');openAnalModal(null,null,null);
  fiEl('aOrigem').value='OFICIAL';fiscalPreencherSelect(id);fiscalMostrarOrigemAnalise();
  fiEl('aEmpresa').value=fiscalRegistros.find(f=>f.id===id).empresa;
}
function fiscalFormularioEquivalencia(id){
  if(!fiscalPodeEscrever)return;
  const a=db.analises.find(x=>x.id===id);
  if(!a||!a.planoId)return alert('O laudo precisa estar vinculado a um plano aprovado.');
  const checks=['produto','amostra','parametros','criterios'];
  fiEl('fiscalDecisao').innerHTML=`<h4>Avaliar equivalência · ${fiEsc(a.laudo)}</h4><p>Confirme a cobertura pelo laudo e pelos critérios do plano. Somente a Qualidade pode aprovar.</p>
    ${checks.map((c,i)=>`<label style="display:block;margin:8px 0"><input id="fc${c}" type="checkbox"> ${['Produto corresponde ao plano','Amostra representa o controle programado','Parâmetros cobrem o plano','Critérios e limites atendem ao plano'][i]}</label>`).join('')}
    <label>Justificativa da decisão <textarea id="fcJustificativa" minlength="20" maxlength="2000" placeholder="Descreva a avaliação técnica e eventual diferença de escopo"></textarea></label>
    <button id="fcAprovar" class="btn btn-primary" onclick="fiscalAprovar('${fiEsc(id)}')">Aprovar equivalência e calcular próximo prazo</button>`;
}
async function fiscalAprovar(id){
  const a=db.analises.find(x=>x.id===id);if(!a)return;
  const args={p_fiscalizacao:a.fiscalizacaoId,p_analise:id,p_plano:a.planoId,p_justificativa:fiVal('fcJustificativa'),
    p_produto:fiEl('fcproduto').checked,p_amostra:fiEl('fcamostra').checked,p_parametros:fiEl('fcparametros').checked,p_criterios:fiEl('fccriterios').checked};
  if(!args.p_produto||!args.p_amostra||!args.p_parametros||!args.p_criterios||args.p_justificativa.length<20)
    return alert('Confirme os quatro requisitos e justifique a decisão com pelo menos 20 caracteres.');
  fiEl('fcAprovar').disabled=true;
  try{const r=await sb.rpc('aprovar_equivalencia_fiscal',args);if(r.error)throw r.error;await fiscalCarregar();
    alert('Equivalência aprovada. Próximo prazo: '+fmtDate(r.data.proximo_prazo));
  }catch(e){fiscalErro(e);fiEl('fcAprovar').disabled=false;}
}
async function fiscalRevogar(id){
  if(!fiscalPodeEscrever)return;
  const motivo=prompt('Justificativa da revogação (mínimo 20 caracteres):');
  if(motivo===null)return;if(motivo.trim().length<20)return alert('Informe ao menos 20 caracteres.');
  try{const r=await sb.rpc('revogar_equivalencia_fiscal',{p_id:id,p_justificativa:motivo.trim()});
    if(r.error)throw r.error;await fiscalCarregar();}catch(e){fiscalErro(e);}
}
