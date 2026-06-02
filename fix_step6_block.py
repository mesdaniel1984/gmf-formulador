with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "function goStep(n) {\n  if (n < 0 || n > 6) return;\n  if (n > 1 && receita.length === 0) {\n    if (n > 2) { alert('Adicione ingredientes na receita antes de avançar.'); return; }\n  }"
new = "function goStep(n) {\n  if (n < 0 || n > 6) return;\n  if (n === 6) { currentStep = 6; }\n  else if (n > 1 && receita.length === 0) {\n    if (n > 2) { alert('Adicione ingredientes na receita antes de avançar.'); return; }\n  }"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')
    idx = h.find('function goStep(')
    print(repr(h[idx:idx+200]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
