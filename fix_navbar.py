with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = '<div class="nav-bar">'
new = '<div class="nav-bar" id="wizardNavBar">'
if old in h:
    h = h.replace(old, new, 1)
    print('OK nav-bar id')
else:
    print('ERRO')

# Fix irParaIngredientes to hide nav-bar
old2 = "  const wizNav = document.getElementById('wizardNav');\n  if (wizNav) wizNav.style.display = 'none';\n  const wizFooter = document.getElementById('wizardFooter');\n  if (wizFooter) wizFooter.style.display = 'none';"
new2 = "  const wizNav = document.getElementById('wizardNav');\n  if (wizNav) wizNav.style.display = 'none';\n  const wizNavBar = document.getElementById('wizardNavBar');\n  if (wizNavBar) wizNavBar.style.display = 'none';"

if old2 in h:
    h = h.replace(old2, new2)
    print('OK hide navBar')
else:
    print('ERRO hide')

# Fix irParaFormuladorDosIngredientes to restore nav-bar
old3 = "  const wizNav = document.getElementById('wizardNav');\n  if (wizNav) wizNav.style.display = '';\n  const wizFooter = document.getElementById('wizardFooter');\n  if (wizFooter) wizFooter.style.display = '';"
new3 = "  const wizNav = document.getElementById('wizardNav');\n  if (wizNav) wizNav.style.display = '';\n  const wizNavBar = document.getElementById('wizardNavBar');\n  if (wizNavBar) wizNavBar.style.display = '';"

if old3 in h:
    h = h.replace(old3, new3)
    print('OK restore navBar')
else:
    print('ERRO restore')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
