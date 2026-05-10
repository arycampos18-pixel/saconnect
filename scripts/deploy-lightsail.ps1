# UTF-8 BOM: Windows PowerShell 5.x
<#
.SYNOPSIS
  Deploy SA Connect na VPS Lightsail (Ubuntu) via SSH.

.EXAMPLE
  .\scripts\deploy-lightsail.ps1 -SkipPortCheck
  Pula o teste local da porta 22 (use se tiver certeza que o servidor aceita SSH).
#>
param(
  [string]$KeyPath = "C:\Sistema\Samuel\LightsailDefaultKey-ca-central-1.pem",
  [string]$ServerHost = "3.96.187.148",
  [string]$SshUser = "ubuntu",
  [switch]$UploadEnv,
  [switch]$InitLocalEnv,
  [switch]$SkipPortCheck
)

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -lt 6) {
  try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  } catch { }
}

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BootstrapLocal = Join-Path $PSScriptRoot "remote-bootstrap.sh"

function Test-TcpPortOpenIpv4 {
  param([string]$HostName, [int]$Port, [int]$TimeoutMs = 15000)
  try {
    $parsed = $null
    if (-not [IPAddress]::TryParse($HostName, [ref]$parsed)) {
      $entry = [System.Net.Dns]::GetHostEntry($HostName)
      $parsed = $entry.AddressList | Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork } | Select-Object -First 1
      if ($null -eq $parsed) { return $false }
    } elseif ($parsed.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
      return $false
    }
    $endpoint = New-Object System.Net.IPEndPoint @($parsed, $Port)
    $sock = New-Object System.Net.Sockets.Socket @(
      [System.Net.Sockets.AddressFamily]::InterNetwork,
      [System.Net.Sockets.SocketType]::Stream,
      [System.Net.Sockets.ProtocolType]::Tcp
    )
    $iar = $sock.BeginConnect($endpoint, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      $sock.Close()
      return $false
    }
    $sock.EndConnect($iar)
    $sock.Close()
    return $true
  } catch {
    return $false
  }
}

function Get-PublicIpv4OrNull {
  try {
    return (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 8 -UseBasicParsing).Trim()
  } catch {
    return $null
  }
}

if ($InitLocalEnv) {
  $ex = Join-Path $ProjectRoot ".env.example"
  $envf = Join-Path $ProjectRoot ".env"
  if (-not (Test-Path -LiteralPath $ex)) {
    Write-Error "Nao encontrado: $ex"
  }
  if (Test-Path -LiteralPath $envf) {
    Write-Host "Ja existe .env em $envf (nao sobrescrevi)." -ForegroundColor Yellow
  } else {
    Copy-Item -LiteralPath $ex -Destination $envf
    Write-Host "Criado $envf a partir de .env.example. Preencha VITE_SUPABASE_* e rode:" -ForegroundColor Green
    Write-Host "  .\scripts\deploy-lightsail.ps1 -UploadEnv" -ForegroundColor Green
  }
  exit 0
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  Write-Error "Chave SSH nao encontrada: $KeyPath"
}
if (-not (Test-Path -LiteralPath $BootstrapLocal)) {
  Write-Error "Arquivo nao encontrado: $BootstrapLocal"
}

try {
  & icacls.exe $KeyPath /inheritance:r 2>$null | Out-Null
  & icacls.exe $KeyPath /grant:r "$($env:USERNAME):(R)" 2>$null | Out-Null
} catch {
  Write-Host "Aviso: icacls na chave falhou; se SSH reclamar de permissao, rode:" -ForegroundColor Yellow
  Write-Host "  icacls `"$KeyPath`" /inheritance:r ; icacls `"$KeyPath`" /grant:r `"$($env:USERNAME):(R)`"" -ForegroundColor Yellow
}

$SshTarget = "${SshUser}@${ServerHost}"
$KeyArgs = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=30")
$EnsureRepo = 'sudo mkdir -p /var/www && sudo chown -R $USER:$USER /var/www 2>/dev/null || true; cd /var/www && ([ -d saconnect/.git ] || git clone https://github.com/arycampos18-pixel/saconnect.git saconnect)'

if (-not $SkipPortCheck) {
  Write-Host "Testando TCP (IPv4) portas 22 e 80 em $ServerHost ..." -ForegroundColor Cyan
  $ok22 = Test-TcpPortOpenIpv4 -HostName $ServerHost -Port 22
  $ok80 = Test-TcpPortOpenIpv4 -HostName $ServerHost -Port 80
  if (-not $ok22) {
    Write-Host ""
    Write-Host "Porta 22 (SSH) nao respondeu da sua rede ate $ServerHost." -ForegroundColor Red
    if ($ok80) {
      Write-Host "Obs: porta 80 respondeu. Ou seja, o IP esta vivo; falta liberar SSH (22) no firewall da nuvem OU o sshd nao escuta." -ForegroundColor Yellow
    } else {
      Write-Host "Portas 22 e 80 falharam: confira se o IP e o da instancia, se esta Running e se o firewall da AWS libera pelo menos uma delas." -ForegroundColor Yellow
    }
    $myip = Get-PublicIpv4OrNull
    if ($myip) {
      Write-Host "Seu IP publico agora (para regra Restricted no Lightsail): $myip/32" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "Lightsail: Instancia -> Networking -> IPv4 firewall -> Add rule" -ForegroundColor Yellow
    Write-Host "  Custom / TCP / 22 / Anywhere 0.0.0.0/0  (teste) ou Restricted $myip/32" -ForegroundColor Yellow
    Write-Host "Lightsail: abaixo, use 'Connect using SSH' no navegador. Se conectar la mas nao no seu PC," -ForegroundColor Yellow
    Write-Host "  a rede da sua casa/empresa pode bloquear SAIDA na porta 22: teste 4G/hotspot do celular." -ForegroundColor Yellow
    Write-Host "Se a VM for EC2 (nao Lightsail): Security Group da instancia -> Inbound -> SSH 22 da sua rede." -ForegroundColor Yellow
    Write-Host "Se tiver certeza que 22 esta aberto e o teste do Windows falhou em falso, rode com: -SkipPortCheck" -ForegroundColor Yellow
    Write-Host ""
    exit 1
  }
}

if ($UploadEnv) {
  $localEnv = Join-Path $ProjectRoot ".env"
  if (-not (Test-Path -LiteralPath $localEnv)) {
    Write-Error "Nao existe .env em $ProjectRoot. Rode: .\scripts\deploy-lightsail.ps1 -InitLocalEnv  (edite o .env)  ou copie manualmente de .env.example."
  }
  Write-Host "Garantindo repositorio no servidor e enviando .env..." -ForegroundColor Cyan
  & ssh @KeyArgs $SshTarget $EnsureRepo
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & scp @KeyArgs $localEnv "${SshUser}@${ServerHost}:/var/www/saconnect/.env"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Executando bootstrap no servidor ($SshTarget)..." -ForegroundColor Cyan
$utf8 = [System.Text.UTF8Encoding]::new($false)
$bootstrapText = [System.IO.File]::ReadAllText($BootstrapLocal, $utf8)
$bootstrapText | & ssh @KeyArgs $SshTarget "bash -s"
if ($LASTEXITCODE -ne 0) {
  if ($LASTEXITCODE -eq 2) {
    Write-Host "Codigo 2: configure o .env no servidor (Supabase) ou use -UploadEnv e rode de novo." -ForegroundColor Yellow
  }
  exit $LASTEXITCODE
}

Write-Host "Pronto." -ForegroundColor Green
