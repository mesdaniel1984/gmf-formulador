with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "    const n100 = p.nutri100g || {};"
new = "    const n100 = p.nutri100g || {kcal:p.kcal,ptn:p.ptn,cho:p.cho,gt:p.gt,gs:p.gs,tr:p.tr,fi:p.fi,na:p.na,act:p.act,acad:p.acad};"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
