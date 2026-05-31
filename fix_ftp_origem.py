with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = """function ftpDoProduto(id) {
  const prod = getProdutos().find(p=>p.id===id);
  if (!prod) return;
  // Carregar tudo e ir direto para step 4
  editarProduto(id);
  setTimeout(()=>goStep(4), 100);
}"""

new = """function ftpDoProduto(id) {
  const prod = getProdutos().find(p=>p.id===id);
  if (!prod) return;
  _prodOrigem = prod;
  // Preencher campos criticos antes de renderizar FTP
  const _mEl = document.getElementById('p_marca'); if (_mEl) _mEl.value = prod.marca || 'Grupo MF Paris';
  const _rEl = document.getElementById('p_registro'); if (_rEl) _rEl.value = prod.registro || 'SIF 5460';
  const _cEl = document.getElementById('p_codigo'); if (_cEl) _cEl.value = prod.codigo || '';
  const _rvEl = document.getElementById('p_revisao'); if (_rvEl) _rvEl.value = prod.revisao || '00';
  editarProduto(id);
  setTimeout(()=>goStep(4), 100);
}"""

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')
    idx = h.find('function ftpDoProduto(')
    end = h.find('\nfunction ', idx+50)
    print(repr(h[idx:end]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
