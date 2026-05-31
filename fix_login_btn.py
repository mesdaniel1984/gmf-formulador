with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix login button to redirect to login page and come back
old = "if (ui) ui.innerHTML = '<a href=\"gmf_login.html\" style=\"color:#fff;font-size:12px;background:#2563eb;padding:4px 10px;border-radius:6px;text-decoration:none\">🔐 Entrar para salvar</a>';"
new = "if (ui) ui.innerHTML = '<a href=\"login.html\" style=\"color:#fff;font-size:12px;background:#2563eb;padding:4px 10px;border-radius:6px;text-decoration:none\">🔐 Entrar para salvar</a>';"

if old in h:
    h = h.replace(old, new)
    print('OK - link corrigido para login.html')
else:
    print('ERRO - mostrando link atual:')
    idx = h.find('Entrar para salvar')
    print(repr(h[max(0,idx-100):idx+100]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
