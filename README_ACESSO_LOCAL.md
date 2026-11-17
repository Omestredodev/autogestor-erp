# Peça-Aqui — Correção do login e cadastro (ambiente LOCAL)

## Objetivo e limites

Este pacote **atualiza arquivos** da Entrega 2 e depende do PostgreSQL da Entrega 1, migração 002 (`Peca_Aqui_Entrega_1/database/patches/002_user_account_lifecycle.sql`) e dos demais arquivos do repositório `autogestor-erp` já na sua `main`.

- Quatro contas demonstrativas, com e-mails e senhas **diferentes** e **conhecidos para teste**.
- Login JWT; hash de senhas bcrypt com custo 12 (hash irreversível; não é criptografia reversível).
- Cadastro público: nome/e-mail/senha, estado PENDING; não entra até aprovação.
- Admin seleciona o perfil (ADMIN, SELLER, STOCK ou FINANCE) antes de aprovar, obrigatoriamente.
- Senha própria pode ser alterada em **Minha conta** (senha anterior obrigatória, token revogado).
- Admin pode editar, redefinir senha temporária, bloquear, reativar e excluir logicamente usuário.
- Lista de pendentes atualiza automaticamente a cada 8 s; também há o botão **Atualizar solicitações**.
- Um botão na Administração abre cadastro em **outra aba**, sem depender de compartilhar sessão entre abas.
- Corrigida incompatibilidade de origem `http://127.0.0.1:5173` x `http://localhost:5173`. A API de desenvolvimento permite as duas origens; produção só aceita `CORS_ORIGIN` configurada.

**Atenção:** estas quatro senhas são públicas neste documento. Usar **somente em localhost com dados fictícios**. Não reutilizar em produção, homologação acessível na internet ou contas reais. O comando `auth:seed` redefine as senhas **apenas destas quatro contas** toda vez que for executado e revoga seus tokens anteriores.

## Credenciais demonstrativas locais

| Perfil | E-mail | Senha de demonstração |
|---|---|---|
| ADMIN | `admin@demo.invalid` | `Admin@PecaAqui#2026!` |
| SELLER (vendedor) | `vendedor@demo.invalid` | `Vendas@PecaAqui#2026!` |
| STOCK (estoque/compras) | `estoque@demo.invalid` | `Estoque@PecaAqui#2026!` |
| FINANCE (financeiro) | `financeiro@demo.invalid` | `Financeiro@PecaAqui#2026!` |

Todas são aprovadas e podem entrar diretamente após rodar `npm run auth:seed`; **não exigem troca obrigatória no primeiro login**, mas a troca voluntária está disponível em Minha conta. Novas contas cadastradas têm senha **escolhida pelo próprio usuário** e não a senha demo.

## Instalação na cópia GitHub

**1. Preserve o trabalho local e abra uma branch de correção.** Se já estiver em `feat/fluxo-contas-usuarios`, mantenha a branch; não crie a mesma branch duas vezes.

```powershell
cd "C:\Projetos\Peça-Aqui-GitHub"
git status -sb
# Se estiver na main e não houver conflitos com arquivos já editados:
git switch -c fix/login-cadastro-mvc
```

**2. Extraia o ZIP na raiz do repositório** usando `Expand-Archive ... -DestinationPath "C:\Projetos\Peça-Aqui-GitHub" -Force`. Os arquivos principais são substituídos. O ZIP NÃO contém `.env` real nem dados de produção. Não apaga o banco.

**3. Confirme que o PostgreSQL está ativo** (porta `5434`):

```powershell
cd "C:\Projetos\Peça-Aqui-GitHub\Peca_Aqui_Entrega_1"
docker compose -f .\compose.database.yaml up -d
docker compose -f .\compose.database.yaml ps
```

**4. Confira `apps/api/.env` (não publique)**. Use sua configuração existente. Exemplo para banco local **se ainda não existir**:

```env
PORT=3001
DATABASE_URL=postgresql://peca_aqui:peca_aqui_somente_dev@127.0.0.1:5434/peca_aqui
JWT_SECRET=USE_UM_SEGREDO_ALEATORIO_DE_PELO_MENOS_32_CARACTERES
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
```

Troque o `JWT_SECRET` por segredo aleatório. Não coloque essas credenciais em Git. Se existir `apps/web/.env` e ele apontar para `localhost:3001`, altere para `VITE_API_URL=http://127.0.0.1:3001/api/v1`, ou remova esse override para usar o padrão do código.

**5. Pare a API e o frontend antigos (`Ctrl+C` nos terminais) e execute o setup**:

```powershell
cd "C:\Projetos\Peça-Aqui-GitHub"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\preparar_login_local.ps1
```

Esse script reaplica **idempotentemente** a migração 002, executa `npm install`, `typecheck`, `build`, e atualiza as quatro contas demo usando bcrypt. **Não rode em banco real**. Se preferir manual, rode na pasta `apps/api`: `npm install`, `npm run typecheck`, `npm run build`, `npm run auth:seed`; na pasta `apps/web`: `npm install`, `npm run typecheck`, `npm run build`.

**6. Inicie os serviços em terminais SEPARADOS**:

```powershell
# Terminal 1
cd "C:\Projetos\Peça-Aqui-GitHub\apps\api"
npm run dev
```

