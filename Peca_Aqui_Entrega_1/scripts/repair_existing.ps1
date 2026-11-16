# PEÇA-AQUI | Corrige banco inicializado pelo pacote v1 e carrega seed ausente.
# Executar com: powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\repair_existing.ps1"
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location (Join-Path $PSScriptRoot '..')
function RunSqlFile([string]$file) {
  if (!(Test-Path -LiteralPath $file)) { throw "Arquivo não encontrado: $file" }
  Write-Host "Executando $file" -ForegroundColor Cyan
  Get-Content -LiteralPath $file -Raw -Encoding UTF8 | docker compose -f compose.database.yaml exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
  if ($LASTEXITCODE -ne 0) { throw "Falha ao executar $file" }
}
Write-Host 'Verificando serviço PostgreSQL...' -ForegroundColor Cyan
docker compose -f compose.database.yaml ps
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose não está disponível' }
RunSqlFile 'database/patches/001_fix_stock_movement.sql'
Write-Host 'Verificando se os dados de demonstração já existem...' -ForegroundColor Cyan
$countResult = 'SELECT count(*) FROM peca_aqui.products;' | docker compose -f compose.database.yaml exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -v ON_ERROR_STOP=1'
if ($LASTEXITCODE -ne 0) { throw 'Erro ao consultar quantidade de produtos' }
$countText = ($countResult | Out-String).Trim()
if ($countText -notmatch '^\d+$') { throw "Contagem inesperada de produtos: $countText" }
if ([int]$countText -eq 0) {
  RunSqlFile 'database/init/04_seed.sql'
} else {
  Write-Host "Banco possui $countText produtos. Seed não será reaplicado para evitar duplicações." -ForegroundColor Yellow
}
Write-Host 'Executando verificações SQL...' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'check.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Validação SQL falhou' }
Write-Host 'Correção aplicada e testes concluídos. Consulte as mensagens de cada caso.' -ForegroundColor Green
