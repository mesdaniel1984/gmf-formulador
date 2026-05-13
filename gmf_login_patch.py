with open('gmf_login.html','r') as f:
    h = f.read()

OLD = "if (cfg.url) document.getElementById('cfgUrl').value = cfg.url;\nif (cfg.key) document.getElementById('cfgKey').value = cfg.key;"
NEW = """document.getElementById('cfgUrl').value = 'https://ailzblgrxtdakpkchstl.supabase.co';
document.getElementById('cfgKey').value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbHpibGdyeHRkYWtwa2Noc3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzkzOTEsImV4cCI6MjA5NDI1NTM5MX0.P22Cz4osfMvKBsbXn1jmwDC0ZOmbNQjSB-TBHxu6qRw';
localStorage.setItem('gmf_supabase_config', JSON.stringify({url: document.getElementById('cfgUrl').value, key: document.getElementById('cfgKey').value}));"""

h = h.replace(OLD, NEW)
with open('gmf_login.html','w') as f:
    f.write(h)
print('OK' if NEW[:30] in h else 'ERRO')
