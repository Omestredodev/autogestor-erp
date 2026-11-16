# Correção 001 — Saldo de estoque na confirmação de vendas

## Origem do problema

A função `apply_stock_movement()` utilizava `INSERT ... VALUES (produto, NEW.delta) ON CONFLICT DO UPDATE`.
Quando `NEW.delta` era negativo e o produto já tinha saldo, o PostgreSQL avaliava a
restrição `stock_balances_quantity_check` sobre a linha proposta (por exemplo, -2)
antes de resolver o conflito. O seed era executado dentro de `BEGIN/COMMIT`, então
seu carregamento era totalmente revertido.

## Corrigir uma instância existente (sem apagar o volume)

Na raiz do projeto e depois de substituir/mesclar os arquivos do pacote corrigido:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\repair_existing.ps1"
```

O script aplica o patch `database/patches/001_fix_stock_movement.sql`, verifica
se há dados demonstrativos, executa `04_seed.sql` somente se o banco não possui
produtos e roda o `check.ps1`. Não usa `down -v`.

## Para instalações novas

O arquivo `database/init/02_functions.sql` já está corrigido. Em volumes novos,
o Docker executa os arquivos `01_schema.sql` a `04_seed.sql` automaticamente.
Em volumes antigos, o Docker **não** reaplica scripts de inicialização — use o
patch indicado.

## Verificações esperadas

- 30 tabelas e 8 views
- 5 produtos e 4 usuários demonstrativos
- Venda de teste confirmada, estoque do produto PA-FILT-001 igual a 32
- `check.ps1` terminando com `TESTES FINALIZADOS` **sem erros anteriores**

As verificações do PostgreSQL precisam ser executadas localmente; não foram
executadas no ambiente de geração deste pacote.
