$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$compose = Join-Path $root 'Peca_Aqui_Entrega_1/compose.database.yaml'
$sql = Join-Path $root 'Peca_Aqui_Entrega_1/database/patches/002_user_account_lifecycle.sql'
if (!(Test-Path $compose) -or !(Test-Path $sql)) { throw 'Execute a partir do repositório com as Entregas 1 e 2.' }
Write-Host 'Aplicando migração de usuários no PostgreSQL do Peça-Aqui...'
$cid = (docker compose -f $compose ps -q postgres).Trim()
if ($LASTEXITCODE -ne 0 -or !$cid) { throw 'PostgreSQL não iniciado. Execute docker compose up -d no diretório da Entrega 1.' }
docker cp $sql "${cid}:/tmp/peca_aqui_migration_002.sql"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar SQL para o container' }
docker compose -f $compose exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f /tmp/peca_aqui_migration_002.sql'
if ($LASTEXITCODE -ne 0) { throw 'Migração falhou. Corrija antes de iniciar a API.' }
Write-Host 'MIGRAÇÃO 002 APLICADA' -ForegroundColor Green
