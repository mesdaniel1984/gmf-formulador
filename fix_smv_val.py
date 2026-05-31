with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Find the function that adds ingredient to receita
idx = h.find('function adicionarIngrediente(')
end = h.find('\nfunction ', idx+50)
print(repr(h[idx:end][:400]))
