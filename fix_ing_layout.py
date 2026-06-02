with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Remove the wizard navigation from step6 view - hide header tabs when on ingredients
old = """function irParaIngredientes() {
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
  // Esconder navegação wizard completa
  const wizNav = document.getElementById('wizardNav');
  if (wizNav) wizNav.style.display = 'none';
  const wizFooter = document.getElementById('wizardFooter');
  if (wizFooter) wizFooter.style.display = 'none';
  // Carregar lista
  carregarListaIngredientes();
}

function irParaFormuladorDosIngredientes() {
  // Restaurar navegação wizard
  const wizNav = document.getElementById('wizardNav');
  if (wizNav) wizNav.style.display = '';
  const wizFooter = document.getElementById('wizardFooter');
  if (wizFooter) wizFooter.style.display = '';
  // Ocultar step6
  const s6 = document.getElementById('step6');
  if (s6) s6.classList.remove('active');
  // Ir para produtos
  goStep(0);
  renderProdutos();
}"""

if old in h:
    h = h.replace(old, new)
    print('OK irParaIngredientes')
else:
    print('ERRO')

# Add id to wizard nav and footer
old2 = '<div class="wizard-steps">'
new2 = '<div class="wizard-steps" id="wizardNav">'
if old2 in h:
    h = h.replace(old2, new2, 1)
    print('OK wizardNav id')

old3 = '<div class="wizard-footer">'
new3 = '<div class="wizard-footer" id="wizardFooter">'
if old3 in h:
    h = h.replace(old3, new3, 1)
    print('OK wizardFooter id')

# Add back button to step6
old4 = '    <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:24px;margin-bottom:20px">\n      <div style="font-size:16px;font-weight:700;color:#1e3a8a;margin-bottom:4px">🔬 Cadastro de Ingredientes</div>'
new4 = '    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">\n      <h2 style="font-size:18px;font-weight:800;color:#1e3a8a">🔬 Ingredientes</h2>\n      <button onclick="irParaFormuladorDosIngredientes()" style="background:#1e3a8a;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer">← Voltar ao Formulador</button>\n    </div>\n    <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:24px;margin-bottom:20px">\n      <div style="font-size:16px;font-weight:700;color:#1e3a8a;margin-bottom:4px">Cadastrar Novo Ingrediente</div>'

if old4 in h:
    h = h.replace(old4, new4)
    print('OK back button')
else:
    print('ERRO back button')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
