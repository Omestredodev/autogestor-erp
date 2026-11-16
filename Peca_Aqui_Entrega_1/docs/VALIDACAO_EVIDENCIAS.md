# Checklist de validação para o responsável da Entrega 1

**Status do pacote gerado:** revisão estrutural estática realizada; **execução real em PostgreSQL ainda não comprovada neste ambiente**. O colega responsável deve executar os passos abaixo e registrar as evidências ANTES de afirmar que o banco está aprovado.

## Validação reprodutível

| Nº | Ação / Evidência | Resultado esperado | Situação inicial |
|---|---|---|---|
| 1 | `docker compose -f compose.database.yaml up -d` | Container `peca-aqui-postgres` saudável | Não executado |
| 2 | `docker compose -f compose.database.yaml logs postgres` | Scripts `01` a `04` sem erro | Não executado |
| 3 | `scripts/check.ps1` ou `scripts/check.sh` | Consulta estrutural e `OK` na smoke suite | Não executado |
| 4 | Consulta `v_product_stock` | PA-FILT-001 com saldo 32 após seed | Não executado |
| 5 | Consulta `v_sale_totals` | Venda demo 119,80; vendas a prazo 99 e 145 | Não executado |
| 6 | Compra confirmada duas vezes | Segunda tentativa rejeitada | Não executado |
| 7 | Venda sem estoque | Operação negada; saldo preservado | Não executado |
| 8 | Devolução de 1 item e cancelamento do restante | Saldo 32 → 33 → 34, no teste com ROLLBACK | Não executado |
| 9 | Fechamento com duas vendas | Total de R$244,00; parcial de R$100,00; saldo R$144,00 | Não executado |
| 10 | Recriação do zero, com confirmação explícita | Mesmo seed ao subir volume vazio | Não executado |

Registrar versão do Docker, data da execução, máquina/OS, prints do terminal e quaisquer correções. Não publicar credenciais nem dados pessoais reais nas evidências.

## Revisão de segurança

- Não publicar `.env`.
- Os usuários demo não possuem senha e não representam autenticação implementada.
- O backend futuro deve usar conexões com permissões mínimas e não permitir escrita direta no saldo de estoque.
- Separar cálculos de faturamento comercial dos recebimentos.
- Reembolso não equivale a transferência executada.

## Decisões a discutir no grupo

- Tratar devolução/cancelamento de venda já incluída em fechamento parcialmente pago e saldo excedente: a primeira entrega atualiza o valor líquido e registra obrigação de reembolso, mas requer conciliação explícita.
- Definir formatos e validações reais de CPF/CNPJ e EAN (seed usa números fictícios apenas para demonstração).
- Definir serviço de agendamento e envio de lembretes no backend.
- Definir requisitos de desempenho quantitativos antes de benchmarks.
