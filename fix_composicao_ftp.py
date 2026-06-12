with open('gmf_formulador_wizard.html') as f:
    h = f.read()

old1 = "          <!-- Composição resumo -->\n          <div style=\"border:1px solid #ccc;border-radius:4px;background:#fff;padding:5px 8px\">\n            <div style=\"font-size:7px;font-weight:700;color:#666;margin-bottom:3px;text-transform:uppercase\">Composição da receita</div>\n            ${receita.map(r=>`<div style=\"display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:8px;border-bottom:.5px solid #f0f0f0;padding:2px 0\">\n              <span style=\"font-size:8px;line-height:1.4;word-break:break-word;flex:1\">${_nomeExibicao(r.d)}</span>\n              <span style=\"color:#666;white-space:nowrap;flex-shrink:0\">${r.qtde}g · ${f2(r.qtde/totalQ*100)}%</span>\n            </div>`).join('')}\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <!-- 4. CARACTERÍSTICAS FÍSICO-QUÍMIC"

new1 = "        </div>\n      </div>\n    </div>\n\n    <!-- COMPOSIÇÃO DA RECEITA -->\n    <div class=\"ftp-sec\">\n      <div class=\"ftp-sec-t\">3b. Composição da Receita (por kg de produto)</div>\n      <table style=\"width:100%;border-collapse:collapse;font-size:9px\">\n        <tr style=\"background:#1e3a8a;color:#fff\">\n          <th style=\"padding:5px 8px;text-align:left;font-weight:700\">Ingrediente</th>\n          <th style=\"padding:5px 8px;text-align:center;font-weight:700;width:100px\">Quantidade (g)</th>\n          <th style=\"padding:5px 8px;text-align:center;font-weight:700;width:80px\">%</th>\n        </tr>\n        \${receita.slice().sort((a,b)=>b.qtde-a.qtde).map((r,i)=>`\n        <tr style=\"background:\${i%2===0?'#fff':'#f8fafc'};border-bottom:.5px solid #e5e7eb\">\n          <td style=\"padding:5px 8px\">\${_nomeExibicao(r.d)}</td>\n          <td style=\"padding:5px 8px;text-align:center\">\${r.qtde.toFixed(1)}</td>\n          <td style=\"padding:5px 8px;text-align:center\">\${f2(r.qtde/totalQ*100)}%</td>\n        </tr>`).join('')}\n        <tr style=\"background:#f0f4ff;font-weight:700;border-top:1.5px solid #1e3a8a\">\n          <td style=\"padding:5px 8px\">Total</td>\n          <td style=\"padding:5px 8px;text-align:center\">\${totalQ.toFixed(1)}</td>\n          <td style=\"padding:5px 8px;text-align:center\">100%</td>\n        </tr>\n      </table>\n    </div>\n\n    <!-- 4. CARACTERÍSTICAS FÍSICO-QUÍMIC"

if old1 in h:
    h = h.replace(old1, new1)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
print('DONE - size:', len(h))
