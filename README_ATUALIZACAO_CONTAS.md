# Peça-Aqui — Atualização de autenticação e administração de usuários

**Objetivo:** completar cadastro, login com senha individual, aprovação, troca de senha, desativação, redefinição e exclusão lógica no MVC existente. Implementação para **desenvolvimento/local**; não implica liberação para internet pública.

## Integração com o repositório existente

Este ZIP contém **apenas arquivos novos/modificados**. Extraia na raiz do clone `C:\Projetos\Peça-Aqui-GitHub` preservando a estrutura. Não substitui outras pastas do banco nem o protótipo `src/` existente. A migração SQL é obrigatória **antes** de reiniciar o backend.

### Preparar uma branch (PowerShell na raiz do clone)

```powershell
cd 'C:\Projetos\Peça-Aqui-GitHub'
git status -sb
git switch -c feat/fluxo-contas-usuarios
# Descompacte o ZIP no diretório atual (ou use Expand-Archive -DestinationPath . -Force)
```

**Cuidado:** seu clone já apresentou 13 arquivos binários modificados localmente, por aparente tratamento de LFS. **Não execute** `git add .`, `reset --hard`, `restore` ou `clean` sem investigar. Faça stage apenas dos caminhos da seção Git abaixo.

### 1. Banco de dados existente — migração 002

O PostgreSQL da Entrega 1 deve estar iniciado e validado.

```powershell
cd 'C:\Projetos\Peça-Aqui-GitHub'
docker compose -f .\Peca_Aqui_Entrega_1\compose.database.yaml up -d
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\aplicar_migracao_usuarios.ps1
```

Confirmação: `MIGRAÇÃO 002 APLICADA`. Reaplicar a migração não apaga dados nem substitui senhas. A migração acrescenta `approval_status`, `deleted_at`, `session_version`, `must_change_password` e índice exclusivo de e-mail normalizado. **Não rode em produção sem backup e revisão.**

**Se começar do zero:** crie o banco com os scripts originais da Entrega 1 e aplique a migração 002 **depois** da inicialização. Ela não foi adicionada aos scripts automáticos de criação do volume, para evitar conflito com a ordem do seed existente.

### 2. Backend — atualização de código e senhas demo

Pare a API antiga (Ctrl+C), e no terminal:

```powershell
cd 'C:\Projetos\Peça-Aqui-GitHub\apps\api'
npm install
npm run typecheck
npm run build
```

As credenciais **já existentes** podem funcionar até serem trocadas. Para substituir a senha compartilhada anterior dos **quatro usuários demo** por quatro senhas temporárias únicas, execute **UMA ÚNICA VEZ**, após a migração:

```powershell
npm run auth:seed
```

O script mostra uma senha diferente para cada usuário de demonstração **uma vez no terminal**, exige troca no primeiro login e revoga sessões anteriores. **Não repita** o comando sem necessidade, pois ele substitui novamente as quatro senhas. Remova `DEMO_PASSWORD` do `.env` se o utilizava: esta versão não usa mais senha coletiva. Nenhuma senha deve entrar no Git, nas capturas ou no chat.

Inicie:

```powershell
npm run dev
```

### 3. Frontend

Abra outro terminal:

```powershell
cd 'C:\Projetos\Peça-Aqui-GitHub\apps\web'
npm install
npm run typecheck
npm run build
npm run dev
```

Abra `http://localhost:5173`. A interface possui duas abas: **Entrar** e **Solicitar cadastro**. Cadastros externos usam o perfil inicial `SELLER`, mas ficam `PENDING` e **inativos** até aprovação do administrador. Não há autoatribuição do perfil `ADMIN`.

### Fluxo manual ponta a ponta

