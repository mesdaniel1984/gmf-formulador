/* Fiscalizações e decisões de equivalência. Registros mantidos no banco com RLS. */
let fiscalRegistros=[],fiscalExigencias=[],fiscalDocumentos=[],fiscalEquivalencias=[];
let fiscalPodeEscrever=false,fiscalSelecionada=null;
const fiEl=id=>document.getElementById(id);
const fiEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fiVal=id=>fiEl(id).value.trim();
function fiscalErro(e){fiEl('fiscalAviso').textContent=e&&e.message||String(e);fiEl('fiscalAviso').style.color='#b91c1c';}
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
  const tabela=fiEl('fiscalTabela');if(!tabela)return;
  const ativas=fiscalRegistros.filter(f=>f.situacao!=='Concluída');
  const vencidas=ativas.filter(f=>f.prazo_resposta&&f.prazo_resposta<today()).length;
  fiEl('fiscalResumo').innerHTML=`<span class="badge blue">${fiscalRegistros.length} fiscalizações</span><span class="badge warn">${ativas.length} abertas</span><span class="badge danger">${vencidas} prazos vencidos</span><span class="badge ok">${fiscalEquivalencias.filter(e=>!e.revogada_em).length} equivalências aprovadas</span>`;
  tabela.innerHTML=fiscalRegistros.slice().sort((a,b)=>b.data_fiscalizacao.localeCompare(a.data_fiscalizacao)).map(f=>`<tr><td><b>${fiEsc(f.orgao)}</b> · ${fiEsc(f.processo)}</td><td>${fiEsc(f.empresa)}</td><td>${fmtDate(f.data_fiscalizacao)}</td><td>${fmtDate(f.prazo_resposta)}</td><td>${fiEsc(f.responsavel)}</td><td>${statusBadge(f.situacao)}</td><td><button class="btn btn-sm btn-outline" onclick="fiscalAbrir('${f.id}')">Abrir</button></td></tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:22px">Nenhuma fiscalização registrada.</td></tr>';
  if(fiscalSelecionada)fiscalAbrir(fiscalSelecionada);
}
function fiscalNovo(id){
  if(!fiscalPodeEscrever)return;
  const f=fiscalRegistros.find(r=>r.id===id)||{};
  fiEl('fiId').value=f.id||'';fiEl('fiEmpresa').value=f.empresa||'DMS';
  fiEl('fiOrgao').value=f.orgao||'MAPA';fiEl('fiOrgaoOutro').value=f.orgao_outro||'';
  fiEl('fiProcesso').value=f.processo||'';fiEl('fiData').value=f.data_fiscalizacao||today();
  fiEl('fiPrazo').value=f.prazo_resposta||'';fiEl('fiResponsavel').value=f.responsavel||'';
  fiEl('fiSituacao').value=f.situacao||'Aberta';fiEl('fiObs').value=f.observacao||'';
  fiEl('fiscalModalTitulo').textContent=f.id?'Editar fiscalização':'Registrar fiscalização';
  fiEl('fiscalModal').classList.add('open');
}
async function fiscalSalvar(){
  if(!fiscalPodeEscrever)return;
  if(!fiVal('fiProcesso')||!fiVal('fiData')||!fiVal('fiResponsavel'))return alert('Preencha processo, data e responsável.');
  const v={empresa:fiVal('fiEmpresa'),orgao:fiVal('fiOrgao'),orgao_outro:fiVal('fiOrgaoOutro')||null,
    processo:fiVal('fiProcesso'),data_fiscalizacao:fiVal('fiData'),prazo_resposta:fiVal('fiPrazo')||null,
    responsavel:fiVal('fiResponsavel'),situacao:fiVal('fiSituacao'),observacao:fiVal('fiObs')};
  const id=fiVal('fiId');fiEl('fiSalvar').disabled=true;
  try{
    const r=id?await sb.from('fiscalizacoes').update(v).eq('id',id).select('id').single():
      await sb.from('fiscalizacoes').insert(v).select('id').single();
    if(r.error)throw r.error;
    fiscalSelecionada=r.data.id;closeModal('fiscalModal');await fiscalCarregar();
  }catch(e){fiscalErro(e);}finally{fiEl('fiSalvar').disabled=false;}
}
function fiscalAbrir(id){
  const f=fiscalRegistros.find(r=>r.id===id);if(!f)return;
  fiscalSelecionada=id;const ex=fiscalExigencias.filter(x=>x.fiscalizacao_id===id);
  const docs=fiscalDocumentos.filter(x=>x.fiscalizacao_id===id);
  const analises=(typeof db==='object'?db.analises||[]:[]).filter(a=>a.fiscalizacaoId===id);
  const eqs=fiscalEquivalencias.filter(e=>e.fiscalizacao_id===id);
  const write=fiscalPodeEscrever;
  fiEl('fiscalDetalhe').style.display='block';
  fiEl('fiscalDetalhe').innerHTML=`<h3>${fiEsc(f.orgao)} · ${fiEsc(f.processo)}</h3>
    <p><b>Responsável:</b> ${fiEsc(f.responsavel)} · <b>Prazo de resposta:</b> ${fmtDate(f.prazo_resposta)} · ${statusBadge(f.situacao)}
    ${write?`<button class="btn btn-sm btn-outline" onclick="fiscalNovo('${id}')">Editar</button>`:''}</p>
    <p>${fiEsc(f.observacao)}</p><h3>Exigências</h3>
    ${ex.map(x=>`<p><b>${fiEsc(x.descricao)}</b> · ${fiEsc(x.responsavel)} · ${fmtDate(x.prazo)} · ${statusBadge(x.situacao)}<br>${fiEsc(x.evidencia)} ${write?`<button class="btn btn-sm btn-outline" onclick="fiscalEditarExigencia('${x.id}')">Editar</button>`:''}</p>`).join('')||'<p>Nenhuma exigência registrada.</p>'}
    ${write?`<button class="btn btn-sm btn-outline" onclick="fiscalEditarExigencia()">+ Exigência</button>`:''}
    <h3 style="margin-top:20px">Documentos da fiscalização</h3>
    ${docs.map(d=>`<p><button class="btn btn-sm btn-outline" onclick="fiscalAbrirDocumento('${d.id}')">📎 ${fiEsc(d.nome)}</button></p>`).join('')||'<p>Nenhum documento anexado.</p>'}
    ${write?`<label>Anexar documento (PDF, PNG ou JPEG até 10 MB) <input type="file" accept=".pdf,.png,.jpg,.jpeg" onchange="fiscalUpload(event)"></label>`:''}
    <h3 style="margin-top:20px">Análises oficiais</h3>
    ${analises.map(a=>`<p>${fiEsc(a.produto)} · ${fiEsc(a.laudo||'sem nº de laudo')} · ${fmtDate(a.data)}
      ${eqs.some(e=>e.analise_id===a.id&&!e.revogada_em)?'<span class="badge ok">Equivalência aprovada</span>':'<span class="badge warn">Não dá baixa no plano</span>'}
      ${write&&a.status==='Aprovado'&&!eqs.some(e=>e.analise_id===a.id&&!e.revogada_em)?`<button class="btn btn-sm btn-outline" onclick="fiscalFormularioEquivalencia('${fiEsc(a.id)}')">Avaliar equivalência</button>`:''}</p>`).join('')||'<p>Nenhum laudo oficial vinculado.</p>'}
    ${write?`<button class="btn btn-sm btn-outline" onclick="fiscalCriarAnalise('${id}')">+ Vincular laudo oficial</button>`:''}
    <h3 style="margin-top:20px">Decisões de equivalência</h3>
    ${eqs.map(e=>`<p>${fiEsc(e.numero_laudo)} · ${fiEsc(e.produto)} · plano ${fiEsc(e.plano_id)} · próximo prazo ${fmtDate(e.proximo_prazo)} · ${e.revogada_em?'Revogada em '+fiEsc(e.revogada_em.slice(0,10)):'Aprovada'}<br>
      Responsável: ${fiEsc(e.aprovada_por)} · Justificativa: ${fiEsc(e.justificativa)}
      ${e.revogada_em?`<br>Revogação: ${fiEsc(e.motivo_revogacao)}`:write?`<button class="btn btn-sm btn-danger" onclick="fiscalRevogar('${e.id}')">Revogar</button>`:''}</p>`).join('')||'<p>Nenhuma decisão registrada.</p>'}
    <div id="fiscalDecisao"></div>`;
}
function fiscalEditarExigencia(id){
  if(!fiscalPodeEscrever||!fiscalSelecionada)return;
  const x=fiscalExigencias.find(y=>y.id===id)||{};
  fiEl('fiscalDecisao').innerHTML=`<h4>${id?'Editar':'Nova'} exigência</h4>
    <label>Exigência <textarea id="fxDescricao" maxlength="2000">${fiEsc(x.descricao)}</textarea></label>
    <label>Prazo <input id="fxPrazo" type="date" value="${fiEsc(x.prazo||'')}"></label>
    <label>Responsável <input id="fxResponsavel" maxlength="160" value="${fiEsc(x.responsavel||'')}"></label>
    <label>Situação <select id="fxSituacao">${['Pendente','Em andamento','Cumprida'].map(s=>`<option ${x.situacao===s?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>Evidência <textarea id="fxEvidencia" maxlength="2000">${fiEsc(x.evidencia||'')}</textarea></label>
    <button class="btn btn-primary" onclick="fiscalSalvarExigencia('${id||''}')">Salvar exigência</button>`;
}
async function fiscalSalvarExigencia(id){
  if(!fiVal('fxDescricao')||!fiVal('fxResponsavel'))return alert('Informe exigência e responsável.');
  const v={descricao:fiVal('fxDescricao'),prazo:fiVal('fxPrazo')||null,responsavel:fiVal('fxResponsavel'),situacao:fiVal('fxSituacao'),evidencia:fiVal('fxEvidencia')};
  try{const r=id?await sb.from('fiscalizacao_exigencias').update(v).eq('id',id):await sb.from('fiscalizacao_exigencias').insert({...v,fiscalizacao_id:fiscalSelecionada});
    if(r.error)throw r.error;await fiscalCarregar();}catch(e){fiscalErro(e);}
}
async function fiscalUpload(ev){
  const file=ev.target.files&&ev.target.files[0];if(!file||!fiscalSelecionada||!fiscalPodeEscrever)return;
  const tipos={'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'};
  if(!tipos[file.type]||file.size>10485760)return alert('Arquivo inválido. Use PDF, PNG ou JPG com até 10 MB.');
  const path=`fiscalizacoes/${fiscalSelecionada}/${crypto.randomUUID()}.${tipos[file.type]}`;
  try{const up=await sb.storage.from('fiscalizacoes').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
    const row=await sb.from('fiscalizacao_documentos').insert({fiscalizacao_id:fiscalSelecionada,nome:file.name.slice(0,255),caminho:path});
    if(row.error)throw row.error;await fiscalCarregar();}catch(e){fiscalErro(e);}
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
