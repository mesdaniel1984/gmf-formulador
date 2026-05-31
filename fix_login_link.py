with open('gmf_formulador_wizard.html') as f:
    h = f.read()

h = h.replace('href="gmf_login.html"', 'href="login.html"')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)

print('gmf_login.html restantes:', h.count('gmf_login.html'))
print('login.html count:', h.count('href="login.html"'))
