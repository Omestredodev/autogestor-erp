# Peça-Aqui — Banco de Dados PostgreSQL (Entrega 1)

Esta pasta/documentação corresponde **exclusivamente à primeira entrega técnica** do projeto acadêmico Peça-Aqui: o banco de dados relacional. O backend, a autenticação HTTP e o frontend integrado serão objeto da **Entrega 2**.

> **Situação:** scripts e documentação preparados. A homologação depende de executar a instalação e os testes em PostgreSQL 17. Não declarar a execução dos testes como aprovada sem registrar a saída real do terminal.

## Tecnologias

- PostgreSQL 17 (imagem `postgres:17-alpine`)
- Docker Compose
- SQL / PL/pgSQL
- PowerShell (Windows) e shell (Linux/macOS) para automação

## Escopo implementado no banco

O esquema contempla **30 tabelas** e **8 views**, organizadas nos seguintes domínios:

| Domínio | Conteúdo |
| --- | --- |
| Produtos e catálogo | Marcas, categorias, unidades, produtos, aplicações e equivalências |
| Compras | Fornecedores, compras, itens e confirmação |
| Estoque | Movimentações, saldos e ajustes rastreáveis |
| Vendas | Vendas, itens, preços históricos, confirmações e consultas |
| Pós-venda | Devoluções e cancelamentos com movimentos compensatórios |
| Financeiro | Pagamentos, fechamentos e registro de reembolsos |
| Administração | Usuários demonstrativos, perfis, permissões e auditoria |
| Lembretes | Agendamento, contexto e destinatários |

**Importante:** as funções e restrições SQL fornecem integridade de dados; não substituem autenticação, autorização e validação de uma API de produção.

## Instalação do zero — Windows / PowerShell

Pré-requisito: Docker Desktop ligado, Docker Compose disponível e porta `5434` livre. Execute os comandos na **raiz do repositório**, onde está o arquivo `compose.database.yaml`.

```powershell
Copy-Item .env.example .env

docker compose -f compose.database.yaml up -d

docker compose -f compose.database.yaml ps
```

Na primeira criação de um volume vazio, o PostgreSQL executa os arquivos da pasta `database/init` em ordem:

1. `01_schema.sql` — tabelas, restrições e índices;
2. `02_functions.sql` — funções e gatilhos;
3. `03_views.sql` — consultas;
4. `04_seed.sql` — dados fictícios para demonstração.

O `.env` contém configuração local e **não deve ser enviado ao GitHub**. O arquivo `.env.example` pode e deve ser versionado.

## Testes

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\check.ps1"
```

O script executa a inspeção de estrutura e o smoke test transacional, que testa compras, estoque, venda, devolução, cancelamento, fechamento, pagamentos e auditoria. Os testes executados com `ROLLBACK` não devem alterar permanentemente a base de demonstração.

Critério de aceite: todos os comandos terminam sem erros e aparece `TESTES FINALIZADOS`. Registrar a saída real do terminal no pull request.

### Instalação antiga com erro de estoque

A correção da função `apply_stock_movement()` já está incorporada à versão atual de `database/init/02_functions.sql`.

**Volumes antigos não executam novamente os arquivos `database/init`.** Para corrigir uma instalação anterior sem apagar dados, use:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\repair_existing.ps1"
```

Detalhes em [`CORRECAO_001.md`](CORRECAO_001.md).

## Arquivos importantes

| Arquivo ou diretório | Finalidade |
| --- | --- |
| [`DATABASE_SETUP.md`](DATABASE_SETUP.md) | Guia detalhado de instalação, reset e consultas SQL |
| `compose.database.yaml` | Serviço PostgreSQL e volume persistente |
| `.env.example` | Exemplo de configuração local |
| `database/init/` | Esquema, funções, views e seed |
| `database/patches/` | Correção de instâncias antigas |
| `database/tests/` | Verificações de estrutura e regras de negócio |
| `scripts/` | Testes, reparo e reset |
| [`docs/INTEGRACAO_BACKEND.md`](docs/INTEGRACAO_BACKEND.md) | Contrato para a futura API |
| [`docs/HANDOFF_EQUIPE.md`](docs/HANDOFF_EQUIPE.md) | Divisão de responsabilidades por entrega |
| [`docs/RASTREABILIDADE.md`](docs/RASTREABILIDADE.md) | Relação com os requisitos acadêmicos |
| [`docs/VALIDACAO_EVIDENCIAS.md`](docs/VALIDACAO_EVIDENCIAS.md) | Checklist de evidências |

## Integração com a Entrega 2

O backend previsto é NestJS/TypeScript, com API REST, e o frontend previsto é React/TypeScript. A API deverá consumir as consultas e funções do banco e acrescentar autenticação, autorização e validação de entrada.

Não conectar o frontend diretamente ao PostgreSQL nem compartilhar credenciais do banco no navegador.

## Boas práticas para o repositório

- Publicar **os arquivos extraídos, preservando as pastas**, e não apenas um ZIP.
- Não publicar `.env`, dumps com dados privados ou senhas reais.
- Não substituir `README.md`, `.gitignore` ou `package.json` existentes no frontend sem revisar e mesclar.
- Garantir que o `.gitignore` principal inclua ao menos `.env`, `node_modules/`, arquivos de log e dumps.
- Criar uma branch de trabalho como `feat/postgresql-core` e abrir PR para revisão antes do merge.
- Documentar no PR quem executou os testes, quais melhorias foram feitas e quais pendências permanecem.

## Limitações

Esta entrega **não** inclui endpoints HTTP, login operacional, telas funcionais ou emissão de NF-e/NFC-e. Os dados são fictícios. A preparação do pacote não é evidência de testes aprovados; a execução local com Docker deve ser verificada antes da homologação.
