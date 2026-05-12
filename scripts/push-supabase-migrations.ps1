# UTF-8 BOM: Windows PowerShell 5.x
# Aplica supabase/migrations/* ao projecto remoto (nuvem).
#
# --- Metodo A (recomendado se "supabase login" falhar ou nao quiser usar token) ---
# 1) Dashboard Supabase -> Settings -> Database -> URI (Session pooler se estiver em IPv4-only)
# 2) Copie .env.supabase.example para .env.supabase.local e preencha DATABASE_URL=...
#    OU na mesma janela PowerShell:
#      $env:DATABASE_URL = "postgresql://postgres.PROJECTREF:PASSWORD@HOST:PORT/postgres"
# 3) npm run supabase:migrate:remote
#
# --- Metodo B (CLI com login) ---
#   npm run supabase:login
#   Opcional: $env:SUPABASE_DB_PASSWORD = "senha da base"
#   npm run supabase:migrate:remote
#
$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $ProjectRoot ".env"
$localDb = Join-Path $ProjectRoot ".env.supabase.local"

function Read-DatabaseUrlFromFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $url = $null
  foreach ($raw in Get-Content -LiteralPath $Path) {
    $line = $raw.Trim()
    if ($line -match '^#' -or [string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -match '^(?:DATABASE_URL|SUPABASE_DB_URL)=(.+)$') {
      $url = $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $url
}

function Get-DatabaseUrl {
  $u = $env:DATABASE_URL
  if ([string]::IsNullOrWhiteSpace($u)) { $u = $env:SUPABASE_DB_URL }
  if ([string]::IsNullOrWhiteSpace($u)) { $u = Read-DatabaseUrlFromFile -Path $localDb }
  return $u
}

$dbUrl = Get-DatabaseUrl

Push-Location $ProjectRoot
try {
  if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host ""
    Write-Host "DATABASE_URL nao encontrada (env nem ficheiro .env.supabase.local)." -ForegroundColor Yellow
    Write-Host "  Copie o modelo:  Copy-Item .env.supabase.example .env.supabase.local" -ForegroundColor Yellow
    Write-Host "  Edite .env.supabase.local e cole a URI do painel (Session pooler se IPv4-only)." -ForegroundColor Yellow
    Write-Host "  Depois: npm run supabase:migrate:remote" -ForegroundColor Yellow
    Write-Host "Alternativa: npm run supabase:login  (token) e volte a correr sem DATABASE_URL." -ForegroundColor DarkGray
    Write-Host ""
  }

  if (-not [string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host ">>> db push via DATABASE_URL (sem supabase login)" -ForegroundColor Cyan
    Write-Host "    Origem: variavel de ambiente ou .env.supabase.local" -ForegroundColor DarkGray
    & npx --yes supabase@latest db push --db-url $dbUrl --yes
    if ($LASTEXITCODE -ne 0) {
      Write-Host ""
      Write-Host "Se falhou por caracteres na password: codifique na URI ou use Session pooler do painel." -ForegroundColor Yellow
      Write-Host "Veja .env.supabase.example" -ForegroundColor Yellow
      exit $LASTEXITCODE
    }
    Write-Host "Pronto. Migracoes aplicadas no Postgres remoto." -ForegroundColor Green
    exit 0
  }

  if (-not (Test-Path -LiteralPath $envFile)) {
    Write-Error "Sem DATABASE_URL: crie .env.supabase.local (veja .env.supabase.example) OU defina .env com VITE_SUPABASE_PROJECT_ID para o metodo login."
  }

  $ref = $null
  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^VITE_SUPABASE_PROJECT_ID=(.+)$' -and $line -notmatch '^#') {
      $ref = $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  if ([string]::IsNullOrWhiteSpace($ref) -or $ref -eq "xxxx") {
    Write-Error "Defina VITE_SUPABASE_PROJECT_ID no .env, OU DATABASE_URL em .env.supabase.local (veja .env.supabase.example)."
  }

  Write-Host ">>> Link ao projecto: $ref" -ForegroundColor Cyan
  if ($env:SUPABASE_DB_PASSWORD) {
    & npx --yes supabase@latest link --project-ref $ref -p $env:SUPABASE_DB_PASSWORD --yes
  } else {
    & npx --yes supabase@latest link --project-ref $ref --yes
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Sem token? Corra:  npm run supabase:login" -ForegroundColor Yellow
    Write-Host "OU evite login: copie .env.supabase.example -> .env.supabase.local e preencha DATABASE_URL (Session pooler)." -ForegroundColor Yellow
    exit $LASTEXITCODE
  }

  Write-Host ">>> db push (migracoes em supabase/migrations)" -ForegroundColor Cyan
  & npx --yes supabase@latest db push --yes
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Pronto. Tabelas/schema aplicados no projecto remoto." -ForegroundColor Green
} finally {
  Pop-Location
}
