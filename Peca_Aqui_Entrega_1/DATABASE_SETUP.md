> **Atualização importante (correção 001):** se você instalou a primeira versão e o seed falhou com `stock_balances_quantity_check`, siga `CORRECAO_001.md` ou execute `scripts/repair_existing.ps1`. Não apague o volume para aplicar a correção.

# Peça-Aqui — Entrega 1: Banco de Dados PostgreSQL

> **Artefato acadêmico de persistência — reprodutível do zero**. Esta entrega contempla **apenas o banco**, para ser integrada depois por um backend NestJS e frontend React. As rotas HTTP e o login **ainda não foram implementados**.

## O que o pacote implementa

- Esquema PostgreSQL com chaves estrangeiras, `CHECK`, índices e entidades baseadas no Modelo Conceitual e Diagrama de Classes do Peça-Aqui.
- Cadastro de produtos, marcas, categorias, unidades, veículos e aplicações; equivalências bidirecionais.
- Clientes, fornecedores, compras, vendas, itens, devoluções, cancelamentos, fechamentos, pagamentos e lembretes.
- Controle de estoque por **movimentos imutáveis** e saldo sincronizado de forma atômica por gatilho.
- Preço sugerido por margem manual; históricos de preços e snapshots dos valores nas vendas.
- Funções transacionais de negócios, consultas para o futuro backend, auditoria e dados sintéticos de demonstração.
- Testes de fumaça transacionais (`ROLLBACK`) e documentação de integração e rastreabilidade.

## Requisitos

- Docker Desktop funcionando (Docker Engine com Compose).
- Porta **5434** livre na máquina (configurável em `.env`).
- Para consultas gráficas: pgAdmin, DBeaver ou outro cliente PostgreSQL (opcional).

## Execução do ZERO (PowerShell / Windows)

Execute na raiz do repositório, onde está `compose.database.yaml`. Se o repositório já possui um `README.md` gerado pelo Figma, mantenha-o; este guia usa o nome `DATABASE_SETUP.md` para evitar substituição.

```powershell
Copy-Item .env.example .env

docker compose -f compose.database.yaml up -d

docker compose -f compose.database.yaml ps
```

Na primeira inicialização com **volume vazio**, a imagem oficial `postgres:17-alpine` executa automaticamente os arquivos `database/init/01_...` até `04_...`, nessa ordem. O volume é persistente: reiniciar o container **não recria** o banco.

Acesse pelo pgAdmin ou DBeaver:

| Campo | Valor local de demonstração |
|---|---|
| Host | localhost |
| Porta | 5434 |
| Banco | peca_aqui |
| Usuário | peca_aqui |
| Senha | conforme `.env` (exemplo fornecido apenas para desenvolvimento) |
| Schema | peca_aqui |

> Credenciais do exemplo **não devem ser usadas em produção**. O arquivo `.env` deve ficar fora do Git (veja o aviso abaixo sobre `.gitignore`). Os usuários de demonstração no banco **não possuem credenciais de login**.

### Checar os dados

```powershell
# Exibe versão do banco e quantidade de produtos:
docker compose -f compose.database.yaml exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM peca_aqui.products;"'

# Roda verificações de estrutura e casos de uso, sem modificar permanentemente o seed:
.\scripts\check.ps1
```

No Linux ou macOS, execute `./scripts/check.sh`.

Também é possível usar `docker compose -f compose.database.yaml logs postgres` para acompanhar o log de inicialização.

### Voltar ao estado original (ATENÇÃO: destrutivo)

Execute `./scripts/reset.ps1` (ou `./scripts/reset.sh`): o script exige digitar **APAGAR**, remove o volume local e recria tudo com os dados fictícios. **Faça backup antes de resetar um banco que contenha dados importantes.**

> **Importante ao adicionar ao GitHub:** NÃO substitua o `.gitignore` existente do projeto React. Acrescente nele a linha `.env` (e demais entradas deste pacote) caso ainda não existam. Se já houver `compose.database.yaml`, mescle em vez de sobrescrever.

## Estrutura do pacote

