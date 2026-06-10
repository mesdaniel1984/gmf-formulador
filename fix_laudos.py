with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix 1: salvarLaudoNoBanco na impressao
old1 = "  w.document.close();\n  setTimeout(()=>{ w.print(); }, 700);\n}"
new1 = "  w.document.close();\n  setTimeout(()=>{ w.print(); }, 700);\n  salvarLaudoNoBanco();\n}"
if old1 in h: h = h.replace(old1, new1); print('OK1')
else: print('ERRO1')

# Fix 2: adicionar funcoes
old2 = "populaSel();"
new2 = '''async function salvarLaudoNoBanco() {
  if (!_sb || !_currentUser) return;
  try {
    const laudo = {
      numero_laudo: document.getElementById('lt_numero')?.value || '',
      produto_nome: gv('p_nome',''),
      produto_id: String(_prodOrigem?.id || ''),
      lote: document.getElementById('lt_lote')?.value || '',
      data_emissao: document.getElementById('lt_emissao')?.value || new Date().toLocaleDateString('pt-BR'),
      data_fabricacao: document.getElementById('lt_fab')?.value || '',
      data_validade: document.getElementById('lt_val')?.value || '',
      quantidade: document.getElementById('lt_qtde')?.value || '',
      ordem_producao: document.getElementById('lt_op')?.value || '',
      linha: document.getElementById('lt_linha')?.value || '',
      destino: document.getElementById('lt_destino')?.value || '',
      status: 'Emitido',
      usuario_id: _currentUser.id,
      usuario_email: _currentUser.email,
      dados: { registro: gv('p_registro',''), marca: gv('p_marca',''), classificacao: tipoSel || '' }
    };
    await _sb.from('laudos').insert(laudo);
  } catch(e) { console.warn('Erro ao salvar laudo:', e); }
}
async function carregarListaLaudos() {
  const lista = document.getElementById('laudos_lista');
  if (!lista) return;
  if (!_sb) { lista.innerHTML = '<p style="color:#6b7280">Faça login para ver os laudos.</p>'; return; }
  const { data, error } = await _sb.from('laudos').select('*').order('criado_em', {ascending: false});
  if (error || !data?.length) { lista.innerHTML = '<p style="color:#6b7280;font-size:13px">Nenhum laudo emitido ainda.</p>'; return; }
  lista.innerHTML = `<div style="margin-bottom:8px;font-size:12px;color:#6b7280">${data.length} laudo(s) emitido(s)</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr style="background:#f8fafc">
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Nº Laudo</th>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Produto</th>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Lote</th>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Emissão</th>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Destino</th>
        <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Status</th>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Emitido por</th>
      </tr>
      ${data.map(l=>`<tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:8px;font-weight:700;color:#1e3a8a">${l.numero_laudo||'—'}</td>
        <td style="padding:8px">${l.produto_nome||'—'}</td>
        <td style="padding:8px">${l.lote||'—'}</td>
        <td style="padding:8px">${l.data_emissao||'—'}</td>
        <td style="padding:8px;color:#6b7280">${l.destino||'—'}</td>
        <td style="padding:8px;text-align:center"><span style="background:${l.status==='Aprovado'?'#dcfce7':'#dbeafe'};color:${l.status==='Aprovado'?'#166534':'#1e40af'};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${l.status}</span></td>
        <td style="padding:8px;color:#6b7280;font-size:11px">${l.usuario_email||'—'}</td>
      </tr>`).join('')}
    </table>`;
}
populaSel();'''
if old2 in h: h = h.replace(old2, new2); print('OK2')
else: print('ERRO2')

# Fix 3: painel de laudos
old3 = '</body>\n</'
new3 = '''<div id="laudosPanel" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);z-index:8000;overflow-y:auto">
  <div style="max-width:1100px;margin:40px auto;padding:24px">
    <div style="background:#fff;border-radius:16px;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div><h2 style="font-size:18px;font-weight:800;color:#1e3a8a">📋 Laudos Técnicos Emitidos</h2><p style="font-size:12px;color:#6b7280;margin-top:2px">Histórico completo de todos os laudos gerados</p></div>
        <div style="display:flex;gap:8px">
          <button onclick="carregarListaLaudos()" style="background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600">🔄 Atualizar</button>
          <button onclick="document.getElementById('laudosPanel').style.display='none'" style="background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer">✕ Fechar</button>
        </div>
      </div>
      <div id="laudos_lista"><p style="color:#6b7280;font-size:13px">Carregando...</p></div>
    </div>
  </div>
</div>
</body>
</'''
if old3 in h: h = h.replace(old3, new3); print('OK3')
else: print('ERRO3')

# Fix 4: botao Laudos no header
old4 = '<button onclick="mostrarMenuInicial()" style="background:rgba(30,58,138,0.1);border:1px solid #e5e7eb;color:#1e3a8a;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-weight:600">☰ Menu</button>'
new4 = '<button onclick="mostrarMenuInicial()" style="background:rgba(30,58,138,0.1);border:1px solid #e5e7eb;color:#1e3a8a;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-weight:600">☰ Menu</button>\n        <button onclick="document.getElementById(\'laudosPanel\').style.display=\'block\';carregarListaLaudos()" style="background:rgba(30,58,138,0.1);border:1px solid #e5e7eb;color:#1e3a8a;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;font-weight:600">📋 Laudos</button>'
if old4 in h: h = h.replace(old4, new4); print('OK4')
else: print('ERRO4')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE - size:', len(h))
