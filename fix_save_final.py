with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "    nome: nomeDigitado,\n    codigo: (document.getElementById('p_codigo')?.value||'').trim(),\n    revisao: (document.getElementById('p_revisao')?.value||'00').trim(),"

new = "    nome: nomeDigitado,\n    codigo: (document.getElementById('p_codigo')?.value||'').trim(),\n    revisao: (document.getElementById('p_revisao')?.value||'00').trim(),\n    marca: (document.getElementById('p_marca')?.value||'Grupo MF Paris').trim(),\n    registro: (document.getElementById('p_registro')?.value||'SIF 5460').trim(),"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO - buscando contexto:')
    idx = h.find('function salvarProdutoAtual(')
    end = h.find('\nfunction ', idx+50)
    func = h[idx:end]
    idx2 = func.find('nomeDigitado')
    print(repr(func[idx2:idx2+200]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
