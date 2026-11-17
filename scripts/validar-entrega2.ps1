$ErrorActionPreference = 'Stop'
Write-Host 'Validando arquivos da Entrega 2...'
$root = Split-Path $PSScriptRoot -Parent
foreach($name in @('apps/api/package.json','apps/api/src/main.ts','apps/web/package.json','apps/web/src/App.tsx','README_ENTREGA_2.md')) {
  if(-not (Test-Path (Join-Path $root $name))) { throw "Ausente: $name" }
}
foreach($part in @('api','web')) {
  Push-Location (Join-Path $root "apps/$part")
  try { npm install; if($LASTEXITCODE -ne 0){throw "npm install falhou em $part"}
        npm run build; if($LASTEXITCODE -ne 0){throw "build falhou em $part"}
        npm run typecheck; if($LASTEXITCODE -ne 0){throw "typecheck falhou em $part"} }
  finally { Pop-Location }
}
Write-Host 'Builds concluídos. Ainda é necessário testar com PostgreSQL e as telas em execução.'
