with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix: goStep loop needs to include step6
old = "  [0,1,2,3,4,5].forEach(i => {"
new = "  [0,1,2,3,4,5,6].forEach(i => {"

if old in h:
    h = h.replace(old, new)
    print('OK loop')
else:
    print('ERRO loop')

# Also fix currentStep to allow 6
old2 = "function goStep(n) {\n  if (n < 0 || n > 5) return;"
new2 = "function goStep(n) {\n  if (n < 0 || n > 6) return;"

if old2 in h:
    h = h.replace(old2, new2)
    print('OK range')
else:
    print('ERRO range')

# Fix back/next buttons to not show on step6
old3 = "  if (n === 0) {\n    back.style.display = 'none';"
new3 = "  if (n === 6) {\n    back.style.display = 'none';\n    next.style.display = 'none';\n    if (ind) ind.textContent = 'Ingredientes';\n  } else if (n === 0) {\n    back.style.display = 'none';"

if old3 in h:
    h = h.replace(old3, new3)
    print('OK nav buttons')
else:
    print('ERRO nav buttons')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
