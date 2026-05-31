with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Find the full ingredient entry in the seed
old = '"nome":"Premix de Nutrientes SMV8150 (Sweetmix)","qtde":2.5,"nomeExib":"Premix de Nutrientes"'
new = '"nome":"Premix de Nutrientes SMV8150 (Sweetmix)","qtde":2.5,"nomeExib":"Premix de Nutrientes","rotuloCompleto":"mix de vitaminas e minerais (Vitamina A, Vitamina B1, Vitamina B2, Vitamina B3, Vitamina B5, Vitamina B6, Vitamina H, Vitamina B12, Vitamina C, Vitamina D3, Vitamina E, Ferro, Zinco e Fosfato Tricálcico)"'

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
