# SECURITY GATE P0 — Supabase / Autenticação

Data: 19/09/2026  
Status: **BLOQUEADO ATÉ REMEDIAÇÃO NO SUPABASE**

## Achado P0

Auditoria externa somente de leitura, usando apenas a chave pública/publishable já entregue ao navegador, comprovou:

| Recurso | Resultado anônimo |
|---|---|
| `produtos` | **EXPOSTO** |
| `ingredientes_custom` | **EXPOSTO** |
| `laudos` | **EXPOSTO** |
| `perfis` | nenhuma linha exposta no teste |
| `app_state` | nenhuma linha exposta no teste |

Também foi consultada a configuração pública do Supabase Auth:

- `disable_signup = false`
- confirmação automática de e-mail = false
- provider de e-mail = habilitado

Portanto há dois problemas independentes:

1. dados GMF são legíveis sem sessão autenticada;
2. o servidor ainda aceita criação de novos usuários.

A interface sozinha **não é uma barreira de segurança**.

## Contenção já preparada nesta branch

### Frontend

- autocadastro removido de `login.html`;
- autocadastro removido de `gmf_login.html`;
- `register.html` não cria mais usuário;
- Magic Link usa `shouldCreateUser:false`;
- login de usuários existentes permanece disponível.

### Banco

Arquivo `security/001_revoke_anon.sql`:

- revoga privilégios do papel `anon` nas cinco tabelas internas;
- não altera grants de `authenticated`;
- não reescreve políticas RLS existentes;
- adiciona default privilege defensivo para novas tabelas criadas por `postgres`.

Isso é contenção imediata. Não substitui a revisão completa de RLS.

## Ações obrigatórias no Supabase antes do merge

1. **Desabilitar "Allow new users to sign up"** no Auth.
2. Aplicar `security/001_revoke_anon.sql`.
3. Executar `security/002_rls_inventory.sql`.
4. Rerodar a auditoria anônima:
   - nenhuma tabela pode retornar `EXPOSED`;
   - configuração Auth deve mostrar signup desabilitado.
5. Testar com usuário existente:
   - login GMF;
   - listar produtos;
   - salvar/editar produto;
   - ingredientes custom;
   - laudos;
   - login SGQ;
   - ler e gravar `app_state`.
6. Só então liberar o PR do hotfix.

## Próxima etapa: RLS completo

Depois da contenção, desenhar políticas explícitas por tabela e operação.

Princípios:

- `anon`: nenhum acesso aos dados internos;
- `authenticated`: somente o necessário ao aplicativo;
- `perfis`: usuário comum lê o próprio perfil; papéis administrativos precisam de regra explícita;
- operações críticas devem evoluir para papéis/claims protegidos e audit trail;
- privilégios não devem depender de `user_metadata` editável pelo próprio usuário.

## O que NÃO foi feito

- nenhum usuário foi criado;
- nenhum dado de negócio foi alterado;
- nenhuma política RLS foi apagada;
- nenhum grant de `authenticated` foi revogado;
- nenhuma mudança foi aplicada ao projeto Supabase nesta branch.

## Evidência

PR de auditoria separado: #3.

Esse PR deve permanecer como evidência até a remediação ficar verde.
