with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Title in header h1
old1 = 'Formulador Nutricional + Ficha Técnica</h1>'
new1 = 'GMF Lab</h1>'
if old1 in h: h = h.replace(old1, new1); print('OK h1')
else: print('ERRO h1')

# Subtitle in header
old2 = 'Grupo MF Paris Alimentos · SIF 5460 · ANVISA RDC 429/2020 · Portaria SDA/MAPA 1.170/2024</p>'
new2 = 'Formulador Nutricional · Fichas Técnicas · Ingredientes · Laudos · GRUPO MFPARIS · SIF 5460</p>'
if old2 in h: h = h.replace(old2, new2); print('OK subtitle')
else: print('ERRO subtitle')

# Page title tag
old3 = '<title>Formulador Nutricional + Ficha Técnica</title>'
new3 = '<title>GMF Lab — GRUPO MFPARIS</title>'
if old3 in h: h = h.replace(old3, new3); print('OK page title')
else: print('ERRO page title — tentando alternativo')

# Menu title
old4 = '<h1 style="color:#fff;font-size:28px;font-weight:800;margin-bottom:4px">GMF Formulador</h1>'
new4 = '<h1 style="color:#fff;font-size:28px;font-weight:800;margin-bottom:4px">GMF Lab</h1>'
if old4 in h: h = h.replace(old4, new4); print('OK menu title')
else: print('ERRO menu title')

old5 = '<p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:32px">Grupo MF Paris Alimentos · SIF 5460</p>'
new5 = '<p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:32px">Formulador Nutricional · Fichas Técnicas · Ingredientes · Laudos</p>'
if old5 in h: h = h.replace(old5, new5); print('OK menu subtitle')
else: print('ERRO menu subtitle')

# Add wizardFooter id
old6 = '<div class="wizard-footer">'
new6 = '<div class="wizard-footer" id="wizardFooter">'
if old6 in h: h = h.replace(old6, new6, 1); print('OK wizardFooter')
else: print('wizardFooter já existe:', 'id="wizardFooter"' in h)

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
