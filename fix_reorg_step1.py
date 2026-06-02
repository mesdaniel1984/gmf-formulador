with open('gmf_formulador_wizard.html') as f:
    h = f.read()

idx_start = h.find('id="step1"')
idx_end = h.find('\n<!-- ═══', idx_start+100)
step1_old = h[idx_start:idx_end]
tipo_start = step1_old.find('<!-- SELETOR DE TIPO DE PRODUTO -->')
tipo_end = step1_old.rfind('</div>\n\n  </div>\n</div>')
tipo_section = step1_old[tipo_start:tipo_end]

new_step1 = '''id="step1">
  <div class="card">
    <div class="card-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Identificação do Produto
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="field" style="grid-column:1/3"><label>Nome comercial do produto</label><input id="p_nome" type="text" placeholder="Ex: OKEY LAC 100" oninput="syncNome()"></div>
      <div class="field"><label>Código interno / FT</label><input id="p_codigo" type="text" placeholder="Ex: 031/5460"></div>
      <div class="field"><label>Revisão</label><input id="p_revisao" type="text" value="00"></div>
    </div>
    <div class="divider"></div>
    <div class="card-title" style="margin-bottom:10px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg>
      Tipo e Classificação do Produto
      <span style="font-size:11px;color:var(--text2);font-weight:400;margin-left:6px">— selecione para preencher automaticamente</span>
    </div>
''' + tipo_section + '''
    <div class="divider" style="margin-top:16px"></div>
    <div class="card-title" style="margin:16px 0 12px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Dados Complementares
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="field"><label>Denominação de venda</label><input id="p_denominacao" type="text" placeholder="Ex: Composto Lácteo com Adição"></div>
      <div class="field"><label>Marca</label><input id="p_marca" type="text" placeholder="Ex: Grupo MF Paris"></div>
      <div class="field"><label>Registro / SIF</label><input id="p_registro" type="text" placeholder="Ex: SIF 5460"></div>
      <div class="field"><label>Porção (g)</label><input id="p_porcao" type="number" value="30" min="1" oninput="recalc()"></div>
      <div class="field"><label>Medida caseira</label><input id="p_medida" type="text" value="2 colheres de sopa"></div>
      <div class="field"><label>Peso total embalagem (g)</label><input id="p_peso" type="number" value="1000" min="1"></div>
      <div class="field"><label>Gramatura / Embalagem</label><input id="p_gramatura" type="text" value="25 kg"></div>
      <div class="field"><label>Validade</label><input id="p_validade" type="text" value="12 meses"></div>
    </div>
  </div>
</div>

'''

h = h[:idx_start] + new_step1 + h[idx_end:]

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('OK - size:', len(h))
