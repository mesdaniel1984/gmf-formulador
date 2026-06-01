with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix 1: salvar embalagensSel
old1 = "    emb1:          document.getElementById('p_emb1')?.value || '',\n    emb2:          document.getElementById('p_emb2')?.value || '',"
new1 = "    emb1:          document.getElementById('p_emb1')?.value || '',\n    emb2:          document.getElementById('p_emb2')?.value || '',\n    embalagensSel: getEmbalagensSelecionadas(),"
if old1 in h:
    h = h.replace(old1, new1)
    print('OK Fix1')
else:
    print('ERRO Fix1')

# Fix 2: restaurar embalagens no editarProduto
old2 = "  // Restaurar marca e registro SEMPRE do produto\n  const _mEl = document.getElementById('p_marca');"
new2 = "  // Restaurar embalagens\n  if (prod.embalagensSel && prod.embalagensSel.length) {\n    document.querySelectorAll('#subtipoOpts .btn-primary, #embalagemOpts .btn-primary').forEach(b => { b.classList.remove('btn-primary'); b.classList.add('btn'); });\n    prod.embalagensSel.forEach(stId => { const btn = document.getElementById(stId); if (btn) { btn.classList.add('btn-primary'); btn.classList.remove('btn'); } });\n  }\n\n  // Restaurar marca e registro SEMPRE do produto\n  const _mEl = document.getElementById('p_marca');"
if old2 in h:
    h = h.replace(old2, new2)
    print('OK Fix2')
else:
    print('ERRO Fix2')

# Fix 3: add embalagem vars in renderStep4
old3 = "  const _ftpCodigo = _ftpProd.codigo || gv('p_codigo') || '—';\n  const _ftpRevisao = _ftpProd.revisao || gv('p_revisao') || '00';"
new3 = "  const _ftpCodigo = _ftpProd.codigo || gv('p_codigo') || '—';\n  const _ftpRevisao = _ftpProd.revisao || gv('p_revisao') || '00';\n  const _embSel = _ftpProd.embalagensSel || getEmbalagensSelecionadas() || [];\n  const _embLabels = _embSel.map(id => { const aj = SUBTIPO_AJUSTES[id] || {}; return aj.gramatura || ''; }).filter(Boolean);\n  const _ftpGramatura = _embLabels.length > 0 ? _embLabels.join(' · ') : (gv('p_gramatura') || '—');"
if old3 in h:
    h = h.replace(old3, new3)
    print('OK Fix3')
else:
    print('ERRO Fix3')

# Fix 4: use _ftpGramatura in FTP
old4 = "${gv('p_gramatura','—')}"
if old4 in h:
    h = h.replace(old4, '${_ftpGramatura}')
    print('OK Fix4')
else:
    print('ERRO Fix4')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