1. Entre com `admin@demo.invalid` e a senha temporária individual mostrada pelo `auth:seed` (ou com a senha individual já conhecida). Se temporária, **troque-a** na tela de primeiro acesso.
2. Saia e clique em **Solicitar cadastro**. Informe um e-mail de teste e uma senha pessoal de no mínimo 12 caracteres; confirme. O login antes da aprovação deve falhar.
3. Entre como ADMIN, abra **Administração**, encontre o cadastro pendente e clique em **Aprovar**. Alternativamente, o admin pode criar uma conta diretamente, escolhendo o perfil; recebe uma senha temporária **única**, exibida apenas na resposta da operação.
4. Faça login com a nova conta. Em **Minha conta**, altere sua senha informando a atual e confirmando a nova. O sistema invalida os tokens anteriores e pede novo login.
5. O ADMIN pode **Editar** nome/e-mail/perfil, **Desativar**, **Reativar**, **Redefinir senha** ou **Excluir**. Redefinir gera uma senha temporária aleatória, que obriga nova troca.
6. **Excluir** é lógico: marca `deleted_at` e `active=false`, revoga sessões e bloqueia acesso. Não apaga vendas, compras nem trilha de auditoria.
7. Não é permitido excluir/desativar a própria conta administrativa nem remover o último administrador ativo.

### 4. Teste automatizado de integração no seu PC

Após configurar a API e trocar a senha temporária do ADMIN:

```powershell
cd 'C:\Projetos\Peça-Aqui-GitHub'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\testar_fluxo_usuarios.ps1
```

O script pede e-mail e senha do ADMIN de forma interativa (senha oculta), cria uma **conta descartável com endereço `.invalid`**, e verifica: pendência → aprovação → login → troca de senha → token antigo revogado → reset administrativo → troca obrigatória → desativação → reativação → exclusão lógica. Nenhuma credencial é incluída no relatório. **Somente em ambiente de desenvolvimento**, pois o teste grava e exclui logicamente uma conta fictícia.

### 5. Versionar apenas a correção

Na raiz:

```powershell
git add -- apps/api/src/auth/auth.ts apps/api/src/admin/admin.ts apps/api/scripts/seed-passwords.ts

git add -- apps/web/src/App.tsx apps/web/src/controllers/ApiProvider.tsx apps/web/src/models/types.ts apps/web/src/views/pages/Admin.tsx apps/web/src/views/pages/Account.tsx apps/web/src/views/styles.css apps/web/src/vite-env.d.ts

git add -- Peca_Aqui_Entrega_1/database/patches/002_user_account_lifecycle.sql scripts/aplicar_migracao_usuarios.ps1 scripts/testar_fluxo_usuarios.ps1 README_ATUALIZACAO_CONTAS.md docs/entrega3/SEGURANCA_E_LIMITES.md

git diff --cached --name-only
git commit -m 'feat(auth): cadastro, aprovação, senha individual e gestão de usuários'
git push -u origin feat/fluxo-contas-usuarios
```

Depois abra um PR **`feat/fluxo-contas-usuarios` → `main`**, execute os testes e peça revisão. Não inclua `.env`, `node_modules` nem os 13 documentos/imagens marcados como modificados anteriormente.

## Rotas novas e alteradas

| Método | Rota (`/api/v1`) | Acesso |
|---|---|---|
| POST | `/auth/register` | Público; status PENDING |
| POST | `/auth/login` | Público; senha individual |
| GET | `/auth/me` | Autenticado |
| POST | `/auth/change-password` | Autenticado, exige senha atual |
| POST | `/auth/logout` | Autenticado, revoga sessões |
| GET | `/users` | ADMIN |
| POST | `/users` | ADMIN, senha temporária única |
| PATCH | `/users/:id` | ADMIN, editar nome/e-mail/perfil |
| POST | `/users/:id/approve` | ADMIN |
| POST | `/users/:id/deactivate` | ADMIN |
| POST | `/users/:id/reactivate` | ADMIN |
| POST | `/users/:id/reset-password` | ADMIN, temporária única |
| DELETE | `/users/:id` | ADMIN, **exclusão lógica** |

## Situação de testes

- Verificação de sintaxe TypeScript/TSX **executada no ambiente de montagem do pacote**.
- **Não foi possível executar `npm install`, NestJS, Vite e PostgreSQL juntos neste ambiente isolado**. O resultado dos builds e do teste integrado no seu VS Code será a evidência real necessária para aceitar o PR.
- Os avisos de `npm audit` **não estão automaticamente resolvidos** por este pacote.

Consulte `docs/entrega3/SEGURANCA_E_LIMITES.md` para riscos e próximo ciclo de endurecimento.
