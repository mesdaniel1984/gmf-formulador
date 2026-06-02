with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Replace irParaIngredientes to directly show step6 without goStep
old = "function irParaIngredientes() { fecharMenu(); goStep(6); }"
new = """function irParaIngredientes() {
  fecharMenu();
  // Ocultar todos os outros painéis
  [0,1,2,3,4,5].forEach(i => {
    const p = document.getElementById('step'+i);
    if (p) p.classList.remove('active');
  });
  // Mostrar step6
  const s6 = document.getElementById('step6');
  if (s6) s6.classList.add('active');
  // Esconder botões de navegação
  const back = document.getElementById('btnBack');
  const next = document.getElementById('btnNext');
  const ind = document.getElementById('stepInd');
  if (back) back.style.display = 'none';
  if (next) next.style.display = 'none';
  if (ind) ind.textContent = 'Ingredientes';
  // Carregar lista
  carregarListaIngredientes();
}"""

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')
    idx = h.find('irParaIngredientes')
    print(repr(h[idx:idx+100]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
