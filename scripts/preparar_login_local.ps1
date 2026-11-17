# PECA-AQUI - preparar login local sem excluir o banco existente
# Execute do REPOSITORIO: powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\preparar_login_local.ps1
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$api=Join-Path $root 'apps/api'
$web=Join-Path $root 'apps/web'
if(!(Test-Path (Join-Path $api '.env'))){throw "Falta apps/api/.env. Configure DATABASE_URL e JWT_SECRET (32+ caracteres) e rode novamente."}
if(!(Test-Path (Join-Path $root 'scripts/aplicar_migracao_usuarios.ps1'))){throw 'O pacote de contas anterior deve estar no repositório (migração 002).'}
Write-Host '1/5 Aplicando/verificando a migracao 002 (idempotente)...' -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'scripts/aplicar_migracao_usuarios.ps1')
if($LASTEXITCODE -ne 0){throw 'Falha na migracao 002'}
Push-Location $api
try{
 Write-Host '2/5 Instalando e verificando API...' -ForegroundColor Cyan
 & npm install
 if($LASTEXITCODE -ne 0){throw 'npm install da API falhou'}
 & npm run typecheck
 if($LASTEXITCODE -ne 0){throw 'typecheck API falhou'}
 & npm run build
 if($LASTEXITCODE -ne 0){throw 'build API falhou'}
 Write-Host '3/5 Configurando as QUATRO contas demo locais (redefine suas senhas)...' -ForegroundColor Cyan
 & npm run auth:seed
 if($LASTEXITCODE -ne 0){throw 'auth:seed falhou'}
} finally{Pop-Location}
Push-Location $web
try{
 Write-Host '4/5 Instalando e verificando frontend...' -ForegroundColor Cyan
 & npm install
 if($LASTEXITCODE -ne 0){throw 'npm install frontend falhou'}
 & npm run typecheck
 if($LASTEXITCODE -ne 0){throw 'typecheck frontend falhou'}
 & npm run build
 if($LASTEXITCODE -ne 0){throw 'build frontend falhou'}
} finally{Pop-Location}
Write-Host '5/5 OK. Reinicie API e frontend (Ctrl+C / npm run dev em cada pasta) e execute scripts/testar_4_perfis.ps1.' -ForegroundColor Green
Write-Host 'AVISO: Somente localhost, senhas demonstrativas publicas. Nao exponha na internet.' -ForegroundColor Yellow
