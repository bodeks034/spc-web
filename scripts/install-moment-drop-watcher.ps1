# Instalacija moment-drop watchera kao Windows zadatka (Task Scheduler)
# Pokreće se pri logovanju i prati incoming/ + izvoz/ fascikle.
#
# PowerShell (admin nije obavezan):
#   cd C:\mix\spc-web
#   npm run moment-drop:install
#
# Deinstalacija:
#   npm run moment-drop:uninstall

param(
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) {
  Write-Error "Node.js nije u PATH — instalirajte Node 22+"
}

$TaskName = "SPC-MomentDrop-Watcher"
$Script = Join-Path $Root "scripts\watch-moment-drop.mjs"
$Action = New-ScheduledTaskAction -Execute $Node -Argument "`"$Script`" --watch" -WorkingDirectory $Root
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Uklonjen zadatak: $TaskName"
  exit 0
}

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "SPC moment-drop auto uvoz (incoming + izvoz)" -Force | Out-Null
Write-Host "Instaliran zadatak: $TaskName"
Write-Host "  Radni folder: $Root"
Write-Host "  Komanda: node scripts/watch-moment-drop.mjs --watch"
Write-Host ""
Write-Host "Provera: Get-ScheduledTask -TaskName $TaskName"
Write-Host "Ručno pokretanje: Start-ScheduledTask -TaskName $TaskName"
