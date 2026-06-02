with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "  ].sort((a,b)=>a.dados.n.localeCompare(b.dados.n));"
new = "  ].sort((a,b)=>(a.dados?.n||'').localeCompare(b.dados?.n||''));"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
