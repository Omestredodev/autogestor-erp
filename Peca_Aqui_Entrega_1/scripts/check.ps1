$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Set-Location (Join-Path $PSScriptRoot '..')
foreach ($test in @('database/tests/02_catalog_checks.sql','database/tests/01_smoke.sql')) {
  Write-Host "Validando $test" -ForegroundColor Cyan
  Get-Content -Raw -Encoding UTF8 $test | docker compose -f compose.database.yaml exec -T postgres sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
  if ($LASTEXITCODE -ne 0) { throw "Falha ao executar $test" }
}
Write-Host 'TESTES FINALIZADOS' -ForegroundColor Green
