<#
.SYNOPSIS
  Gera um manifesto (árvore + contagens) para outra IA recriar o sistema a partir de zero.

.USAGE
  cd "<raiz-do-repo>"
  powershell -ExecutionPolicy Bypass -File .\scripts\export-replica-context.ps1

  Opcional: -OutDir ".\export-replica"
#>
param(
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $RepoRoot.Path "replica-export"
}

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$manifestPath = Join-Path $OutDir "replica-context-manifest.txt"
$treePath = Join-Path $OutDir "repo-tree.txt"

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

# --- Árvore (ignorar node_modules, dist, .git)
$excludeDirs = @("node_modules", "dist", ".git", "replica-export")
$sbTree = [System.Text.StringBuilder]::new()
$rootPath = $RepoRoot.Path
function Walk-Tree([string]$Dir, [string]$Prefix) {
  $rel = $Dir.Substring($rootPath.Length).TrimStart("\", "/")
  if ($rel -eq "") { $rel = "." }
  [void]$sbTree.AppendLine("$Prefix$([IO.Path]::GetFileName($Dir))/")
  try {
    $items = Get-ChildItem -LiteralPath $Dir -Force -ErrorAction SilentlyContinue |
      Where-Object {
        if ($_.PSIsContainer) {
          return $excludeDirs -notcontains $_.Name
        }
        return $true
      } | Sort-Object { -not $_.PSIsContainer }, Name
  } catch { return }
  $dirs = $items | Where-Object PSIsContainer
  $files = $items | Where-Object { -not $_.PSIsContainer }
  foreach ($d in $dirs) {
    Walk-Tree $d.FullName ($Prefix + "  ")
  }
  foreach ($f in $files) {
    [void]$sbTree.AppendLine("$Prefix  $($f.Name)")
  }
}
Walk-Tree $RepoRoot.Path ""
Write-Utf8NoBom $treePath $sbTree.ToString()

# --- Contagens e listas
$migrations = Get-ChildItem -Path (Join-Path $RepoRoot "supabase\migrations") -Filter "*.sql" -ErrorAction SilentlyContinue
$functions = Get-ChildItem -Path (Join-Path $RepoRoot "supabase\functions") -Directory -ErrorAction SilentlyContinue
$srcTs = Get-ChildItem -Path (Join-Path $RepoRoot "src") -Recurse -Include "*.ts","*.tsx" -File -ErrorAction SilentlyContinue

$pkg = Get-Content (Join-Path $RepoRoot "package.json") -Raw | ConvertFrom-Json

$lines = @()
$lines += "=== REPLICA CONTEXT MANIFEST ==="
$lines += "Gerado: $(Get-Date -Format o)"
$lines += "Repo root: $RepoRoot"
$lines += ""
$lines += "=== package.json ==="
$lines += "name: $($pkg.name)"
$lines += "dependencies (chave): $($pkg.dependencies.PSObject.Properties.Name -join ', ')"
$lines += "devDependencies (chave): $($pkg.devDependencies.PSObject.Properties.Name -join ', ')"
$lines += ""
$lines += "=== Contagens ==="
$lines += "Migrations SQL: $($migrations.Count)"
$lines += "Edge function folders: $($functions.Count)"
$lines += "Ficheiros src *.ts/*.tsx: $($srcTs.Count)"
$lines += ""
$lines += "=== Migrações (ordenar por nome) ==="
foreach ($m in ($migrations | Sort-Object Name)) {
  $lines += $m.Name
}
$lines += ""
$lines += "=== Edge functions ==="
foreach ($f in ($functions | Sort-Object Name)) {
  $lines += $f.Name
}
$lines += ""
$lines += "=== Próximo passo ==="
$lines += "1) Anexar este ficheiro + scripts/PROMPT_REPLICA_ZERO.md a outra IA."
$lines += "2) Opcional: zipar o repo sem node_modules e anexar."
$lines += "3) Ver também: $treePath"

Write-Utf8NoBom $manifestPath ($lines -join "`r`n")

Write-Host "OK: $manifestPath"
Write-Host "OK: $treePath"
