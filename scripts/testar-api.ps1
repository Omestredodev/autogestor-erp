param([string]$ApiUrl = 'http://localhost:3001/api/v1')
$ErrorActionPreference = 'Stop'
Write-Host 'Health check sem autenticação...'
$result = Invoke-RestMethod "$ApiUrl/health"
if($result.status -ne 'ok'){throw 'API não retornou ok'}
Write-Host 'OK: API disponível. Para testar login e operações, execute o roteiro docs/entrega2/VALIDACAO_E_PR.md.'