```text
compose.database.yaml
.env.example
DATABASE_SETUP.md
README_BANCO_POSTGRESQL_Peca_Aqui.md
# Mesclar docs/GITIGNORE_SUGESTAO.txt ao .gitignore existente
database/
  init/
    01_schema.sql       -- estrutura física, constraints e índices
    02_functions.sql    -- triggers, auditoria, funções transacionais
    03_views.sql        -- consultas oficiais e indicadores
    04_seed.sql         -- dados fictícios + operações demonstrativas
  tests/
    01_smoke.sql        -- compra/venda/retorno/cancelamento/fechamento
    02_catalog_checks.sql
scripts/
  check.ps1 / check.sh
  reset.ps1 / reset.sh
docs/
  INTEGRACAO_BACKEND.md
  RASTREABILIDADE.md
  HANDOFF_EQUIPE.md
  modelo_fisico.dot / modelo_fisico.svg / modelo_fisico.png
```

## Decisões importantes (referências às entregas acadêmicas)

1. **Venda não depende de nota fiscal**. NF-e/NFC-e fica fora deste MVP e não foi simulada como documento legal.
2. **Venda e fechamento são entidades distintas**. A cobrança não pode duplicar vendas já agrupadas.
3. **Estoque oficial nasce de movimentos**; a tabela de saldo é projeção sincronizada do ledger.
4. **Cancelar não apaga**. O cancelamento cria movimentos de compensação apenas das quantidades ainda não devolvidas.
5. **Devolver não apaga a venda**. Uma devolução confirmada é vinculada a item vendido e limitada à quantidade ainda devolvível.
6. **Alterar preço na venda não altera preço do produto**. O preço praticado e snapshots históricos são armazenados no item.
7. **Equivalências são imediatas para usuário autorizado**, com auditoria, sem fluxo de aprovação.
8. **AO CONSUMIDOR** não é cliente genérico com observação compartilhada; o campo `customer_id` pode ser `NULL`, com anotação por venda.
9. **Papel do banco x backend**: as funções SQL preservam integridade; autenticação, autorização por permissão, regras de interface e emissão fiscal serão responsabilidade da próxima entrega.

## Demonstração SQL resumida

No pgAdmin, execute os comandos abaixo (Query Tool):

```sql
SET search_path TO peca_aqui, public;
SELECT * FROM v_dashboard_summary;
SELECT internal_code, on_hand, stock_status FROM v_product_stock;
SELECT sale_number, status, gross_total, returned_total, net_total FROM v_sale_totals;
SELECT * FROM v_accounts_receivable;
SELECT entity, action, happened_at FROM audit_events ORDER BY id DESC LIMIT 15;
```

Os fluxos de criação/validação com exemplos **executáveis em transação e `ROLLBACK`** estão em `database/tests/01_smoke.sql`. Para integração real, consulte `docs/INTEGRACAO_BACKEND.md`.

## Limitações e escopo explícito

- Não foram implementados login, API HTTP, frontend ou regras fiscais.
- Os `INSERT` diretos nas tabelas de rascunho são preparados pelo backend, que depois chama a função de confirmação.
- Atualizações diretas com credencial privilegiada de desenvolvimento podem contornar fluxos de aplicação. Em produção, usar papel de banco **sem acesso direto de escrita** a saldos, movimentos e históricos; a API deve autorizar cada ação.
- Devolução/cancelamento recalcula o líquido comercial, **mas reembolsos já pagos e estornos devem ser conciliados no financeiro**. A tabela `refunds` e a função `record_refund` registram a obrigação sem afirmar que houve reembolso bancário.
- Não há metas quantitativas de desempenho previamente definidas; índices são hipóteses iniciais, não benchmark medido.
- As consultas e testes precisam ser executados contra uma instância real PostgreSQL antes de o grupo declarar a entrega homologada.

## Versionamento e atribuição de trabalho

Esta é a **ENTREGA 1 — PostgreSQL**, para uma contribuição substancial separada do backend/frontend. O colega responsável deverá **executar, testar, revisar e corrigir** o banco antes de publicar a entrega, registrando resultados no PR/commit. Não atribuir autoria de tarefas somente pelo ato de fazer o upload. Detalhes em `docs/HANDOFF_EQUIPE.md`.
