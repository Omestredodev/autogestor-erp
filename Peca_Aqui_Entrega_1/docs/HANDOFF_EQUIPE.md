# Planejamento de duas entregas grandes (mínimo de divisões)

## ENTREGA 1 — Banco de Dados PostgreSQL (colega 1)

**Escopo substancial e delimitado:** modelagem física a partir das etapas de engenharia de software, schema, constraints, views, funções transacionais, dados sintéticos, Docker, documentação e testes SQL.

### Trabalho efetivo do responsável

1. Extrair o pacote, revisar a modelagem com os 50 RFs e os 27 elementos de classe.
2. Subir PostgreSQL do zero com `docker compose -f compose.database.yaml up -d` e validar os logs de inicialização.
3. Executar `scripts/check.ps1` (ou shell equivalente), registrar resultado dos testes e corrigir qualquer problema encontrado.
4. Conferir ao menos uma compra, uma venda, um cancelamento, uma devolução e um fechamento via SQL/pgAdmin.
5. Rever restrições de integridade, índices e segurança; documentar decisões, limitações e possíveis melhorias.
6. Publicar **um commit grande** ou abrir **um PR completo** com banco e evidências de testes.

**Sugestão de commit:** `feat(database): implementa PostgreSQL completo do Peca-Aqui`

**Critério de aceite:** um integrante que nunca executou o projeto consegue seguir o README, recriar o banco, ver os dados demonstrativos e executar os testes; nenhum frontend ou backend é necessário.

## ENTREGA 2 — Backend + Frontend integrados (colega 2, com colaboração do grupo)

**Escopo substancial e delimitado:** API NestJS, autenticação/permissões, validação e operações transacionais, endpoints, integração do protótipo React ao PostgreSQL via API, telas dos fluxos comerciais, testes integrados e demonstração.

### Trabalho efetivo do responsável

1. Criar `apps/api` e organizar controladores, serviços, DTOs, guards e serviços de domínio conforme `INTEGRACAO_BACKEND.md`.
2. Implementar login seguro, autorização e tratamento de erro, sem confiar em permissões de tela.
3. Consumir funções SQL e views oficiais, sem duplicar regras de estoque e financeiro na interface.
4. Adaptar o frontend exportado do Figma Make para consumir a API e remover números demonstrativos fixos.
5. Entregar fluxo demonstrável: compra → saldo → venda → pagamento → devolução/cancelamento → consultas e dashboard.
6. Incluir integração, testes, screenshots e documentação. Publicar **um commit/PR grande** após revisão.

**Sugestão de commit:** `feat(app): integra API NestJS e frontend React ao banco`

**Critério de aceite:** rodar Docker, API e web com documentação clara e conseguir demonstrar o fluxo de ponta a ponta com persistência real.

## Atenção: atribuição e responsabilidade acadêmica

Criar commits separados é apropriado para organizar entregas. Porém, **somente apertar “Commit changes” não comprova autoria da implementação**. Para que a avaliação de cada integrante reflita seu trabalho real, cada responsável deve executar, revisar, testar, melhorar e explicar sua parte na apresentação. Registrar as tarefas e contribuições no README/PR com transparência.

## GitHub pelo navegador (sem terminal Git)

1. O responsável abre o repositório no GitHub.
2. Preferencialmente cria uma branch com nome `feat/postgresql-core` no seletor de branches.
3. Usa **Add file → Upload files**. Arquivos devem ser enviados **extraídos**, preservando `compose.database.yaml`, `database/`, `docs/` e `scripts/` (um ZIP solto no repositório não torna o projeto executável).
4. Se o navegador não preservar a estrutura das pastas, cria antes o diretório pelo **Add file → Create new file** (por exemplo `database/init/.gitkeep`) e envia os SQLs dentro dele; repete para `database/tests`, `docs` e `scripts`.
5. Preenche a mensagem de commit da entrega e confirma.
6. Abre um Pull Request de `feat/postgresql-core` para `main`, descrevendo testes efetivamente executados, decisões e arquivos alterados.
7. O grupo revisa, faz merge e só então inicia a segunda entrega.

**Nota:** se já houver arquivos nessas pastas, revisar possíveis conflitos antes de substituir. Não enviar `.env` com senhas locais.

**Compatibilidade com o repositório do Figma:** não sobrescrever o `README.md`, `package.json` nem o `.gitignore` do frontend. O banco usa `DATABASE_SETUP.md` e `compose.database.yaml` para coexistir com o projeto React. Incorporar as sugestões de ignore manualmente.
