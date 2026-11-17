# Mapeamento MVC e contrato HTTP — Peça-Aqui

O documento `Arquitetura MVC.pdf` mapeia 27 classes, 7 módulos e 11 fluxos. O pacote usa a mesma divisão de responsabilidades, mantendo as regras críticas no PostgreSQL.

| Módulo | Controller + Model (apps/api) | View (apps/web) | Rotas HTTP (prefixo `/api/v1`) |
|---|---|---|---|
| Catálogo | `catalog/catalog.ts`, `common/crud.service.ts` | `views/pages/Catalog.tsx` | `/products`, `/brands`, `/categories`, `/units`, `/vehicles`, `/applications`, `/equivalences` |
| Compras | `operations/operations.ts` | `views/pages/Operations.tsx` | `/purchases`, `/purchases/:id/confirm` |
| Estoque | `operations/operations.ts` | `views/pages/Operations.tsx` | `/stock`, `/stock/movements`, `/stock/adjustments` |
| Vendas | `operations/operations.ts` | `views/pages/Operations.tsx` | `/sales`, `/sales/:id`, `/sales/:id/returns`, `/sales/:id/cancel` |
| Financeiro | `finance/finance.ts` | `views/pages/Finance.tsx` | `/closings`, `/payments`, `/receivables`, `/customer-balances`, `/refunds` |
| Acesso/auditoria | `auth/auth.ts`, `admin/admin.ts` | `controllers/ApiProvider.tsx`, `views/pages/Admin.tsx` | `/auth/login`, `/auth/me`, `/users`, `/profiles`, `/audit` |
| Lembretes | `reminders/reminders.ts` | `views/pages/Admin.tsx` | `/reminders`, `/reminders/:id/action` |
| Dashboard | `dashboard/dashboard.ts` | `App.tsx` | `/dashboard`, `/dashboard/recent` |

## Funcionalidades e operações críticas

- Compra: `INSERT purchases` + `purchase_items` + `confirm_purchase` em transação.
- Ajuste: `adjust_stock` com motivo e ator obtido do token.
- Venda: `INSERT sales` + `sale_items` + `confirm_sale` + `register_payment` (se pagamento imediato) na mesma transação.
- Devolução: `INSERT returns` + `return_items` + `confirm_return` em transação.
- Cancelamento: `cancel_sale`; registro preservado e movimentos compensatórios.
- Fechamento: `create_closing` valida vendas elegíveis e impede inclusão duplicada.
- Pagamento: `register_payment` valida valor e permite chave de idempotência.
- Dashboard: `v_dashboard_summary` é a origem oficial dos indicadores.

**Atenção à divergência explícita:** a arquitetura documenta Prisma como escolha provável; esta implementação usa `pg` para preservar as funções e triggers da Entrega 1 sem tentar `prisma db push`. A adoção de Prisma exigirá introspecção e testes de migração posteriores.

## Arquitetura das dependências

`View React → Controllers React → Controller HTTP NestJS → Service/Model → DbService → PostgreSQL`

O frontend não acessa o banco diretamente, e o controlador Nest não executa SQL diretamente (delegação ao serviço). A persistência continua responsável pela consistência de estoque e histórico.
