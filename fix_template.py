with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Fix escaped template literals in composicao table
old = r"""        \${receita.slice().sort((a,b)=>b.qtde-a.qtde).map((r,i)=>`
        <tr style="background:\${i%2===0?'#fff':'#f8fafc'};border-bottom:.5px solid #e5e7eb">
          <td style="padding:5px 8px">\${_nomeExibicao(r.d)}</td>
          <td style="padding:5px 8px;text-align:center">\${r.qtde.toFixed(1)}</td>
          <td style="padding:5px 8px;text-align:center">\${f2(r.qtde/totalQ*100)}%</td>
        </tr>`).join('')}
        <tr style="background:#f0f4ff;font-weight:700;border-top:1.5px solid #1e3a8a">
          <td style="padding:5px 8px">Total</td>
          <td style="padding:5px 8px;text-align:center">\${totalQ.toFixed(1)}</td>
          <td style="padding:5px 8px;text-align:center">100%</td>
        </tr>"""

new = """        ${receita.slice().sort((a,b)=>b.qtde-a.qtde).map((r,i)=>`
        <tr style="background:${i%2===0?'#fff':'#f8fafc'};border-bottom:.5px solid #e5e7eb">
          <td style="padding:5px 8px">${_nomeExibicao(r.d)}</td>
          <td style="padding:5px 8px;text-align:center">${r.qtde.toFixed(1)}</td>
          <td style="padding:5px 8px;text-align:center">${f2(r.qtde/totalQ*100)}%</td>
        </tr>`).join('')}
        <tr style="background:#f0f4ff;font-weight:700;border-top:1.5px solid #1e3a8a">
          <td style="padding:5px 8px">Total</td>
          <td style="padding:5px 8px;text-align:center">${totalQ.toFixed(1)}</td>
          <td style="padding:5px 8px;text-align:center">100%</td>
        </tr>"""

if old in h:
    h = h.replace(old, new)
    print('OK')
else:
    print('ERRO')

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h)
