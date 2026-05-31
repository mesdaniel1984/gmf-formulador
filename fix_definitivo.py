with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# FIX 1: ftpDoProduto
old1 = """function ftpDoProduto(id) {
  const prod = getProdutos().find(p=>p.id===id);
  if (!prod) return;
  // Carregar tudo e ir direto para step 4
  editarProduto(id);
  setTimeout(()=>goStep(4), 100);
}"""
new1 = """function ftpDoProduto(id) {
  const prod = getProdutos().find(p=>p.id===id);
  if (!prod) return;
  _prodOrigem = prod;
  editarProduto(id);
  setTimeout(()=>goStep(4), 100);
}"""
if old1 in h:
    h = h.replace(old1, new1)
    print('OK Fix1')
else:
    print('ERRO Fix1')

# FIX 2: renderStep4 local vars
old2 = "function renderStep4(){\n  const empty=document.getElementById('s4empty');"
new2 = """function renderStep4(){
  const _ftpProd = _prodOrigem || {};
  const _ftpMarca = _ftpProd.marca || gv('p_marca') || 'Grupo MF Paris';
  const _ftpRegistro = _ftpProd.registro || gv('p_registro') || 'SIF 5460';
  const _ftpCodigo = _ftpProd.codigo || gv('p_codigo') || '—';
  const _ftpRevisao = _ftpProd.revisao || gv('p_revisao') || '00';
  const empty=document.getElementById('s4empty');"""
if old2 in h:
    h = h.replace(old2, new2)
    print('OK Fix2')
else:
    print('ERRO Fix2')

# FIX 3: replace all marca/registro references in renderStep4
import re
idx = h.find('function renderStep4(')
end = h.find('\nfunction ', idx+100)
chunk = h[idx:end]
chunk = re.sub(r"\$\{[^}]*?(?:_prodOrigem\?\.marca|gv\('p_marca'\))[^}]*?\}", "${_ftpMarca}", chunk)
chunk = re.sub(r"\$\{[^}]*?(?:_prodOrigem\?\.registro|gv\('p_registro'\))[^}]*?\}", "${_ftpRegistro}", chunk)
chunk = re.sub(r"\$\{[^}]*?(?:_prodOrigem\?\.codigo|gv\('p_codigo'\))[^}]*?\}", "${_ftpCodigo}", chunk)
chunk = re.sub(r"\$\{[^}]*?(?:_prodOrigem\?\.revisao|gv\('p_revisao'\))[^}]*?\}", "${_ftpRevisao}", chunk)
h = h[:idx] + chunk + h[end:]
print(f'OK Fix3: marca={chunk.count("_ftpMarca")} reg={chunk.count("_ftpRegistro")}')

# FIX 4: editarProduto restore marca/registro
old4 = "  // Restaurar denominação exatamente como salva (não deixar selTipo sobrescrever)\n  if (prod.denominacao) {"
new4 = "  // Restaurar marca e registro\n  const _mEl = document.getElementById('p_marca'); if (_mEl) _mEl.value = prod.marca || 'Grupo MF Paris';\n  const _rEl = document.getElementById('p_registro'); if (_rEl) _rEl.value = prod.registro || 'SIF 5460';\n\n  // Restaurar denominação exatamente como salva (não deixar selTipo sobrescrever)\n  if (prod.denominacao) {"
if old4 in h:
    h = h.replace(old4, new4)
    print('OK Fix4')
else:
    print('ERRO Fix4')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
