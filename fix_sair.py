with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix userInfo to show logout when logged in, login button when not
old = "  if (!_currentUser) {\n    const ui = document.getElementById('userInfo');\n    if (ui) ui.innerHTML = '<a href=\"gmf_login.html\" style=\"color:#fff;font-size:12px;background:#2563eb;padding:4px 10px;border-radius:6px;text-decoration:none\">🔐 Entrar para salvar</a>';\n    return;\n  }"

new = "  if (!_currentUser) {\n    const ui = document.getElementById('userInfo');\n    if (ui) ui.innerHTML = '<a href=\"gmf_login.html\" style=\"color:#fff;font-size:12px;background:#2563eb;padding:4px 10px;border-radius:6px;text-decoration:none\">🔐 Entrar para salvar</a>';\n    return;\n  }\n  // Mostrar botão Sair quando logado\n  const uiEl = document.getElementById('userInfo');\n  if (uiEl) uiEl.innerHTML = `<span style=\"font-size:12px;color:rgba(255,255,255,0.8)\">\${_currentUser.email}</span> <button onclick=\"fazerLogout()\" style=\"margin-left:8px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer\">Sair</button>`;"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
