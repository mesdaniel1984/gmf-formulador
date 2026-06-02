with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# The real fix: in goStep, after the forEach loop, manually handle step6
old = "  // Mostrar/ocultar step6 manualmente pois esta fora do loop normal\n  const s6 = document.getElementById('step6');\n  if (s6) s6.classList.toggle('active', n === 6);\n  if (n === 6) { carregarListaIngredientes(); return; }"

new = "  // Mostrar/ocultar step6\n  const s6 = document.getElementById('step6');\n  if (s6) {\n    if (n === 6) { s6.classList.add('active'); }\n    else { s6.classList.remove('active'); }\n  }\n  if (n === 6) { carregarListaIngredientes(); return; }"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO - buscando contexto:')
    idx = h.find('step6')
    print(repr(h[max(0,idx-50):idx+200]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
