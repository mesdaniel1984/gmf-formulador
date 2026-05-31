with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Check if seed merge fix is present
print('seed merge presente:', 'seedMap' in h)
print('ftpDoProduto fix:', '_prodOrigem = prod' in h[h.find('function ftpDoProduto'):h.find('function ftpDoProduto')+200])
print('renderStep4 fix:', '_ftpMarca' in h)
