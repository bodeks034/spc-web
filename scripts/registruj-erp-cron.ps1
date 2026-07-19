# Registruje Windows Task Scheduler zadatak za dnevni ERP uvoz (05:30).
# Pokreni kao Administrator ako zadatak ne postoji:
#   powershell -ExecutionPolicy Bypass -File scripts\registruj-erp-cron.ps1

param(
  [string]$Vreme = "05:30",
  [string]$ImeZadatka = "SPC-ERP-DnevniUvoz"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ps1 = Join-Path $root "scripts\erp-dnevni-uvoz.ps1"

if (-not (Test-Path $ps1)) {
  Write-Error "Nije pronađen: $ps1"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ps1`"" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -Daily -At $Vreme
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# S4U: radi u pozadini bez konzolnog (cmd) prozora.
$principal = New-ScheduledTaskPrincipal `
  -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType S4U `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $ImeZadatka `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "SPC Web — automatski uvoz radnih naloga iz ERP CSV (erp-drop/incoming)" `
  -Force | Out-Null

Write-Host "✓ Zadatak '$ImeZadatka' registrovan — svaki dan u $Vreme"
Write-Host "  Skripta: $ps1"
Write-Host "  ERP folder: $root\erp-drop\incoming"
Write-Host ""
Write-Host "Test odmah:"
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\erp-dnevni-uvoz.ps1"
Write-Host ""
Write-Host "Pre pokretanja:"
Write-Host "  1. Kopiraj .env.example u .env.erp i postavi SUPABASE_URL + SERVICE_ROLE_KEY"
Write-Host "  2. Podesi ERP da izvozi CSV u erp-drop\incoming"
Write-Host "  3. Pokreni SQL: 38_erp_uvoz_log.sql i 39_erp_uvoz_grants.sql"
