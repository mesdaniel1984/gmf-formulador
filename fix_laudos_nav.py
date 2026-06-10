with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix 1: Remove Laudos button from header
old1 = '\n        <button onclick="document.getElementById(\'laudosPanel\').style.display=\'block\';carregarListaLaudos()" style="background:rgba(30,58,138,0.1);border:1px solid #e5e7eb;color:#1e3a8a;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-weight:600">📋 Laudos</button>'
if old1 in h: h = h.replace(old1, ''); print('OK1 - botao removido do header')
else: print('ERRO1')

# Fix 2: Add Laudos as step button in nav (after Laudo Técnico step 5)
old2 = '  <button class="step-btn" id="s5btn" onclick="goStep(5)">\n    <span class="step-num">5</span> Laudo Técnico\n  </button>'
new2 = '  <button class="step-btn" id="s5btn" onclick="goStep(5)">\n    <span class="step-num">5</span> Laudo Técnico\n  </button>\n  <button class="step-btn" id="s7btn" onclick="abrirListaLaudos()">\n    <span class="step-num">6</span> Lista de Laudos\n  </button>'
if old2 in h: h = h.replace(old2, new2); print('OK2 - aba Lista de Laudos adicionada')
else: print('ERRO2')

# Fix 3: Add abrirListaLaudos function
old3 = 'async function salvarLaudoNoBanco() {'
new3 = '''function abrirListaLaudos() {
  document.getElementById('laudosPanel').style.display = 'block';
  carregarListaLaudos();
}

async function salvarLaudoNoBanco() {'''
if old3 in h: h = h.replace(old3, new3); print('OK3 - funcao abrirListaLaudos')
else: print('ERRO3')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
