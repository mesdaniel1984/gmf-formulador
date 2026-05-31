with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Remove default values from input fields so they show blank when not loaded
h = h.replace(
    '<input id="p_marca" type="text" value="Grupo MF Paris">',
    '<input id="p_marca" type="text" placeholder="Ex: Grupo MF Paris">')

h = h.replace(
    '<input id="p_registro" type="text" value="SIF 5460">',
    '<input id="p_registro" type="text" placeholder="Ex: SIF 5460">')

# Fix editarProduto to always restore marca and registro from product
old = "  const _mar = document.getElementById('p_marca'); if (_mar) _mar.value = prod.marca || 'Grupo MF Paris';\n  const _reg = document.getElementById('p_registro'); if (_reg) _reg.value = prod.registro || 'SIF 5460';"
new = "  const _mar = document.getElementById('p_marca'); if (_mar) _mar.value = prod.marca || '';\n  const _reg = document.getElementById('p_registro'); if (_reg) _reg.value = prod.registro || '';"

if old in h:
    h = h.replace(old, new)
    print('OK editarProduto')
else:
    print('ERRO editarProduto')

# Fix FTP to use product object fallback for marca and registro
old2 = "${gv('p_marca','—')}"
new2 = "${gv('p_marca') || (_prodOrigem?.marca) || '—'}"
h = h.replace(old2, new2)

old3 = "${gv('p_registro','SIF 5460')}"
new3 = "${gv('p_registro') || (_prodOrigem?.registro) || 'SIF 5460'}"
h = h.replace(old3, new3)

old4 = "${gv('p_marca','Grupo MF Paris')}"
new4 = "${gv('p_marca') || (_prodOrigem?.marca) || 'Grupo MF Paris'}"
h = h.replace(old4, new4)

old5 = "${gv('p_registro','SIF 5460')}"
new5 = "${gv('p_registro') || (_prodOrigem?.registro) || 'SIF 5460'}"
h = h.replace(old5, new5)

print('marca FTP fixes:', h.count("_prodOrigem?.marca"))
print('registro FTP fixes:', h.count("_prodOrigem?.registro"))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
