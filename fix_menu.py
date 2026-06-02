with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix 1: login obrigatorio
old1 = "  // Se não logado, mostrar botão de login mas continuar\n  if (!_currentUser) {\n    const ui = document.getElementById('userInfo');\n    if (ui) ui.innerHTML = '<a href=\"login.html\" style=\"color:#fff;font-size:12px;background:#2563eb;padding:4px 10px;border-radius:6px;text-decoration:none\">🔐 Entrar para salvar</a>';\n    return;\n  }"
new1 = "  if (!_currentUser) { window.location.href = 'login.html'; return; }"
if old1 in h: h = h.replace(old1, new1); print('OK1')
else: print('ERRO1')

# Fix 2: mostrarMenuInicial apos login
old2 = "_initAuth().then(async()=>{ try { await _sincronizarSeeds(); } catch(e){ console.warn('sync erro:',e); } goStep(0); carregarProdutosAsync().then(renderProdutos); });"
new2 = "_initAuth().then(async()=>{ try { await _sincronizarSeeds(); } catch(e){ console.warn('sync erro:',e); } await carregarProdutosAsync(); mostrarMenuInicial(); });"
if old2 in h: h = h.replace(old2, new2); print('OK2')
else: print('ERRO2')

# Fix 3: functions + menu HTML
old3 = 'function nextStep() {'
new3 = '''function mostrarMenuInicial() {
  let overlay = document.getElementById('menuInicial');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'menuInicial';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    overlay.innerHTML = `<div style="text-align:center;max-width:600px;padding:24px;width:100%">
      <h1 style="color:#fff;font-size:28px;font-weight:800;margin-bottom:4px">GMF Formulador</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:32px">Grupo MF Paris Alimentos · SIF 5460</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:480px;margin:0 auto">
        <button onclick="irParaFormulador()" style="background:#fff;border:none;border-radius:16px;padding:32px 20px;cursor:pointer;text-align:center" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='#fff'">
          <div style="font-size:40px;margin-bottom:12px">🧪</div>
          <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-bottom:6px">Formulador</div>
          <div style="font-size:12px;color:#6b7280">Criar e editar produtos,<br>gerar fichas técnicas</div>
        </button>
        <button onclick="irParaIngredientes()" style="background:#fff;border:none;border-radius:16px;padding:32px 20px;cursor:pointer;text-align:center" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='#fff'">
          <div style="font-size:40px;margin-bottom:12px">🔬</div>
          <div style="font-size:16px;font-weight:800;color:#1e3a8a;margin-bottom:6px">Ingredientes</div>
          <div style="font-size:12px;color:#6b7280">Consultar e cadastrar<br>ingredientes com ficha</div>
        </button>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:24px">Logado como: ${_currentUser?.email||''}</p>
      <button onclick="fazerLogout()" style="margin-top:8px;background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5);border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer">Sair</button>
    </div>`;
    document.body.appendChild(overlay);
  } else { overlay.style.display='flex'; }
}
function fecharMenu() { const m=document.getElementById('menuInicial'); if(m) m.style.display='none'; }
function irParaFormulador() { fecharMenu(); goStep(0); renderProdutos(); }
function irParaIngredientes() { fecharMenu(); goStep(6); }
function nextStep() {'''
if old3 in h: h = h.replace(old3, new3); print('OK3')
else: print('ERRO3')

# Fix 4: Menu button in header
old4 = '<div id="userInfo" style="display:flex;align-items:center;gap:8px;margin-right:8px"></div>'
new4 = '<button onclick="mostrarMenuInicial()" style="background:rgba(30,58,138,0.1);border:1px solid #e5e7eb;color:#1e3a8a;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-weight:600">☰ Menu</button>\n        <div id="userInfo" style="display:flex;align-items:center;gap:8px;margin-right:8px"></div>'
if old4 in h: h = h.replace(old4, new4); print('OK4')
else: print('ERRO4')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
