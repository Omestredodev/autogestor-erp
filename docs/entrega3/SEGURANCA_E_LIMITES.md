# Segurança, limites e pendências — fluxo de contas

## Decisões implementadas

- **Cadastro público como solicitação**, não acesso imediato. O perfil inicial é `SELLER`, com `approval_status=PENDING` e `active=FALSE`. Só ADMIN aprova. Não há cadastro público de ADMIN.
- **Senha individual** com bcrypt custo 12. Validação: mínimo 12 caracteres, máximo 72 bytes (limite bcrypt); confirmação no backend; sem senhas fixas no código.
- **Sessões revogáveis**: JWT contém `{sub,ver}`; `session_version` é conferido no PostgreSQL em todas as requisições protegidas e incrementado após troca/reset de senha, logout, edição e bloqueio/exclusão.
- **Primeiro acesso com senha temporária**: `must_change_password=TRUE` restringe API a `/auth/me`, `/auth/change-password`, `/auth/logout` até alteração.
- **Exclusão lógica** por `deleted_at` e `active=FALSE`, porque vendas, compras, lembretes e auditoria referenciam usuários; exclusão física destruiria integridade e rastreabilidade.
- **Auditoria**: a tabela `users` já possui trigger de INSERT/UPDATE, e `audit_row()` omite `password_hash`; operações administrativas usam `DbService.tx` com o ID do autor.
- **Proteção de administração**: somente perfil `ADMIN` pode administrar usuários; não pode excluir/desativar a si próprio, nem remover o último ADMIN ativo.
- **Rate limit básico em memória** por endereço IP/e-mail para login e por IP para cadastro. Proteção de produção requer proxy/reverse proxy e armazenamento compartilhado.
- **Não armazenar JWT em localStorage**: token apenas em memória no React. Ao atualizar a página, é necessário fazer novo login.
- **Recuperação de senha** por ADMIN: senha temporária criptograficamente aleatória exibida uma vez; não há serviço SMTP no MVP.

## Limitações importantes para produção

1. **O projeto não está pronto para exposição pública**. Adicionar HTTPS, controle de IP/rate limiting centralizado (Redis/proxy), monitoramento de abuso, CSP, logs estruturados e proteção contra enumeração de contas.
2. **Sem e-mail de verificação ou recuperação automática**. Exige administrador para aprovação e redefinição; implantar provedor SMTP com tokens descartáveis de uso único, prazo curto e entrega segura.
3. **Senha temporária exibida ao ADMIN**: transmitir apenas por canal privado, nunca em commits, prints ou chats, e trocar no primeiro acesso. Não há autoenvio.
4. **Logout invalida sessões do usuário** por alteração de `session_version`, não apenas a aba atual (simplificação segura para MVP).
5. **Migração 002 separada da criação inicial**: aplicar após o Docker init da Entrega 1; validar em banco descartável antes de executar em base importante.
6. **Auditoria de dados pessoais**: os triggers de users registram nome e e-mail antigos/novos; para produção, estudar política de retenção e LGPD.
7. **Inexistem testes de integração executados** neste ambiente: realizar `npm run typecheck`, `npm run build` e `scripts/testar_fluxo_usuarios.ps1` no PC Windows com Docker.

## `npm audit` recebido pelo usuário (17/11/2026)

O relatório apontou `@nestjs/cli` e dependências de desenvolvimento `@angular-devkit/*`, `glob`, `minimatch` e `picomatch`, incluindo 6 alertas de severidade alta. A recomendação automatizada `npm audit fix --force` forçaria `@nestjs/cli@12.0.13`, potencialmente introduzindo mudanças incompatíveis com a configuração NestJS 11/TypeScript 5.

**Não aplicar `--force` sem migração e testes.** Na API, execute:

```powershell
npm audit --omit=dev
npm audit fix --dry-run
npm outdated
```

Se `npm audit --omit=dev` retornar zero vulnerabilidades, os achados listados dizem respeito à cadeia de desenvolvimento, mas ainda exigem tratamento de segurança e ambiente de build confiável. Caso contrário, priorize vulnerabilidades em runtime. Faça a migração NestJS 12 / TypeScript 6 em **PR separado**, seguindo documentação oficial, e execute todos os testes. `npm audit` também deve ser feito em `apps/web`.

Não marcar auditoria de dependências como resolvida até executar os comandos e comparar os resultados após as correções.
