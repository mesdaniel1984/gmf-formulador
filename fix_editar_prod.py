with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix editarProduto to also read from prod.receita (Supabase format)
old = "  // Carregar ingredientes\n  let naoEnc = [];\n  (prod.ingredientes||[]).forEach(ing => {\n    const found = DB.find(d=>d.n===ing.nome);\n    if (found) receita.push({d:found, qtde:ing.qtde});\n    else naoEnc.push(ing.nome);\n  });"

new = "  // Carregar ingredientes (suporta formato antigo prod.ingredientes e novo prod.receita)\n  let naoEnc = [];\n  const ingList = prod.receita ? prod.receita.map(r=>({nome:r.d,qtde:r.qtde})) : (prod.ingredientes||[]);\n  ingList.forEach(ing => {\n    const found = DB.find(d=>d.n===ing.nome);\n    if (found) receita.push({d:found, qtde:ing.qtde});\n    else naoEnc.push(ing.nome);\n  });"

if old in h:
    h = h.replace(old, new)
    print('OK receita')
else:
    print('ERRO receita')

# Fix gramatura field - prod.pesoTotal vs prod.gramatura vs prod.peso
old2 = "  document.getElementById('p_gramatura').value = prod.pesoTotal+'g';\n  document.getElementById('p_porcao').value = prod.pesoPorcao;"
new2 = "  document.getElementById('p_gramatura').value = prod.gramatura || (prod.pesoTotal ? prod.pesoTotal+'g' : '');\n  document.getElementById('p_porcao').value = prod.porcao || prod.pesoPorcao || 30;"

if old2 in h:
    h = h.replace(old2, new2)
    print('OK gramatura/porcao')
else:
    print('ERRO gramatura')

# Fix peso field
old3 = "  document.getElementById('p_peso').value = prod.pesoTotal;"
new3 = "  document.getElementById('p_peso').value = prod.peso || prod.pesoTotal || '';"

if old3 in h:
    h = h.replace(old3, new3)
    print('OK peso')
else:
    print('ERRO peso')

# Fix medida field
old4 = "  document.getElementById('p_medida').value = prod.medida;"
new4 = "  document.getElementById('p_medida').value = prod.medida || prod.medidaCaseira || '2 colheres de sopa';"

if old4 in h:
    h = h.replace(old4, new4)
    print('OK medida')
else:
    print('ERRO medida')

# Fix denominacao field
old5 = "  _resto('p_validade',      prod.validade);"
new5 = "  _resto('p_denominacao',   prod.denominacao);\n  _resto('p_validade',      prod.validade);"

if old5 in h:
    h = h.replace(old5, new5)
    print('OK denominacao')
else:
    print('ERRO denominacao')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
