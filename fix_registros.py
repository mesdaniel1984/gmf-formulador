with open('gmf_formulador_wizard.html') as f:
    h = f.read()

registros = {
    '"OKEY LAC CREAM"': ('035/5460', 'OKEY LAC'),
    '"OKEY LAC CREAM PLUS"': ('057/5460', 'OKEY LAC'),
    '"OKEY LAC GOURMET 20 (v2)"': ('XXX/5460', 'OKEY LAC'),
    '"OKEY LAC GOURMET 20"': ('XXX/5460', 'OKEY LAC'),
    '"OKEY LAC GOURMET"': ('XXX/5460', 'OKEY LAC'),
    '"OKEY LAC PANIFICAÇÃO 20 (v2)"': ('XXX/5460', 'OKEY LAC'),
    '"OKEY LAC PANIFICAÇÃO"': ('XXX/5460', 'OKEY LAC'),
    '"OKEY LAC PRO"': ('SIF 5460', 'Grupo MF Paris'),
    '"ACHOCOLATADO CESTA"': ('VISA', 'MilkShow / ChocoMinas'),
    '"ACHOCOLATADO SUPER"': ('VISA', 'MilkShow / ChocoMinas'),
    '"ACHOCOLATADO PREMIUM"': ('VISA', 'MilkShow / ChocoMinas'),
    '"CACAU EM PÓ 50%"': ('VISA', 'MilkShow / ChocoMinas'),
    '"CACAU EM PÓ 70%"': ('VISA', 'MilkShow / ChocoMinas'),
    '"CACAU EM PÓ 70% SEM AÇÚCAR"': ('VISA', 'MilkShow / ChocoMinas'),
    '"CACAU EM PÓ 100%"': ('VISA', 'MilkShow / ChocoMinas'),
}

import json, re

# Find SEED_PRODUTOS array and update each product
idx = h.find('const SEED_PRODUTOS = [')
depth, in_str, sc, i, end = 0, False, None, idx, idx
while i < len(h):
    c = h[i]
    if in_str:
        if c == '\\': i += 2; continue
        if c == sc: in_str = False
    else:
        if c in ('"',"'",'`'): in_str = True; sc = c
        elif c == '[': depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0: end = i+1; break
    i += 1

seed_str = h[idx:end]
data = json.loads(seed_str[len('const SEED_PRODUTOS = '):])

for p in data:
    nome_key = f'"{p["nome"]}"'
    if nome_key in registros:
        reg, marca = registros[nome_key]
        p['registro'] = reg
        p['marca'] = marca
        print(f'✅ {p["nome"]}: registro={reg}, marca={marca}')
    else:
        if not p.get('registro'):
            p['registro'] = 'SIF 5460'
        if not p.get('marca'):
            p['marca'] = 'Grupo MF Paris'

new_seed = 'const SEED_PRODUTOS = ' + json.dumps(data, ensure_ascii=False, separators=(',',':'))
h = h[:idx] + new_seed + h[end:]

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('OK')
