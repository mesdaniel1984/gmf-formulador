with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old = "_initAuth().then(async()=>{ await _sincronizarSeeds(); goStep(0); });"
new = "_initAuth().then(async()=>{ try { await _sincronizarSeeds(); } catch(e){ console.warn('sync erro:',e); } goStep(0); carregarProdutosAsync().then(renderProdutos); });"

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')
    idx = h.rfind('_initAuth()')
    print(repr(h[idx:idx+100]))

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
