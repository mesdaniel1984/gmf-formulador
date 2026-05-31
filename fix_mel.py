with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Remove the duplicate (first occurrence - from earlier fix)
old = "  // Restaurar marca e registro\n  const _mEl = document.getElementById('p_marca'); if (_mEl) _mEl.value = prod.marca || 'Grupo MF Paris';\n  const _rEl = document.getElementById('p_registro'); if (_rEl) _rEl.value = prod.registro || 'SIF 5460';\n\n  // Restaurar denominação exatamente como salva (não deixar selTipo sobrescrever)\n  if (prod.denominacao) {"

new = "  // Restaurar denominação exatamente como salva (não deixar selTipo sobrescrever)\n  if (prod.denominacao) {"

count = h.count(old)
print(f'Occurrences: {count}')
if count > 0:
    h = h.replace(old, new)
    print('OK - duplicata removida')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)

import re
remaining = list(re.finditer(r'const _mEl', h))
print(f'_mEl restantes: {len(remaining)}')
