$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
Write-Host 'ATENÇÃO: este comando apaga permanentemente todos os dados locais do volume PostgreSQL.' -ForegroundColor Yellow
$confirm=Read-Host 'Digite APAGAR para recriar o banco do zero'
if ($confirm -cne 'APAGAR') { Write-Host 'Cancelado'; exit 0 }
docker compose -f compose.database.yaml down -v
if ($LASTEXITCODE -ne 0) { throw 'Erro ao remover volumes' }
docker compose -f compose.database.yaml up -d
if ($LASTEXITCODE -ne 0) { throw 'Erro ao iniciar' }
Write-Host 'Aguarde o healthcheck e execute scripts/check.ps1'
