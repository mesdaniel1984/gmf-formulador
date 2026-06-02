with open('gmf_formulador_wizard.html') as f:
    h = f.read()

# Find the classeLegal div
old_legal = '    <div id="classeLegal" style="margin-top:4px;padding:10px 14px;background:var(--blue-light);border-radius:var(--radius-sm);border:1px solid #93c5fd;font-size:11.5px;line-height:1.7"></div>\n  </div>\n\n  <div clas'

# Find the EMBALAGEM section start
idx_emb = h.find('    <!-- SUBTIPO (aparece para tipos c')
if idx_emb == -1:
    idx_emb = h.find('EMBALAGEM / APRESENTAÇÃO')
print('EMBALAGEM pos:', idx_emb)

# Find and remove classeLegal from current position
idx_legal = h.find('    <div id="classeLegal"')
end_legal = h.find('</div>\n  </div>\n\n  <div clas', idx_legal) + len('</div>\n')
legal_div = h[idx_legal:end_legal]
print('legal_div:', repr(legal_div[:80]))

# Remove from current pos and add before EMBALAGEM
h_without = h[:idx_legal] + h[end_legal:]

# Find new EMBALAGEM position after removal
idx_emb2 = h_without.find('    <!-- SUBTIPO')
if idx_emb2 == -1:
    idx_emb2 = h_without.find('EMBALAGEM / APRESENTAÇÃO')

h_new = h_without[:idx_emb2] + legal_div + '\n' + h_without[idx_emb2:]

with open('gmf_formulador_wizard.html', 'w') as f:
    f.write(h_new)
print('DONE')
