# Handoff e checklist — Pull Request da Entrega 2

## O que o colega recebe

Um conjunto **aditivo** de diretórios `apps/api/`, `apps/web/` e `docs/entrega2/`. Não deve substituir `database/` nem sobrescrever o `src/` do protótipo Figma que já estiver na raiz do repositório.

## Publicar numa branch pelo site do GitHub

1. O administrador do repositório concede acesso de colaborador ao colega.
2. No GitHub, abrir o seletor de branch (`main`) e digitar `feat/mvc-backend-frontend`; escolher **Create branch from main**.
3. Abrir essa branch e enviar **os conteúdos extraídos** do ZIP preservando os caminhos `apps/api/`, `apps/web/`, `docs/entrega2/`, `scripts/` e `README_ENTREGA_2.md` por **Add file → Upload files** (pode arrastar a árvore de arquivos, conforme o navegador permitir).
4. Garantir que não foram enviados `.env`, `node_modules`, `dist`, screenshots privados ou senhas.
5. Commit: `feat(mvc): integra backend NestJS e frontend React ao PostgreSQL`.
6. Abrir PR da `feat/mvc-backend-frontend` → `main`, com checklist e evidências.
7. **Não clicar em Merge** antes da validação local e da revisão do autor do projeto.

## Publicar pelo terminal (alternativa mais confiável)

```powershell
git switch main
git pull origin main
git switch -c feat/mvc-backend-frontend
# Copiar os arquivos do ZIP sobre a raiz do repositório, SEM sobrescrever o src existente.
git status --short
git add apps docs/entrega2 README_ENTREGA_2.md scripts
# Verificar que .env não aparece em git status:
git diff --cached --name-only
git commit -m "feat(mvc): integra backend NestJS e frontend React ao PostgreSQL"
git push -u origin feat/mvc-backend-frontend
```

Depois abrir PR em **Pull requests → New pull request**, base `main`, compare `feat/mvc-backend-frontend`. Revisar o diff, executar os testes, e só depois fazer merge.

## Testes e evidências a anexar ao PR

| Teste | Resultado antes da execução | Evidência solicitada |
|---|---|---|
| Build API NestJS | Não executado | Terminal com `npm run build` |
| Build React | Não executado | Terminal com `npm run build` |
| Login JWT e /auth/me | Não executado | Status HTTP (sem senha/token visível) |
| Consulta produtos e estoque | Não executado | Dados do seed |
| Compra confirmada | Não executado | Compra e movimento PURCHASE_IN |
| Venda confirmada | Não executado | Venda, SALE_OUT, pagamento e dashboard |
| Devolução e cancelamento | Não executado | Estoque e históricos, sem duplicidade |
| Fechamento e pagamento parcial | Não executado | Valores em aberto e baixa |
| Permissões | Não executado | Acesso proibido com perfil SELLER a /stock/adjustments |
| Testes SQL da Entrega 1 | Não executado nesta entrega | Evidência em banco descartável |

## Pontos de atenção antes de considerar concluído

- O projeto remoto não foi consultável durante a geração; comparar arquivos de `apps` com a árvore real do GitHub.
- O backend **não usa Prisma**. Registrar decisão com o grupo, se a disciplina o exigir.
- Em ambiente real, configurar TLS, autenticação com tokens mais seguros, rate limiting, logs/observabilidade, migrações e backup.
- **Senha de demonstração não é fornecida.** `auth:seed` somente com segredo criado localmente.
- O banco da Entrega 1 deve estar validado e corrigido antes de executar esta entrega.
- Se houver falha de build/teste, corrigir na branch e fazer novo commit antes do merge.
