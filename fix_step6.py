with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix 1: Add Ingredientes button to nav
old1 = '  <button class="step-btn" id="s0btn" onclick="goStep(0)">\n    <span class="step-num">📦</span> Produtos\n  </button>'
new1 = '  <button class="step-btn" id="s0btn" onclick="goStep(0)">\n    <span class="step-num">📦</span> Produtos\n  </button>\n  <button class="step-btn" id="s6btn" onclick="goStep(6)">\n    <span class="step-num">🔬</span> Ingredientes\n  </button>'
if old1 in h: h = h.replace(old1, new1); print('OK nav')
else: print('ERRO nav')

# Fix 2: goStep(6) trigger
old2 = '  if (n === 5) iniciarLaudo();'
new2 = '  if (n === 5) iniciarLaudo();\n  if (n === 6) carregarListaIngredientes();'
if old2 in h: h = h.replace(old2, new2); print('OK goStep6')
else: print('ERRO goStep6')

# Fix 3: Add functions
old3 = 'function irParaIngredientes() { fecharMenu(); goStep(6); }'
new3 = '''function irParaIngredientes() { fecharMenu(); goStep(6); }

async function salvarIngrediente() {
  if (!_currentUser) { alert('Faça login para salvar ingredientes.'); return; }
  const nome = document.getElementById('ing_nome')?.value?.trim();
  if (!nome) { alert('Nome do ingrediente é obrigatório.'); return; }
  const ing = {
    n: nome,
    ref: document.getElementById('ing_ref')?.value?.trim()||'',
    src: document.getElementById('ing_src')?.value||'Usuário',
    kcal: parseFloat(document.getElementById('ing_kcal')?.value)||0,
    cho:  parseFloat(document.getElementById('ing_cho')?.value)||0,
    act:  parseFloat(document.getElementById('ing_act')?.value)||0,
    acad: parseFloat(document.getElementById('ing_acad')?.value)||0,
    ptn:  parseFloat(document.getElementById('ing_ptn')?.value)||0,
    gt:   parseFloat(document.getElementById('ing_gt')?.value)||0,
    gs:   parseFloat(document.getElementById('ing_gs')?.value)||0,
    tr:   parseFloat(document.getElementById('ing_tr')?.value)||0,
    fi:   parseFloat(document.getElementById('ing_fi')?.value)||0,
    na:   parseFloat(document.getElementById('ing_na')?.value)||0,
    rotulo: document.getElementById('ing_rotulo')?.value?.trim()||'',
    rotuloCompleto: document.getElementById('ing_rotuloCompleto')?.value?.trim()||'',
    cadastradoPor: _currentUser.email,
  };
  const { error } = await _sb.from('ingredientes_custom').upsert({nome:ing.n,dados:ing,usuario_id:_currentUser.id},{onConflict:'nome'});
  const msg = document.getElementById('ing_msg');
  if (error) { msg.style.color='#dc2626'; msg.textContent='❌ '+error.message; }
  else {
    const ex = DB.findIndex(d=>d.n===ing.n);
    if(ex>=0) DB[ex]=ing; else DB.push(ing);
    msg.style.color='#166534'; msg.textContent='✅ Ingrediente salvo!';
    limparFormIngrediente(); carregarListaIngredientes();
    setTimeout(()=>msg.textContent='',3000);
  }
}

function limparFormIngrediente() {
  ['ing_nome','ing_ref','ing_rotulo','ing_rotuloCompleto','ing_kcal','ing_cho','ing_act','ing_acad','ing_ptn','ing_gt','ing_gs','ing_tr','ing_fi','ing_na'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const s=document.getElementById('ing_src'); if(s) s.value='FT';
}

async function carregarListaIngredientes() {
  const lista=document.getElementById('ing_lista'); if(!lista) return;
  if(!_sb){ lista.innerHTML='<p style="color:#6b7280;font-size:13px">Faça login para ver ingredientes.</p>'; return; }
  const {data,error}=await _sb.from('ingredientes_custom').select('nome,dados').order('nome');
  if(error||!data?.length){ lista.innerHTML='<p style="color:#6b7280;font-size:13px">Nenhum ingrediente cadastrado ainda.</p>'; return; }
  data.forEach(r=>{ const ex=DB.findIndex(d=>d.n===r.dados.n); if(ex>=0) DB[ex]=r.dados; else DB.push(r.dados); });
  lista.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:12px">
    <tr style="background:#f8fafc">
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Nome</th>
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Rótulo FTP</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">kcal</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">PTN</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">CHO</th>
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Fornecedor</th>
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Por</th>
    </tr>
    ${data.map(r=>`<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px;font-weight:600">${r.dados.n}</td>
      <td style="padding:8px;color:#6b7280">${r.dados.rotulo||'—'}</td>
      <td style="padding:8px;text-align:center">${r.dados.kcal}</td>
      <td style="padding:8px;text-align:center">${r.dados.ptn}</td>
      <td style="padding:8px;text-align:center">${r.dados.cho}</td>
      <td style="padding:8px;color:#6b7280">${r.dados.ref||'—'}</td>
      <td style="padding:8px;color:#6b7280">${r.dados.cadastradoPor||'—'}</td>
    </tr>`).join('')}
  </table>`;
}'''

