with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix goStep to handle step6 panel
old = "  if (n === 3) renderStep3();\n  if (n === 4) renderStep4();\n  if (n === 5) iniciarLaudo();\n  if (n === 6) carregarListaIngredientes();"
new = """  if (n === 3) renderStep3();
  if (n === 4) renderStep4();
  if (n === 5) iniciarLaudo();
  // Mostrar/ocultar step6 manualmente pois esta fora do loop normal
  const s6 = document.getElementById('step6');
  if (s6) s6.classList.toggle('active', n === 6);
  if (n === 6) { carregarListaIngredientes(); return; }"""

if old in h:
    h = h.replace(old, new)
    print('OK goStep6 fix')
else:
    print('ERRO')

# Also update carregarListaIngredientes to show ALL ingredients from DB
old2 = "async function carregarListaIngredientes() {\n  const lista=document.getElementById('ing_lista'); if(!lista) return;\n  if(!_sb){ lista.innerHTML='<p style=\"color:#6b7280;font-size:13px\">Faça login para ver ingredientes.</p>'; return; }\n  const {data,error}=await _sb.from('ingredientes_custom').select('nome,dados').order('nome');\n  if(error||!data?.length){ lista.innerHTML='<p style=\"color:#6b7280;font-size:13px\">Nenhum ingrediente cadastrado ainda.</p>'; return; }\n  data.forEach(r=>{ const ex=DB.findIndex(d=>d.n===r.dados.n); if(ex>=0) DB[ex]=r.dados; else DB.push(r.dados); });\n  lista.innerHTML=`<table style=\"width:100%;border-collapse:collapse;font-size:12px\">\n    <tr style=\"background:#f8fafc\">\n      <th style=\"padding:8px;text-align:left;border-bottom:2px solid #e5e7eb\">Nome</th>\n      <th style=\"padding:8px;text-align:left;border-bottom:2px solid #e5e7eb\">Rótulo FTP</th>\n      <th style=\"padding:8px;text-align:center;border-bottom:2px solid #e5e7eb\">kcal</th>\n      <th style=\"padding:8px;text-align:center;border-bottom:2px solid #e5e7eb\">PTN</th>\n      <th style=\"padding:8px;text-align:center;border-bottom:2px solid #e5e7eb\">CHO</th>\n      <th style=\"padding:8px;text-align:left;border-bottom:2px solid #e5e7eb\">Fornecedor</th>\n      <th style=\"padding:8px;text-align:left;border-bottom:2px solid #e5e7eb\">Por</th>\n    </tr>\n    ${data.map(r=>`<tr style=\"border-bottom:1px solid #f3f4f6\">\n      <td style=\"padding:8px;font-weight:600\">${r.dados.n}</td>\n      <td style=\"padding:8px;color:#6b7280\">${r.dados.rotulo||'—'}</td>\n      <td style=\"padding:8px;text-align:center\">${r.dados.kcal}</td>\n      <td style=\"padding:8px;text-align:center\">${r.dados.ptn}</td>\n      <td style=\"padding:8px;text-align:center\">${r.dados.cho}</td>\n      <td style=\"padding:8px;color:#6b7280\">${r.dados.ref||'—'}</td>\n      <td style=\"padding:8px;color:#6b7280\">${r.dados.cadastradoPor||'—'}</td>\n    </tr>`).join('')}\n  </table>`;\n}"

new2 = """async function carregarListaIngredientes() {
  const lista=document.getElementById('ing_lista'); if(!lista) return;

  // Carregar ingredientes custom do Supabase
  let customData = [];
  if(_sb) {
    const {data} = await _sb.from('ingredientes_custom').select('nome,dados').order('nome');
    if(data?.length) {
      customData = data;
      data.forEach(r=>{ const ex=DB.findIndex(d=>d.n===r.dados.n); if(ex>=0) DB[ex]=r.dados; else DB.push(r.dados); });
    }
  }

  // Combinar DB fixo + custom
  const customNomes = new Set(customData.map(r=>r.dados.n));
  const todosIng = [
    ...DB.map(d => ({dados:d, custom:false})),
    ...customData.filter(r=>!DB.find(d=>d.n===r.dados.n)).map(r=>({dados:r.dados,custom:true}))
  ].sort((a,b)=>a.dados.n.localeCompare(b.dados.n));

  lista.innerHTML=`<div style="margin-bottom:12px;font-size:12px;color:#6b7280">${todosIng.length} ingredientes cadastrados</div>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <tr style="background:#f8fafc;position:sticky;top:0">
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;min-width:200px">Nome</th>
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Rótulo FTP</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">kcal</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">CHO g</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">PTN g</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">G.tot g</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">G.sat g</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">G.tr g</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Fibra g</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb">Na mg</th>
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb">Fornecedor</th>
    </tr>
    ${todosIng.map(({dados:d,custom})=>`<tr style="border-bottom:1px solid #f3f4f6${custom?' background:#f0fdf4':''}">
      <td style="padding:8px;font-weight:600">${d.n}${custom?' <span style="font-size:10px;background:#dcfce7;color:#166534;padding:1px 5px;border-radius:10px">novo</span>':''}</td>
      <td style="padding:8px;color:#6b7280;font-size:11px">${d.rotulo||'—'}</td>
      <td style="padding:8px;text-align:center">${d.kcal||0}</td>
      <td style="padding:8px;text-align:center">${d.cho||0}</td>
      <td style="padding:8px;text-align:center">${d.ptn||0}</td>
      <td style="padding:8px;text-align:center">${d.gt||0}</td>
      <td style="padding:8px;text-align:center">${d.gs||0}</td>
      <td style="padding:8px;text-align:center">${d.tr||0}</td>
      <td style="padding:8px;text-align:center">${d.fi||0}</td>
      <td style="padding:8px;text-align:center">${d.na||0}</td>
      <td style="padding:8px;color:#6b7280;font-size:11px">${d.ref||'—'}</td>
    </tr>`).join('')}
  </table>`;
}"""

if old2 in h:
    h = h.replace(old2, new2)
    print('OK lista completa')
else:
    print('ERRO lista - adicionando nova versao')
    # Just add new function replacing the old one
    idx = h.find('async function carregarListaIngredientes(')
    if idx > 0:
        end = h.find('\nasync function ', idx+50)
        if end == -1:
            end = h.find('\nfunction ', idx+50)
        h = h[:idx] + new2 + '\n' + h[end:]
        print('OK lista via replace index')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE')
