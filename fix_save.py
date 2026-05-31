with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Find salvarProdutosAsync to fix it when no user
idx = h.find('async function salvarProdutosAsync(')
end = h.find('\nfunction ', idx+50)
func = h[idx:end]
print('Func preview:', repr(func[:300]))
