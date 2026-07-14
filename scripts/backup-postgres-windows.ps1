<#
.SYNOPSIS
  Noćni backup PostgreSQL iz Supabase Docker kontejnera — Windows Task Scheduler.

.EXAMPLE
  .\scripts\backup-postgres-windows.ps1 -OutDir D:\Backup\spc

.EXAMPLE
  .\scripts\backup-postgres-windows.ps1 -DockerContainer supabase-db -KeepDays 14
#>
[CmdletBinding()]
param(
  [string]$DockerContainer = "supabase-db",
  [string]$DbUser = "postgres",
  [string]$DbName = "postgres",
  [string]$OutDir = "",
  [int]$KeepDays = 30
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$LogsDir = Join-Path $Root "logs"
$LogFile = Join-Path $LogsDir "pg-backup.log"

function Write-BackupLog($Level, $Line) {
  if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
  }
  $stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  Add-Content -Path $LogFile -Value "[$stamp] [$Level] $Line" -Encoding UTF8
}

function Write-AutoRunLog($Status, $Msg) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) { return }
  $cli = Join-Path $Root "scripts\lib\zapisAutoRunCli.mjs"
  if (-not (Test-Path $cli)) { return }
  & $node $cli pg-backup $Status $Msg 2>$null | Out-Null
}

try {
  if (-not $OutDir) {
    $OutDir = $env:SPC_BACKUP_DIR
  }
  if (-not $OutDir) {
    $OutDir = "D:\Backup\spc"
  }

  Write-BackupLog "INFO" "START pg-backup"

  $running = docker ps --format "{{.Names}}" 2>$null | Where-Object { $_ -eq $DockerContainer }
  if (-not $running) {
    throw "Kontejner '$DockerContainer' nije pokrenut."
  }

  if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
  }

  $stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
  $outFile = Join-Path $OutDir "spc_pg_$stamp.sql"

  Write-Host "Backup → $outFile"
  Write-BackupLog "INFO" "Backup → $outFile"

  docker exec $DockerContainer pg_dump -U $DbUser -d $DbName --no-owner --no-acl | Set-Content -Path $outFile -Encoding UTF8

  $gz = Get-Command gzip -ErrorAction SilentlyContinue
  if ($gz) {
    & gzip -f $outFile
    $outFile = "$outFile.gz"
  }

  $sizeMb = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
  $msg = "Backup ($sizeMb MB): $outFile"
  Write-Host "✓ $msg" -ForegroundColor Green
  Write-BackupLog "INFO" $msg
  Write-BackupLog "INFO" "OK pg-backup"
  Write-AutoRunLog ok $msg

  $cutoff = (Get-Date).AddDays(-$KeepDays)
  Get-ChildItem $OutDir -Filter "spc_pg_*" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Obrisano staro: $($_.Name)"
    Write-BackupLog "INFO" "Obrisano staro: $($_.Name)"
  }
}
catch {
  $err = $_.Exception.Message
  Write-BackupLog "ERROR" "FAIL pg-backup: $err"
  Write-AutoRunLog fail $err
  Write-Error $err
}
