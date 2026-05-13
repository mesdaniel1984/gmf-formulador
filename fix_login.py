with open('gmf_login.html','r') as f:
    h = f.read()

OLD = """
// Auto-salvar e inicializar Supabase com as chaves embutidas
(function autoInit() {
  const url = document.getElementById('cfgUrl').value.trim();
  const key = document.getElementById('cfgKey').value.trim();
  if (url && key) {
    localStorage.setItem(CFG_KEY, JSON.stringify({ url, key }));
    supabase = window.supabase.createClient(url, key);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) redirecionarParaApp();
    });
  }
})();
if (cfg.url && cfg.key) document.getElementById('configPanel').removeAttribute('open');
else document.getElementById('configPanel').setAttribute('open', '');

// ── Inicializar Supabase ──────────────────────────────────────────────────────
let supabase = null;
if (cfg.url && cfg.key) {
  supabase = window.supabase.createClient(cfg.url, cfg.key);
  // Verificar se já está logado
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) redirecionarParaApp();
  });
}
"""

NEW = """
if (cfg.url && cfg.key) document.getElementById('configPanel').removeAttribute('open');
else document.getElementById('configPanel').setAttribute('open', '');

const SUPA_URL = 'https://ailzblgrxtdakpkchstl.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbHpibGdyeHRkYWtwa2Noc3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzkzOTEsImV4cCI6MjA5NDI1NTM5MX0.P22Cz4osfMvKBsbXn1jmwDC0ZOmbNQjSB-TBHxu6qRw';
localStorage.setItem('gmf_supabase_config', JSON.stringify({url:SUPA_URL,key:SUPA_KEY}));
let supabase = window.supabase.createClient(SUPA_URL, SUPA_KEY);
supabase.auth.getSession().then(({data})=>{ if(data.session) redirecionarParaApp(); });
"""

if OLD in h:
    h = h.replace(OLD, NEW)
    print('✅ Corrigido')
else:
    print('❌ Padrão não encontrado')

with open('gmf_login.html','w') as f:
    f.write(h)
