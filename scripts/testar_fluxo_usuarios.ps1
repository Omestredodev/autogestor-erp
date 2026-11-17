# Teste destrutivo APENAS para a conta fictícia criada por este script. Não usar em produção.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3001/api/v1'
function Json($obj){ return ($obj | ConvertTo-Json -Depth 10 -Compress) }
function Call($path,$method,$body,$token){
  $h = @{};if($token){$h.Authorization="Bearer $token"}
  $reqParams = @{Uri="$base$path";Method=$method;Headers=$h;ErrorAction='Stop'}
  if($null -ne $body){$reqParams.ContentType='application/json';$reqParams.Body=(Json $body)}
  return Invoke-RestMethod @reqParams
}
function Reject($code,[scriptblock]$operation){
  $failed=$false
  try{ & $operation | Out-Null }catch{
   $status=0; if($_.Exception.Response){$status=[int]$_.Exception.Response.StatusCode}
   if($status -eq $code){$failed=$true}else{throw "Esperava HTTP $code, mas recebi $status : $($_.Exception.Message)"}
  }
  if(!$failed){throw "Era esperado erro HTTP $code, porém a operação foi aceita"}
}
function RandomPass(){
  $rng=[System.Security.Cryptography.RandomNumberGenerator]::Create();$bytes=New-Object byte[] 24;$rng.GetBytes($bytes);$rng.Dispose()
  return [Convert]::ToBase64String($bytes).Replace('+','A').Replace('/','B').TrimEnd('=')
}
$adminEmail = Read-Host 'E-mail do administrador'
$sec = Read-Host 'Senha do administrador' -AsSecureString
$bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
try{$adminPass=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)}
$admin = Call '/auth/login' 'POST' @{email=$adminEmail;password=$adminPass} $null
$adminPass=$null
$me=Call '/auth/me' 'GET' $null $admin.accessToken
if($me.profile -ne 'ADMIN'){throw 'O usuário informado não é administrador'}
if($me.mustChangePassword){throw 'Troque a senha temporária do administrador pela interface antes de executar o teste'}
Write-Host '1/10 Administrador autenticado' -ForegroundColor Green
$email = "teste.fluxo.$(([guid]::NewGuid()).ToString('N').Substring(0,12))@example.invalid"
$p1=RandomPass; $p2=RandomPass; $p3=RandomPass
Call '/auth/register' 'POST' @{name='Conta Teste Integracao';email=$email;password=$p1;confirmPassword=$p1} $null | Out-Null
Write-Host '2/10 Cadastro solicitado'
Reject 401 { Call '/auth/login' 'POST' @{email=$email;password=$p1} $null }
Write-Host '3/10 Login pendente bloqueado'
$all=Call '/users' 'GET' $null $admin.accessToken
$target=$all | Where-Object {$_.email -eq $email} | Select-Object -First 1
if(!$target -or $target.approval_status -ne 'PENDING'){throw 'Conta pendente não encontrada na Administração'}
$profiles=Call '/profiles' 'GET' $null $admin.accessToken
$selectedProfile=$profiles | Where-Object {$_.name -eq 'STOCK'} | Select-Object -First 1
if(!$selectedProfile){throw 'Perfil STOCK não encontrado'}
Call "/users/$($target.id)/approve" 'POST' @{profile_id=[int]$selectedProfile.id} $admin.accessToken | Out-Null
$person=Call '/auth/login' 'POST' @{email=$email;password=$p1} $null
$approved=Call '/auth/me' 'GET' $null $person.accessToken
if(!$approved -or $approved.profile -ne 'STOCK'){throw 'Aprovação não atribuiu o perfil STOCK escolhido pelo administrador'}
Write-Host '4/10 Aprovação e login individual funcionando'
Call '/auth/change-password' 'POST' @{oldPassword=$p1;newPassword=$p2;confirmPassword=$p2} $person.accessToken | Out-Null
Reject 401 { Call '/auth/me' 'GET' $null $person.accessToken }
$person=Call '/auth/login' 'POST' @{email=$email;password=$p2} $null
Write-Host '5/10 Troca de senha e revogação de sessão funcionando'
$reset=Call "/users/$($target.id)/reset-password" 'POST' @{} $admin.accessToken
$person=Call '/auth/login' 'POST' @{email=$email;password=$reset.temporaryPassword} $null
Reject 403 { Call '/products' 'GET' $null $person.accessToken }
Call '/auth/change-password' 'POST' @{oldPassword=$reset.temporaryPassword;newPassword=$p3;confirmPassword=$p3} $person.accessToken | Out-Null
$person=Call '/auth/login' 'POST' @{email=$email;password=$p3} $null
Write-Host '6/10 Reset administrativo e troca obrigatória funcionando'
Call "/users/$($target.id)/deactivate" 'POST' @{} $admin.accessToken | Out-Null
Reject 401 { Call '/auth/login' 'POST' @{email=$email;password=$p3} $null }
Write-Host '7/10 Desativação bloqueia login'
Call "/users/$($target.id)/reactivate" 'POST' @{} $admin.accessToken | Out-Null
$person=Call '/auth/login' 'POST' @{email=$email;password=$p3} $null
Write-Host '8/10 Reativação funciona'
Reject 403 { Call '/users' 'GET' $null $person.accessToken }
Call "/users/$($target.id)" 'DELETE' $null $admin.accessToken | Out-Null
Reject 401 { Call '/auth/login' 'POST' @{email=$email;password=$p3} $null }
$all=Call '/users' 'GET' $null $admin.accessToken
$after=$all | Where-Object {$_.email -eq $email} | Select-Object -First 1
if(!$after.deleted_at){throw 'Exclusão lógica não registrada'}
Write-Host '9/10 Exclusão lógica e histórico funcionando'
Reject 401 { Call '/auth/me' 'GET' $null $person.accessToken }
Write-Host '10/10 Sessão de usuário excluído revogada'
Write-Host 'TESTE INTEGRADO DE CONTAS APROVADO' -ForegroundColor Green
Write-Host "Conta de teste mantida como excluída (auditável): $email"
