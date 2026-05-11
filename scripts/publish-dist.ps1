# Envia a pasta dist/ para a VPS (OpenSSH no Windows).
# Uso (PowerShell):
#   $env:DEPLOY_HOST = "user@ip-ou-dominio"
#   $env:DEPLOY_PATH = "/var/www/sa-connect"   # pasta remota (criada se possível)
#   npm run build
#   .\scripts\publish-dist.ps1
#
# Antes do primeiro deploy na VPS: criar .env no servidor (ou build local com .env e só enviar dist).

param(
    [string]$DeployHost = $env:DEPLOY_HOST,
    [string]$RemotePath = $(if ($env:DEPLOY_PATH) { $env:DEPLOY_PATH } else { "/var/www/sa-connect" })
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

if (-not $DeployHost) {
    Write-Host "Defina DEPLOY_HOST (ex.: usuario@203.0.113.10) e opcionalmente DEPLOY_PATH."
    exit 1
}

$dist = Join-Path $root "dist"
if (-not (Test-Path $dist)) {
    Write-Host "Pasta dist nao existe. Execute: npm run build"
    exit 1
}

$scp = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scp) {
    Write-Host "scp nao encontrado. Instale OpenSSH Client (Windows Settings > Apps > Optional features)."
    exit 1
}

Write-Host "A enviar dist/ -> ${DeployHost}:${RemotePath}/"
# scp nao remove ficheiros antigos no destino; apague assets obsoletos na VPS ou use rsync --delete.
scp -r -o StrictHostKeyChecking=accept-new "${dist}\*" "${DeployHost}:${RemotePath}/"
Write-Host "Concluido."
