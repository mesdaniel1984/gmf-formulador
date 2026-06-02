with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "    ...DB.map(d => ({dados:d, custom:false})),"
new = "    ...DB.filter(d=>d && d.n).map(d => ({dados:d, custom:false})),"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
