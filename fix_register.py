with open('register.html') as f:
    h = f.read()

# Remove nome field and simplify
old = '''  <div class="field"><label>Nome completo</label><input id="nome" type="text" placeholder="Seu nome completo"></div>
  <div class="field"><label>Email</label><input id="email" type="email" placeholder="seu@email.com"></div>'''
new = '''  <div class="field"><label>Email</label><input id="email" type="email" placeholder="seu@email.com"></div>'''

if old in h:
    h = h.replace(old, new)
    print('OK campo nome removido')
else:
    print('ERRO')

# Fix registrar function to not use nome
old2 = "  const nome=document.getElementById('nome').value.trim();\n  const email=document.getElementById('email').value.trim();\n  const senha=document.getElementById('senha').value;\n  const senha2=document.getElementById('senha2').value;\n  const btn=document.getElementById('btn');\n  if(!nome){showMsg('Informe seu nome.','err');return;}\n  if(!email){showMsg('Informe seu email.','err');return;}"
new2 = "  const email=document.getElementById('email').value.trim();\n  const senha=document.getElementById('senha').value;\n  const senha2=document.getElementById('senha2').value;\n  const btn=document.getElementById('btn');\n  if(!email){showMsg('Informe seu email.','err');return;}"

if old2 in h:
    h = h.replace(old2, new2)
    print('OK funcao simplificada')
else:
    print('ERRO funcao')

old3 = "const {data,error}=await sb.auth.signUp({email,password:senha,options:{data:{nome}}});"
new3 = "const {data,error}=await sb.auth.signUp({email,password:senha});"

if old3 in h:
    h = h.replace(old3, new3)
    print('OK signup simplificado')
else:
    print('ERRO signup')

with open('register.html', 'w') as f:
    f.write(h)
