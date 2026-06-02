with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = '  <button class="step-btn" id="s0btn" onclick="goStep(0)">\n    <span class="step-num">📦</span> Produtos\n  </button>\n  <button class="step-btn" id="s6btn" onclick="goStep(6)">\n    <span class="step-num">🔬</span> Ingredientes\n  </button>'
new = '  <button class="step-btn" id="s0btn" onclick="goStep(0)">\n    <span class="step-num">📦</span> Produtos\n  </button>'

if old in h:
    h = h.replace(old, new)
    print('OK - Ingredientes removido do nav wizard')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
