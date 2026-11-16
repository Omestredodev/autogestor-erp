# Contrato de integração: PostgreSQL → NestJS / React

**Fase seguinte.** O banco desta primeira entrega é a origem dos dados. O frontend não acessa PostgreSQL diretamente: a API NestJS valida, autentica, autoriza e orquestra operações usando transações e os objetos existentes.

## Conexão local

- Host: `localhost` — porta: `5434` — banco: `peca_aqui` — schema: `peca_aqui`.
- String genérica: `postgresql://USUARIO:SENHA@localhost:5434/peca_aqui?schema=peca_aqui`.
- Nunca commitar senhas em arquivos do backend. Configurar `DATABASE_URL` em `.env` ignorado.
- Ao usar Prisma, **não deixar `prisma db push` sobrescrever as constraints e triggers do SQL**. Fazer introspecção (`prisma db pull`), verificar mapeamentos e planejar futuras migrações versionadas.

## Tabelas para criação de rascunhos

| Operação | Gravar primeiro | Depois chamar |
|---|---|---|
| Compra | `purchases(status=DRAFT)`, `purchase_items` | `confirm_purchase(purchase_id,actor_id)` |
| Venda | `sales(status=DRAFT)`, `sale_items` | `confirm_sale(sale_id,actor_id)` |
| Devolução | `returns(status=DRAFT)`, `return_items` | `confirm_return(return_id,actor_id)` |
| Cancelamento | — | `cancel_sale(sale_id,actor_id,reason)` |
| Ajuste de estoque | — | `adjust_stock(product_id,new_quantity,actor_id,reason)` |
| Fechamento | — | `create_closing(customer_id,actor_id,data_inicio,data_fim,ARRAY[ids])` |
| Pagamento | — | `register_payment(actor_id,valor,forma,venda_id,fechamento_id,chave)` |
| Reembolso pendente | — | `record_refund(sale_id,actor_id,valor,motivo)` |

### Exemplo completo — confirmar venda no backend

**ETAPA A.** API autoriza vendedor e valida payload. Em UMA transação:

```sql
BEGIN;
SET search_path TO peca_aqui, public;
INSERT INTO sales(customer_id,customer_label,seller_id,notes,payment_terms)
VALUES (NULL,'AO CONSUMIDOR',1,'Exemplo de checkout','IMMEDIATE')
RETURNING id;
-- Usar o id retornado, por exemplo :sale_id
INSERT INTO sale_items(sale_id,product_id,quantity,practiced_price)
VALUES (:sale_id,1,1,58.33);
SELECT confirm_sale(:sale_id,1);
COMMIT;
```

**ETAPA B.** Se houver pagamento, registrar recebimento na mesma transação do checkout quando a operação comercial exigir confirmação financeira atômica:

```sql
SELECT register_payment(1,58.33,'PIX',:sale_id,NULL,:idempotency_key);
```

O `:sale_id` e `:idempotency_key` representam **parâmetros da API**, não sintaxe literal do psql. Em NestJS/Prisma, invocar SQL parametrizado; nunca montar comandos por interpolação do usuário.

### Venda a prazo

- `payment_terms='DEFERRED'` exige `customer_id` válido.
- A API chama `confirm_sale` e **não inventa pagamento**.
- Consulta de saldos usa `v_accounts_receivable`, sem contar em duplicidade uma venda agrupada em fechamento.

### Fechamento de várias vendas

```sql
SELECT create_closing(:customer_id,:actor_id,:data_inicio,:data_fim,ARRAY[:sale_1,:sale_2]::BIGINT[]);
```

A função verifica confirmação, cliente, período, condição a prazo e unicidade. O frontend não deve enviar o valor total como verdade; ele é calculado no banco.

## Leituras oficiais (não reproduzir cálculo com regras diferentes)

| View | Consumo |
|---|---|
| `v_product_stock` | Listagem, pesquisa, saldo e estoque baixo |
| `v_equivalences_bidirectional` | Consulta de peça equivalente em ambos os sentidos |
| `v_sale_totals` | Valor original, devolvido e líquido de venda |
| `v_sale_search` | Histórico de vendas por cliente, vendedor e observação |
| `v_closing_balances` | Saldo e pagamentos de cada fechamento |
| `v_accounts_receivable` | Contas a receber sem duplicidade venda/fechamento |
| `v_customer_balances` | Saldos financeiros por cliente |
| `v_dashboard_summary` | Indicadores calculados a partir dos registros |

## Contratos HTTP sugeridos para a segunda entrega

```
GET /api/v1/products                GET /api/v1/products/:id
POST /api/v1/products               PATCH /api/v1/products/:id
GET /api/v1/vehicles                GET /api/v1/equivalences
POST /api/v1/purchases              POST /api/v1/purchases/:id/confirm
GET /api/v1/stock                   POST /api/v1/stock/adjustments
POST /api/v1/sales                  POST /api/v1/sales/:id/confirm
GET /api/v1/sales                   GET /api/v1/sales/:id
POST /api/v1/sales/:id/returns      POST /api/v1/sales/:id/cancel
POST /api/v1/closings               POST /api/v1/payments
GET /api/v1/receivables             GET /api/v1/dashboard
GET /api/v1/audit                   GET/POST/PATCH /api/v1/reminders
```

## Regras de segurança e concorrência

1. **Não usar a credencial superprivilegiada do Docker na API de produção.** Criar uma role restrita e conceder somente operações necessárias, após validar o contrato.
2. O banco realiza locks por registro nos fluxos críticos; toda gravação de cabeçalho/itens/confirmação deve fazer parte da **mesma transação** no backend.
3. ID de usuário deve vir do **contexto autenticado**, não do corpo informado pelo navegador.
4. Nunca expor `password_hash`, auditorias privadas ou dados pessoais sem permissão.
5. Chaves de idempotência evitam duplicações de requisições; nos commits posteriores validar concorrência com duas sessões de banco simultâneas.
6. Reembolsos e estornos exigem conciliação financeira; cancelar uma venda não equivale a transferir automaticamente dinheiro ao cliente.
7. Sem nota fiscal no MVP: o comprovante interno não equivale à NF-e.

## Entrega mínima do segundo colega

Backend NestJS + frontend React conectados ao banco; CRUD de produtos/clientes/fornecedores, compra, ajuste, venda, devolução, cancelamento, fechamento, pagamentos, consulta e dashboard. Incluir autenticação/permissões e testes integrados. Demonstrar **compra → estoque → venda → pagamento/fechamento → devolução/cancelamento → auditoria** com saldos consistentes.
