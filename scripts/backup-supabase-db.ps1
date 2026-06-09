# Backup Supabase cloud baze (schema + data) u backup/supabase/
# Preduslov: supabase login + supabase link --project-ref wzxkcomeurogvfisticq

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$datum = Get-Date -Format "yyyy-MM-dd_HHmm"
$dir = Join-Path $root "backup\supabase"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$full = Join-Path $dir "spc_full_$datum.sql"
$schema = Join-Path $dir "spc_schema_$datum.sql"
$data = Join-Path $dir "spc_data_$datum.sql"

Write-Host "Dump pun baze -> $full"
supabase db dump --linked -f $full

Write-Host "Dump samo schema -> $schema"
supabase db dump --linked --schema-only -f $schema

Write-Host "Dump samo podaci -> $data"
supabase db dump --linked --data-only -f $data

Write-Host ""
Write-Host "Gotovo. Fajlovi u: $dir"
Write-Host "Storage (crtezi, Excel): postavi SUPABASE_SERVICE_ROLE_KEY pa pokreni:"
Write-Host "  node scripts/download-supabase-storage.mjs"
