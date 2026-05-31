with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "async function _initAuth() {\n  const { data } = await _sb.auth.getSession();\n  if (!data.session) {\n    // Não autenticado — redirecionar para login\n    window.location.href = 'gmf_login.html';\n    return;\n  }\n  _currentUser = data.session.user;"

new = "async function _initAuth() {\n  const { data } = await _sb.auth.getSession();\n  if (data.session) {\n    _currentUser = data.session.user;\n  }\n  // Modo publico - continua sem login"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
