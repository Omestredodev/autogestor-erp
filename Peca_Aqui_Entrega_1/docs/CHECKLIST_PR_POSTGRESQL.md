# Peça-Aqui — Checklist do PR PostgreSQL

## Antes do envio
- [ ] Verificar que os arquivos estão **extraídos** e preservam as pastas.
- [ ] Não enviar `.env`, `node_modules`, backups, volumes ou credenciais reais.
- [ ] Mesclar `docs/GITIGNORE_SUGESTAO.txt` ao `.gitignore` atual (não substituir o frontend).
- [ ] Confirmar que os arquivos SQL e o Docker Compose não sobrescrevem outros componentes do projeto.
- [ ] Validar instalação em volume novo conforme `DATABASE_SETUP.md`.
- [ ] Rodar `scripts/check.ps1` e registrar a saída sem erros.
- [ ] Anexar evidências em `docs/VALIDACAO_EVIDENCIAS.md` ou no PR.
- [ ] Documentar eventuais problemas encontrados e correções efetivamente realizadas.

## Publicação no GitHub
1. Obter acesso como colaborador, ou usar fork.
2. Criar branch `feat/postgresql-core` a partir de `main`.
3. Enviar os arquivos extraídos para a branch.
4. Criar PR de `feat/postgresql-core` para `main`.
5. Descrever autoria efetiva, testes executados e limitações.
6. Solicitar revisão; só efetuar merge após testes e revisão.

> Atenção: este pacote foi validado quanto à integridade do ZIP e organização dos arquivos, **não** por execução do PostgreSQL neste ambiente.
