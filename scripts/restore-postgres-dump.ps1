<#
.SYNOPSIS
  Restore PostgreSQL dump u lokalni Supabase Docker kontejner.

.EXAMPLE
  .\scripts\restore-postgres-dump.ps1 -DumpFile D:\Backup\spc\spc_2026-07-16.sql

.EXAMPLE
  .\scripts\restore-postgres-dump.ps1 -DumpFile .\backups\latest.dump -Format custom
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$DumpFile,
  [string]$DockerContainer = "supabase-db",
  [string]$DbUser = "postgres",
  [string]$DbName = "postgres",
  [ValidateSet("plain", "custom")]
  [string]$Format = "plain"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $DumpFile)) {
  throw "Dump fajl ne postoji: $DumpFile"
}

Write-Host "Restore u kontejner $DockerContainer ($DbName) iz $DumpFile ..."

if ($Format -eq "custom") {
  Get-Content -Path $DumpFile -AsByteStream | docker exec -i $DockerContainer pg_restore -U $DbUser -d $DbName --clean --if-exists
} else {
  Get-Content -Path $DumpFile -Raw -Encoding UTF8 | docker exec -i $DockerContainer psql -U $DbUser -d $DbName
}

if ($LASTEXITCODE -ne 0) {
  throw "Restore nije uspeo (exit $LASTEXITCODE)."
}

Write-Host "✓ Restore završen. Proveri Admin → Status šeme i probni unos."
