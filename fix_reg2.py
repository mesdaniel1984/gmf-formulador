with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# The real fix: renderStep4 (FTP) must read from _prodOrigem directly, not from form fields
# Find all gv('p_registro') and gv('p_marca') in FTP render and replace with direct object read

old1 = "${gv('p_registro') || (_prodOrigem?.registro) || 'SIF 5460'}"
new1 = "${(_prodOrigem?.registro) || gv('p_registro') || 'SIF 5460'}"
count1 = h.count(old1)
h = h.replace(old1, new1)

old2 = "${gv('p_marca') || (_prodOrigem?.marca) || '—'}"
new2 = "${(_prodOrigem?.marca) || gv('p_marca') || '—'}"
count2 = h.count(old2)
h = h.replace(old2, new2)

old3 = "${gv('p_marca') || (_prodOrigem?.marca) || 'Grupo MF Paris'}"
new3 = "${(_prodOrigem?.marca) || gv('p_marca') || 'Grupo MF Paris'}"
count3 = h.count(old3)
h = h.replace(old3, new3)

# Also fix codigo
old4 = "${gv('p_codigo') || (_prodOrigem?.codigo) || '—'}"
new4 = "${(_prodOrigem?.codigo) || gv('p_codigo') || '—'}"
count4 = h.count(old4)
h = h.replace(old4, new4)

print(f'registro: {count1}, marca1: {count2}, marca2: {count3}, codigo: {count4}')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('OK')