if old3 in h: h = h.replace(old3, new3); print('OK functions')
else: print('ERRO functions')

# Fix 4: Add step6 panel before </body>
old4 = '</body>\n</'
new4 = '''<div class="panel" id="step6">
  <div style="max-width:960px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:24px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:700;color:#1e3a8a;margin-bottom:4px">🔬 Cadastro de Ingredientes</div>
      <p style="font-size:13px;color:#6b7280;margin-bottom:20px">Adicione novos ingredientes ao banco. Após salvar ficam disponíveis para todos na tela de Receita.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="field" style="grid-column:1/3"><label>Nome do ingrediente *</label><input id="ing_nome" type="text" placeholder="Ex: Leite em Pó Integral"></div>
        <div class="field"><label>Rótulo (nome na FTP)</label><input id="ing_rotulo" type="text" placeholder="Ex: leite em pó integral"></div>
        <div class="field"><label>Fornecedor / Referência</label><input id="ing_ref" type="text" placeholder="Ex: Horizonte (FT 2024)"></div>
        <div class="field"><label>Fonte</label><select id="ing_src"><option value="FT">Ficha Técnica (FT)</option><option value="Usuário">Usuário</option><option value="TACO">TACO</option><option value="IBGE">IBGE</option></select></div>
        <div class="field"><label>Rótulo completo (subingredientes)</label><input id="ing_rotuloCompleto" type="text" placeholder="Ex: leite em pó (ingrediente A, B)"></div>
      </div>
      <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin:16px 0 8px">📊 Informação Nutricional (por 100g)</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
        <div class="field"><label>Energia (kcal)</label><input id="ing_kcal" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Carboidratos (g)</label><input id="ing_cho" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Açúcares totais (g)</label><input id="ing_act" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Açúcares adicionados (g)</label><input id="ing_acad" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Proteínas (g)</label><input id="ing_ptn" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Gorduras totais (g)</label><input id="ing_gt" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Gorduras saturadas (g)</label><input id="ing_gs" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Gorduras trans (g)</label><input id="ing_tr" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Fibra alimentar (g)</label><input id="ing_fi" type="number" step="0.1" min="0" placeholder="0"></div>
        <div class="field"><label>Sódio (mg)</label><input id="ing_na" type="number" step="0.1" min="0" placeholder="0"></div>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <button onclick="salvarIngrediente()" style="height:40px;padding:0 24px;font-size:14px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">💾 Salvar Ingrediente</button>
        <button onclick="limparFormIngrediente()" style="height:40px;padding:0 16px;font-size:13px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer">🗑 Limpar</button>
        <div id="ing_msg" style="font-size:13px"></div>
      </div>
    </div>
    <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:20px">
      <div style="font-size:14px;font-weight:700;color:#1e3a8a;margin-bottom:12px">📋 Ingredientes Cadastrados</div>
      <div id="ing_lista"><p style="color:#6b7280;font-size:13px">Carregando...</p></div>
    </div>
  </div>
</div>
</body>
</'''

if old4 in h: h = h.replace(old4, new4); print('OK panel')
else: print('ERRO panel')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE - size:', len(h))