```powershell
# Terminal 2
cd "C:\Projetos\Peça-Aqui-GitHub\apps\web"
npm run dev
```

Acesse `http://127.0.0.1:5173` e confirme o health `http://127.0.0.1:3001/api/v1/health`.

**7. Verifique os 4 perfis automaticamente** (sem mostrar tokens):

```powershell
cd "C:\Projetos\Peça-Aqui-GitHub"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\testar_4_perfis.ps1
```

**8. Teste cadastro e aprovação visual em DUAS ABAS**:

1. Aba A: entre com `admin@demo.invalid` e `Admin@PecaAqui#2026!`.
2. Abra Administração e clique **Abrir cadastro em outra aba**.
3. Aba B: selecione **Solicitar cadastro**, informe nome, novo e-mail de teste (ex.: `novo.usuario@example.invalid`), senha com 12+ caracteres e confirmação. Envie.
4. Antes da aprovação, o login da conta nova deve ser negado.
5. Aba A: clique **Atualizar solicitações** (ou aguarde até 8 segundos); encontre usuário **Pendente**. **Escolha** SELLER, STOCK, FINANCE ou ADMIN e clique **Aprovar com perfil**.
6. Aba B: clique **Entrar**, informe o e-mail/senha definidos no cadastro (atualize a página, se quiser); agora o login deve funcionar, com perfil escolhido pela aba A. A aba A permanece com o administrador conectado.
7. Em **Minha conta** (aba B), altere a senha. O usuário deve precisar entrar novamente com a nova senha.
8. Volte à aba A: confira os botões **Desativar, Reativar, Redefinir senha, Excluir**. Nunca exclua a única conta administradora ativa.

**9. Teste integrado via PowerShell (opcional; cria e exclui uma conta fictícia)**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\testar_fluxo_usuarios.ps1
```

O script solicitará e-mail/senha de admin, cria usuário fictício, tenta login pendente, aprova com perfil STOCK, autentica, troca senha, testa revogação de tokens, redefinição, bloqueio, reativação e exclusão lógica. **Não compartilhe a saída contendo dados pessoais reais**.

## Diagnóstico

- **`Failed to fetch`**: API não está rodando em `127.0.0.1:3001`, `CORS_ORIGIN` não inclui a origem atual, ou `apps/web/.env` usa endereço diferente. Reinicie **ambos** após atualização.
- **401 credenciais inválidas**: rode `npm run auth:seed` em `apps/api` e use a senha exata da tabela acima. Cuidado: isso redefine somente as quatro contas demonstrativas.
- **403 conta pendente**: um admin precisa escolher o perfil e aprovar o pedido.
- **Erro de coluna `approval_status`**: falta executar a migração 002 (script `aplicar_migracao_usuarios.ps1`).
- **`ENOLOCK` em `npm audit`**: entre em `apps/api` ou `apps/web`, execute `npm install` para gerar `package-lock.json` e então `npm audit`. Não use `npm audit fix --force` sem testar migrações de versões.
- **Risco de Git**: seu clone já apresentou arquivos DOCX/PDF/PNG como alterados; não faça `git add .`.

## Pull Request (somente após testes)

```powershell
cd "C:\Projetos\Peça-Aqui-GitHub"
git status --short
# Use a lista exata de arquivos deste pacote, não 'git add .'.
git add apps/api/src/main.ts apps/api/src/admin/admin.ts apps/api/scripts/seed-passwords.ts apps/api/.env.example apps/web/.env.example apps/web/src/App.tsx apps/web/src/controllers/ApiProvider.tsx apps/web/src/views/pages/Admin.tsx apps/web/src/views/styles.css scripts/preparar_login_local.ps1 scripts/testar_4_perfis.ps1 scripts/testar_fluxo_usuarios.ps1 README_ACESSO_LOCAL.md
# Se sua branch já contiver arquivos não relacionados, revise git diff --cached antes de commit.
git diff --cached --stat
git commit -m "fix(auth): quatro perfis demo e aprovação por perfil em duas abas"
git push -u origin fix/login-cadastro-mvc
```

Se você permanecer em `feat/fluxo-contas-usuarios`, faça push dessa branch em vez de `fix/login-cadastro-mvc`. Crie o PR no GitHub e incorpore na main **somente após executar os testes**. Se esta correção for incorporada, não execute `auth:seed` em ambientes acessíveis a terceiros.

## Segurança e escopo

- `bcryptjs` (cost 12) é usado no backend para armazenar o hash individual das senhas. O JWT assinado expira após 8 horas; o banco confere `session_version` para revogar tokens após alteração de senha, desativação ou exclusão.
- Cadastro sem autoaprovação; o perfil é atribuído apenas pelo administrador na aprovação.
- Rate limit básico em memória (não adequado para múltiplas instâncias). Login via HTTP apenas em loopback; em produção é exigido HTTPS, tratamento de cookies/tokens, configuração de secrets e revisão de dependências.
- Ainda **não há envio de e-mail real** (SMTP, confirmação por link, recuperação por e-mail): e-mail é identificador da conta. Recuperação é feita via administrador.
- Esta atualização não constitui homologação de produção. Compilação e execução em PostgreSQL precisam ser confirmadas no Windows antes do merge.
