<#
.SYNOPSIS
  Primena SQL migracija SPC (01–60) na PostgreSQL u Supabase Docker kontejneru — Windows.

.EXAMPLE
  cd C:\mix\spc-web
  .\scripts\pokreni-migracije-windows.ps1 -DryRun

.EXAMPLE
  .\scripts\pokreni-migracije-windows.ps1 -DockerContainer supabase-db

.EXAMPLE
  .\scripts\pokreni-migracije-windows.ps1 -From 54 -To 59
#>
[CmdletBinding()]
param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$DockerContainer = "supabase-db",
  [string]$DbUser = "postgres",
  [string]$DbName = "postgres",
  [int]$From = 1,
  [int]$To = 60,
  [switch]$DryRun,
  [switch]$AutoDetectContainer
)

$ErrorActionPreference = "Stop"

# Redosled kao docs/MIGRACIJE.md + numerički fajlovi u korenu (isti broj → po imenu)
$allSql = Get-ChildItem -Path $ProjectRoot -Filter "*.sql" -File |
  Where-Object { $_.Name -match '^\d+_' } |
  Sort-Object { [int]($_.Name -split '_')[0] }, Name

$files = $allSql | Where-Object {
  $n = [int]($_.Name -split '_')[0]
  $n -ge $From -and $n -le $To
}

if (-not $files) {
  Write-Error "Nema SQL fajlova za opseg $From–$To u $ProjectRoot"
}

if ($AutoDetectContainer) {
  $found = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -match 'db' } | Select-Object -First 1
  if ($found) {
    $DockerContainer = $found
    Write-Host "Auto-detect kontejner: $DockerContainer"
  }
}

if (-not $DryRun) {
  $running = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -eq $DockerContainer }
  if (-not $running) {
    Write-Host "Kontejner '$DockerContainer' nije pokrenut. Dostupni:" -ForegroundColor Yellow
    docker ps --format "  {{.Names}}"
    Write-Host ""
    Write-Host "Probaj: .\scripts\pokreni-migracije-windows.ps1 -AutoDetectContainer"
    exit 1
  }
}

Write-Host "══ SPC SQL migracije ($From–$To) ══" -ForegroundColor Cyan
Write-Host "Projekat: $ProjectRoot"
Write-Host "Kontejner: $DockerContainer"
Write-Host ""

foreach ($f in $files) {
  Write-Host "  • $($f.Name)"
}

if ($DryRun) {
  Write-Host ""
  Write-Host "Dry-run završen ($($files.Count) fajlova)." -ForegroundColor Green
  exit 0
}

Write-Host ""
$ok = 0
$fail = 0

foreach ($f in $files) {
  Write-Host "── $($f.Name) ──" -ForegroundColor DarkCyan
  try {
    # -Raw + UTF8; pipe u docker exec psql
    $sql = Get-Content -Path $f.FullName -Raw -Encoding UTF8
    $sql | docker exec -i $DockerContainer psql -v ON_ERROR_STOP=1 -U $DbUser -d $DbName 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "psql exit $LASTEXITCODE" }
    Write-Host "✓ $($f.Name)" -ForegroundColor Green
    $ok++
  }
  catch {
    Write-Host "✗ $($f.Name): $_" -ForegroundColor Red
    $fail++
    Write-Host "Zaustavljeno. Popravi grešku pa pokreni ponovo sa -From <broj>." -ForegroundColor Yellow
    exit 1
  }
}

Write-Host ""
Write-Host "✓ Završeno: $ok fajlova" -ForegroundColor Green
Write-Host "Sledeće: npm run db:verify  (sa DATABASE_URL ili Admin → Status šeme)"
