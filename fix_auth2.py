with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "  // Modo publico - continua sem login\n  // Exibir nome do usuário no cabeçalho\n  const perfil = await _sb.from('perfis').select('nome,cargo').eq('id', _currentUser.id).single();"

new = "  // Modo publico - continua sem login\n  // Exibir nome do usuário no cabeçalho (só se logado)\n  if (!_currentUser) return;\n  const perfil = await _sb.from('perfis').select('nome,cargo').eq('id', _currentUser.id).single();"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
