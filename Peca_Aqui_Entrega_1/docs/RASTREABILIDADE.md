# Rastreabilidade: entregas acadêmicas → SQL

Fonte: documento de requisitos (RF01–RF50), modelo conceitual e diagrama de classes (27 classes) e arquitetura proposta do projeto **Peça-Aqui**. Os nomes SQL estão em inglês para integração, com regras documentadas em português.

| Área / RF | Entidades físicas / componentes |
|---|---|
| RF01–RF04: produtos e classificações | `products`, `brands`, `categories`, `units`, `product_price_history` |
| RF05–RF07: veículos e aplicações | `vehicles`, `product_applications` |
| RF08–RF09: equivalência | `product_equivalences`, `v_equivalences_bidirectional`, auditoria |
| RF10–RF11: clientes e fornecedores | `customers`, `suppliers` |
| RF12–RF18: compras e estoque | `purchases`, `purchase_items`, `stock_movements`, `stock_balances`, `confirm_purchase`, `adjust_stock` |
| RF19–RF22: preço, margem e snapshots | `products`, `suggested_price`, `product_price_history`, `sale_items` |
| RF23–RF28: venda e recebimentos | `sales`, `sale_items`, `payments`, `confirm_sale` |
| RF29–RF30: cancelamento | `sale_cancellations`, `cancel_sale`, movimentos compensatórios |
| RF31–RF32: devoluções | `returns`, `return_items`, `confirm_return` |
| RF33–RF35: busca e histórico | `v_sale_totals`, `v_sale_search`, índices e relações |
| RF36–RF39: fechamento | `closings`, `closing_items`, `payments`, `create_closing`, `v_closing_balances` |
| RF40–RF43: lembretes | `reminders`, `reminder_recipients`, índice por agendamento |
| RF44–RF45, RF49: auditoria | `audit_events`, triggers de auditoria, movimentos imutáveis |
| RF46–RF48: perfis | `users`, `profiles`, `permissions`, `profile_permissions` (autorização real na API futura) |
| RF50: busca integrada | índices, consultas SQL; API de busca global fica para próxima etapa |

## As 27 classes principais do modelo

1. Marca → `brands`
2. Categoria → `categories`
3. UnidadeMedida → `units`
4. Produto → `products`
5. Veiculo → `vehicles`
6. AplicacaoProduto → `product_applications`
7. EquivalenciaProduto → `product_equivalences`
8. Fornecedor → `suppliers`
9. Compra → `purchases`
10. ItemCompra → `purchase_items`
11. MovimentacaoEstoque → `stock_movements`
12. Cliente → `customers`
13. Venda → `sales`
14. ItemVenda → `sale_items`
15. CancelamentoVenda → `sale_cancellations`
16. Devolucao → `returns`
17. ItemDevolucao → `return_items`
18. Fechamento → `closings`
19. ItemFechamento → `closing_items`
20. Pagamento → `payments`
21. Usuario → `users`
22. Perfil → `profiles`
23. Permissao → `permissions`
24. PerfilPermissao → `profile_permissions`
25. Auditoria → `audit_events`
26. Lembrete → `reminders`
27. DestinatarioLembrete → `reminder_recipients`

### Tabelas auxiliares adicionadas nesta implementação

- `stock_balances`: projeção do saldo derivado de movimentos, para consultas eficientes e locks.
- `product_price_history`: histórico de custo/margem/preço além dos snapshots da venda.
- `refunds`: registro de obrigação de reembolso a conciliar, sem simular transferência real.

## Diferenças intencionais do modelo conceitual

- Tipos `BIGINT`, `NUMERIC`, `TIMESTAMPTZ` e FK são **decisões físicas**, não novas entidades de negócio.
- A tabela `sales` possui `customer_label` com valor por operação; o cliente cadastrado é opcional.
- `payments` vincula-se por restrição XOR a uma venda ou a um fechamento.
- `closing_items.sale_id` único impede incluir a mesma venda duas vezes na versão inicial do MVP.
- `stock_movements` guarda FKs tipadas para a origem e rejeita alteração/exclusão; o saldo não vira fonte de verdade independente.
- Futuras notas fiscais não foram modeladas porque estão fora do MVP, conforme RN01.
