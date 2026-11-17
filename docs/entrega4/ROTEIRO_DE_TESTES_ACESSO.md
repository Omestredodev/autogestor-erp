# Roteiro de evidências — Login, cadastro e aprovação (Peça-Aqui)

Execute contra banco **local de demonstração** depois de aplicar a correção. Insira resultado, data e captura de tela em cada caso. Não registre senhas, JWTs ou informações pessoais nos prints.

| ID | Pré-condição / ação | Resultado esperado | Resultado obtido | Evidência |
|---|---|---|---|---|
| A01 | Executar `scripts/testar_4_perfis.ps1` | 4 perfis corretos, senha incorreta rejeitada | Pendente | — |
| A02 | Acessar tela `127.0.0.1:5173` e consultar health | Site carregado e API status `ok` | Pendente | — |
| A03 | Login com ADMIN demonstrativo | Dashboard e menu Administração visíveis | Pendente | — |
| A04 | Login com SELLER, STOCK e FINANCE | Cada perfil com permissões próprias | Pendente | — |
| A05 | Na aba A, entrar como admin; usar botão `Abrir cadastro em outra aba` | Aba A mantém admin; aba B abre cadastro | Pendente | — |
| A06 | Na aba B, criar conta com e-mail novo/senha individual | Solicitação recebida, estado PENDING | Pendente | — |
| A07 | Tentar entrar na aba B antes da aprovação | HTTP 401, acesso negado | Pendente | — |
| A08 | Na aba A, aguardar 8s ou clicar `Atualizar solicitações` | Conta pendente aparece | Pendente | — |
| A09 | Tentar aprovar sem selecionar perfil | Botão desabilitado/erro de validação | Pendente | — |
| A10 | Escolher STOCK na aba A e aprovar | Estado APPROVED, perfil STOCK | Pendente | — |
| A11 | Na aba B, atualizar a página, entrar com e-mail/senha criada | Login permitido sem trocar a senha; perfil STOCK | Pendente | — |
| A12 | Tentar usuário STOCK acessar `/api/v1/users` | HTTP 403 (permissão de admin negada) | Pendente | — |
| A13 | Na aba B, trocar a própria senha em Minha conta | Sessão anterior invalidada; nova senha funciona | Pendente | — |
| A14 | Na aba A, redefinir senha da conta de teste | Senha temporária individual única; troca obrigatória | Pendente | — |
| A15 | Na aba A, desativar a conta de teste | Login e token antigo recusados | Pendente | — |
| A16 | Na aba A, reativar a conta | Login volta a funcionar | Pendente | — |
| A17 | Na aba A, excluir logicamente a conta | Login negado, usuário aparece excluído, histórico preservado | Pendente | — |
| A18 | Tentar excluir a única conta ADMIN ativa | API deve recusar operação | Pendente | — |
| A19 | Verificar `npm run typecheck` e `npm run build` em `apps/api` e `apps/web` | Sem erros | Pendente | — |
| A20 | `npm audit --omit=dev` em `apps/api` e `apps/web` | Vulnerabilidades de produção documentadas/corrigidas | Pendente | — |

## Prova automatizada parcial

No VS Code, com PostgreSQL/API/Web iniciados, execute:

```powershell
cd "C:\Projetos\Peça-Aqui-GitHub"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\testar_4_perfis.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\testar_fluxo_usuarios.ps1
```

O primeiro verifica as contas fixas locais. O segundo pede credenciais ADMIN e cria uma conta fictícia específica para o teste; executa cadastro pendente, aprovação, senha nova, reset, bloqueio, reativação e exclusão lógica.

## Condições para aprovar o Pull Request

- Todas as verificações críticas A01–A19 aprovadas no Windows.
- Nenhum `.env`, token, captura com senha ou credencial real enviado ao GitHub.
- Migração 002 aplicada com sucesso no banco de demonstração e documentada.
- **Não** considerar os testes automatizados como evidência do fluxo visual de duas abas: A05–A11 requerem teste manual.
- Corrigir ou registrar separadamente vulnerabilidades de dependências antes de qualquer uso fora do ambiente local.
