with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix page title
old1 = '<title>GMF — Formulador & Ficha Técnica</title>'
new1 = '<title>GMF Lab — GRUPO MFPARIS</title>'
if old1 in h: h = h.replace(old1, new1); print('OK title')
else: print('ERRO title')

# Add wizardFooter id - find the footer div
import re
m = re.search(r'<div[^>]*class="[^"]*wizard-footer[^"]*"', h)
if m:
    old2 = m.group()
    new2 = old2.replace('class=', 'id="wizardFooter" class=')
    h = h.replace(old2, new2, 1)
    print('OK wizardFooter')
else:
    print('wizard-footer not found - buscando footer area')
    idx = h.find('btnBack')
    print(repr(h[max(0,idx-100):idx+50]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
