# Peça-Aqui — Entrega 2 | Aplicação MVC integrada

> **Contribuição em um único Pull Request**: API NestJS + View React + documentação. Não modifica nem substitui automaticamente a Entrega 1 (PostgreSQL), o `src/` ou o `.gitignore` que já existem na raiz do repositório.

## Base e estado de validação

- Base acadêmica: `Arquitetura MVC.pdf` e Etapas 6–10 do Peça-Aqui.
- Base da persistência: PostgreSQL Entrega 1 corrigida (30 tabelas, 8 views, funções SQL).
- Base visual: export React do Figma fornecido anteriormente; a View integrada nova reaproveita paleta e navegação em `apps/web`, enquanto o original fica documentado em `docs/entrega2/figma-src-referencia`.
- **API e View são uma implementação proposta; não foram executadas contra PostgreSQL neste ambiente.** Antes de aprovação, seguir checklist abaixo e registrar evidências reais.
- O GitHub remoto não pôde ser lido diretamente durante a geração. Por isso, esta entrega é **aditiva**, com `apps/api` e `apps/web`; não substitui o projeto existente.

## MVC

| Papel | Local | Responsabilidade |
|---|---|---|
| View | `apps/web/src/views/` | Formulários, páginas, navegação e componentes |
| Controller da View | `apps/web/src/controllers/` | Login, chamadas HTTP, atualização de dados |
| Model (View) | `apps/web/src/models/` | Tipos, formatos e utilitários sem regras autoritativas |
| Controller (API) | `apps/api/src/*/*.ts` com `@Controller` | Endpoints, permissão, entrada/saída |
| Model (API) | `apps/api/src/*/*.ts` com `@Injectable` | Orquestração, validações e transações |
| Persistência | `apps/api/src/db/` | PostgreSQL; invoca funções SQL da Entrega 1 |

Os endpoints usam `/api/v1` e nomes ingleses para manter o contrato do banco; o documento acadêmico usa nomes em português. O mapeamento está em `docs/entrega2/MAPEAMENTO_MVC_E_API.md`.

### Decisão de implementação da persistência

O documento prevê **Prisma ORM como tecnologia sugerida**, mas também identifica como decisão pendente chamar as funções SQL da Entrega 1 ou duplicar regras em TypeScript. Nesta versão foi adotado **`pg` (driver PostgreSQL)** para executar funções SQL transacionais já existentes. **Prisma não está configurado.** Isso deve ser registrado como decisão técnica e validado pelo grupo/professor antes de considerar aderência total ao documento.

## Pré-requisitos

- Node.js **22+** e npm.
- Docker Desktop com PostgreSQL da **Entrega 1 corrigida** em `127.0.0.1:5434`.
- Executar previamente os testes SQL da Entrega 1; a base deve conter usuários e produtos de demonstração.
- Projeto configurado com arquivos `.env` locais (**não publicar**).

## Instalação no Windows (PowerShell)

Entre na raiz do repositório depois de incorporar os arquivos deste pacote:

```powershell
# 1) O banco da Entrega 1 já deve estar ativo (use o compose dela).
# Na raiz, se compose.database.yaml estiver aqui:
docker compose -f compose.database.yaml up -d

# 2) API
cd apps/api
Copy-Item .env.example .env
# Edite apps/api/.env: DATABASE_URL, JWT_SECRET e DEMO_PASSWORD (não use as strings de exemplo).
npm install
npm run auth:seed
npm run build
npm run dev
```

Abra **um segundo terminal**, na raiz do repositório:

```powershell
cd apps/web
Copy-Item .env.example .env
npm install
npm run build
npm run dev
```

- API: `http://localhost:3001/api/v1/health`
- Web: `http://localhost:5173`
- Usuários fictícios: `admin@demo.invalid`, `vendedor@demo.invalid`, `estoque@demo.invalid`, `financeiro@demo.invalid`.
- Senha demonstrativa: **definida exclusivamente** pela pessoa que configurar `DEMO_PASSWORD` no ambiente local e executar `npm run auth:seed`. Não há senha em Git.

> **Atenção:** `auth:seed` altera senhas dos quatro usuários de demonstração no banco atual. Execute somente em ambiente acadêmico descartável. Nunca use sobre dados reais.

## Funcionalidades entregues no código

- Autenticação JWT com hash bcrypt e permissões verificadas na API.
- Catálogo de produtos, marcas/categorias/unidades, clientes, fornecedores, veículos, aplicações e equivalências.
- Compras e confirmação, estoque/movimentações e ajuste auditado.
- Venda confirmada no mesmo bloco transacional da baixa de estoque, com pagamento imediato opcional ou venda a prazo.
- Pesquisa/histórico, devolução, cancelamento, fechamento, recebimento e reembolso pendente.
- Lembretes pessoais/vinculados, auditoria, dashboard por views e administração de usuários.
- UI responsiva com formulários e listagens conectados por API.

## Não incluído nesta entrega

- Emissão de NF-e/NFC-e; integrações SEFAZ; consulta de placa.
- Relatórios avançados, paginação integral de todos os módulos e notificações push/background.
- Prisma ORM e migrations Prisma (banco existente usa DDL SQL, triggers e funções).
- Autenticação pronta para internet pública (JWT no estado React, sem refresh token, TLS/deploy/limites de tentativas ainda não configurados).
- Garantia de que todas as telas do Figma original estão idênticas: a nova View funcional é independente.

## Testes obrigatórios antes do merge

1. `npm install` e `npm run build` nas duas aplicações.
2. `npm run typecheck` nas duas aplicações.
3. `GET /api/v1/health` retorna `status: ok`.
4. Login de usuário criado pelo `auth:seed` e consulta do `/api/v1/auth/me`.
5. Compra → entrada no estoque → venda → saída → devolução → entrada → cancelamento sem duplicidade.
6. Venda a prazo → fechamento → pagamento parcial e final → contas a receber.
7. Permissão: vendedor não deve conseguir ajustar estoque ou criar usuário.
8. Recarregar a View e conferir os dados persistidos no PostgreSQL.
9. Executar scripts de validação SQL da Entrega 1 em banco descartável quando permitido.
10. Conferir que nenhum `.env`, segredo ou `node_modules` foi incluído no commit.

Use `docs/entrega2/VALIDACAO_E_PR.md` para registrar resultados reais. **Não registrar “aprovado” até executar.**

## Branch / PR

Branch recomendada `feat/mvc-backend-frontend` com um commit substantivo (`feat(mvc): integra API NestJS e interface React ao PostgreSQL`). Solicitar revisão e merge em `main` **apenas depois dos builds e testes práticos**. Consulte o guia detalhado em `docs/entrega2/VALIDACAO_E_PR.md`.

### Versionamento das dependências

Os `package-lock.json` **não puderam ser gerados neste ambiente sem acesso ao registro npm**. Ao executar `npm install` pela primeira vez, o colaborador deve incluir os dois arquivos `apps/api/package-lock.json` e `apps/web/package-lock.json` no PR. Para instalações reproduzíveis após isso, usar `npm ci`.

> O `.gitignore` raiz do repositório existente deve ser revisado manualmente. Há uma sugestão em `docs/entrega2/GITIGNORE_SUGERIDO.txt`; não substitua o arquivo atual automaticamente.
