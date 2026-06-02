with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = 'function fecharMenu() { const m=document.getElementById(\'menuInicial\'); if(m) m.style.display=\'none\'; }'
new = '''function fecharMenu() { const m=document.getElementById('menuInicial'); if(m) m.style.display='none'; }
async function fazerLogout() {
  await _sb.auth.signOut();
  window.location.href = 'login.html';
}'''

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
