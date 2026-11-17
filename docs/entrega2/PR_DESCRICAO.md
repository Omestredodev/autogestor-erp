# Título sugerido
feat(mvc): implementa API NestJS e frontend React integrados ao Peça-Aqui

## Resumo
- Estrutura aditiva `apps/api` (NestJS, autenticação, controllers, serviços e acesso PostgreSQL).
- Estrutura aditiva `apps/web` (React + TypeScript com View/Controller/Model).
- Fluxos comerciais utilizando funções SQL e views da Entrega 1: compras, estoque, vendas, devoluções, cancelamentos, fechamentos e recebimentos.
- Catálogo, clientes, fornecedores, veículos, equivalências, lembretes, dashboard e auditoria.
- Documentação, arquivos `.env.example` e instruções para executar e validar.

## Decisões técnicas
- Manutenção das regras transacionais na Entrega 1 (PostgreSQL) em vez de duplicar código.
- Driver `pg` ao invés do Prisma previsto como sugestão na documentação; diferença sujeita à revisão do grupo.
- Mantido o `src` atual do repositório: interface integrada independente em `apps/web`, referência do Figma em `docs/entrega2`.

## Evidências
- [ ] `npm run build` na API — anexar resultado.
- [ ] `npm run build` no frontend — anexar resultado.
- [ ] Testes de login, RBAC e operações principais com PostgreSQL — anexar saída.
- [ ] Capturas de interface (sem senhas ou tokens).
- [ ] `package-lock.json` da API e do web incluídos.
- [ ] Dados sensíveis não incluídos.

## Estado
**Não marcar como concluído sem os testes acima.** Informar defeitos conhecidos e ajustes feitos na própria branch.
