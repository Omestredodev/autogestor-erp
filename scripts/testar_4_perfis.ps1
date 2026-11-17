# Verifica as quatro contas de demonstração após npm run auth:seed.
# Uso EXCLUSIVO LOCAL. Não mostra senhas nem tokens em logs.
$ErrorActionPreference='Stop'
$base='http://127.0.0.1:3001/api/v1'
$accounts=@(
 @{email='admin@demo.invalid';password='Admin@PecaAqui#2026!';role='ADMIN'},
 @{email='vendedor@demo.invalid';password='Vendas@PecaAqui#2026!';role='SELLER'},
 @{email='estoque@demo.invalid';password='Estoque@PecaAqui#2026!';role='STOCK'},
 @{email='financeiro@demo.invalid';password='Financeiro@PecaAqui#2026!';role='FINANCE'}
)
$health=Invoke-RestMethod "$base/health"
if($health.status -ne 'ok'){throw 'Health falhou.'}
foreach($u in $accounts){
 $body=@{email=$u.email;password=$u.password}|ConvertTo-Json
 $login=Invoke-RestMethod "$base/auth/login" -Method POST -ContentType 'application/json' -Body $body
 if(!$login.accessToken){throw "Sem JWT: $($u.email)"}
 $headers=@{Authorization="Bearer $($login.accessToken)"}
 $me=Invoke-RestMethod "$base/auth/me" -Headers $headers
 if($me.profile -ne $u.role){throw "Perfil inesperado para $($u.email): $($me.profile)"}
 if($me.mustChangePassword){throw "Conta demo exige troca obrigatória inesperada: $($u.email)"}
 Write-Host "OK: $($u.email) => $($me.profile)" -ForegroundColor Green
}
# Conta com senha errada nunca deve autenticar.
$unauthorized=$false
try{
 Invoke-RestMethod "$base/auth/login" -Method POST -ContentType 'application/json' -Body (@{email='admin@demo.invalid';password='SenhaIncorreta#2026'}|ConvertTo-Json) | Out-Null
}catch{
 $status=0;if($_.Exception.Response){$status=[int]$_.Exception.Response.StatusCode}
 if($status -eq 401){$unauthorized=$true}else{throw "Senha errada: HTTP $status, esperado 401"}
}
if(!$unauthorized){throw 'Senha incorreta foi aceita indevidamente'}
Write-Host 'OK: senha incorreta bloqueada com HTTP 401' -ForegroundColor Green
Write-Host 'SUCESSO: QUATRO PERFIS AUTENTICAM COM SENHAS DISTINTAS.' -ForegroundColor Green
