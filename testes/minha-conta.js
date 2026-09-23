// Painel temporário retirado; não há formulário de senha nesta página.
const assert=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('minha-conta.html','utf8');
assert.ok(page.includes('url=index.html'));
assert.ok(!page.includes('passwordForm'));
