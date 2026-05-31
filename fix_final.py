with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Restore login redirect but keep products loading without login
old = "  // Modo publico - continua sem login\n  // Exibir nome do usuário no cabeçalho (só se logado)\n  if (!_currentUser) return;"
new = "  // Se não logado, mostrar botão de login mas continuar\n  if (!_currentUser) {\n    const ui = document.getElementById('userInfo');\n    if (ui) ui.innerHTML = '<a href=\"gmf_login.html\" style=\"color:#fff;font-size:12px;background:#2563eb;padding:4px 10px;border-radius:6px;text-decoration:none\">🔐 Entrar para salvar</a>';\n    return;\n  }"

if old in h:
    h = h.replace(old, new)
    print('OK - login opcional mostrado')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
