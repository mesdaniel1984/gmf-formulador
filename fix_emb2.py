with open('gmf_formulador_wizard.html') as f:
    h = f.read()

import re
# Find all _embSel declarations
for m in re.finditer(r'const _embSel', h):
    line = h[:m.start()].count('\n')+1
    print(f'Line {line}:', repr(h[m.start():m.start()+100]))

# Remove the duplicate (the first one from the old fix)
old_dup = "  const _embSel = _ftpProd.embalagensSel || getEmbalagensSelecionadas() || [];\n  const _embLabels = _embSel.map(id => { const aj = SUBTIPO_AJUSTES[id] || {}; return aj.gramatura || ''; }).filter(Boolean);\n  const _ftpGramatura = _embLabels.length > 0 ? _embLabels.join(' · ') : (gv('p_gramatura') || '—');\n  // Embalagens selecionadas\n  const _embSel = _ftpProd."

# Find and remove first duplicate block
count = h.count("const _embSel")
print(f'\nTotal _embSel: {count}')

if count == 2:
    # Remove first occurrence block
    idx = h.find("  const _embSel = _ftpProd.embalagensSel || getEmbalagensSelecionadas() || [];\n  const _embLabels = _embSel.map(id => { const aj = SUBTIPO_AJUSTES[id] || {}; return aj.gramatura || ''; }).filter(Boolean);\n  const _ftpGramatura = _embLabels.length > 0 ? _embLabels.join(' · ') : (gv('p_gramatura') || '—');\n  // Embalagens selecionadas\n")
    if idx > 0:
        end = h.find("\n  const _embSel", idx+10)
        h = h[:idx] + h[end+1:]
        print('OK - duplicata removida')
    else:
        print('ERRO - padrão não encontrado')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)

# Verify
count2 = h.count("const _embSel")
print(f'_embSel restantes: {count2}')
