# Instalacija automatizacije - ERP, digest, podsetnici, health, backup, moment-drop, nedeljni rollup
#
# PowerShell (preporuceno kao Administrator za sve taskove):
#   cd C:\mix\spc-web
#   npm run auto:install
#   npm run auto:install:admin    # automatski UAC prompt
#
# Deinstalacija:
#   npm run auto:uninstall

param(
  [switch]$Uninstall,
  [switch]$Elevate,
  [switch]$NoElevate
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) {
  Write-Error "Node.js nije u PATH - instalirajte Node 22+"
}

function Test-Administrator {
  $current = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
  return $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

$IsAdmin = Test-Administrator

if ($Elevate -and -not $Uninstall -and -not $IsAdmin -and -not $NoElevate) {
  Write-Host "Pokrecem installer sa administratorskim pravima (UAC)..."
  $argList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -NoElevate"
  if ($Uninstall) { $argList += " -Uninstall" }
  Start-Process powershell.exe -Verb RunAs -ArgumentList $argList -Wait
  exit $LASTEXITCODE
}

function Get-SpcPrincipal {
  param([string]$Schedule)
  $who = "$env:USERDOMAIN\$env:USERNAME"
  $wantHighest = $IsAdmin -and ($Schedule -in @("daily02", "atlogon"))
  $runLevel = if ($wantHighest) { "Highest" } else { "Limited" }
  return New-ScheduledTaskPrincipal -UserId $who -LogonType Interactive -RunLevel $runLevel
}

function Register-SpcTask {
  param(
    [string]$Name,
    [string]$ScriptRel,
    [string]$ExtraArgs = "",
    [string]$Schedule,
    [string]$Description,
    [string]$TaskType = "node"
  )

  if ($TaskType -eq "powershell") {
    $Script = Join-Path $Root $ScriptRel
    $argLine = "-NoProfile -ExecutionPolicy Bypass -File `"$Script`" $ExtraArgs"
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argLine -WorkingDirectory $Root
  } else {
    $Script = Join-Path $Root $ScriptRel
    if ($ExtraArgs) {
      $argLine = "`"$Script`" $ExtraArgs"
    } else {
      $argLine = "`"$Script`""
    }
    $Action = New-ScheduledTaskAction -Execute $Node -Argument $argLine -WorkingDirectory $Root
  }

  $Trigger = switch ($Schedule) {
    "daily02" { New-ScheduledTaskTrigger -Daily -At "02:00" }
    "daily06" { New-ScheduledTaskTrigger -Daily -At "06:00" }
    "daily0615" { New-ScheduledTaskTrigger -Daily -At "06:15" }
    "daily0630" { New-ScheduledTaskTrigger -Daily -At "06:30" }
    "daily08" { New-ScheduledTaskTrigger -Daily -At "08:00" }
    "shift14" { New-ScheduledTaskTrigger -Daily -At "14:05" }
    "shift22" { New-ScheduledTaskTrigger -Daily -At "22:05" }
    "weeklyFri15" {
      New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At "15:00"
    }
    "weeklySun03" {
      New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "03:00"
    }
    "atlogon" { New-ScheduledTaskTrigger -AtLogOn }
    default { New-ScheduledTaskTrigger -Daily -At "06:30" }
  }

  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5)
  $Principal = Get-SpcPrincipal -Schedule $Schedule

  if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Uklonjen: $Name"
    return @{ Name = $Name; Ok = $true }
  }

  Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue

  try {
    Register-ScheduledTask -TaskName $Name -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description $Description -Force | Out-Null
    Write-Host "Instaliran: $Name"
    if ($TaskType -eq "powershell") {
      Write-Host "  powershell $ScriptRel $ExtraArgs"
    } else {
      Write-Host "  node $ScriptRel $ExtraArgs"
    }
    return @{ Name = $Name; Ok = $true }
  } catch {
    Write-Warning "Nije uspelo: $Name - $($_.Exception.Message)"
    if (-not $IsAdmin) {
      Write-Host "  -> Pokreni: npm run auto:install:admin  (ili PowerShell kao Administrator)"
    }
    return @{ Name = $Name; Ok = $false; Error = $_.Exception.Message }
  }
}

if (-not $IsAdmin -and -not $Uninstall) {
  Write-Warning @"

Niste Administrator - neki taskovi (narocito SPC-MomentDrop-Watcher, SPC-Postgres-Backup) mogu da padnu sa Access is denied.
Za punu instalaciju: npm run auto:install:admin
Ili: desni klik PowerShell -> Run as administrator -> npm run auto:install

"@
}

$tasks = @(
  @{ Name = "SPC-ERP-Dnevni-Uvoz"; Script = "scripts\erp-dnevni-uvoz.mjs"; Extra = ""; Schedule = "daily06"; Desc = "ERP CSV dnevni uvoz"; Type = "node" },
  @{ Name = "SPC-ERP-Quality-Izvoz"; Script = "scripts\erp-izvoz-kvalitet.mjs"; Extra = ""; Schedule = "daily0615"; Desc = "Dnevni izvoz kvaliteta u ERP outgoing"; Type = "node" },
  @{ Name = "SPC-ERP-Processed-Cleanup"; Script = "scripts\erp-processed-cleanup.mjs"; Extra = "--apply --remove-empty-dirs"; Schedule = "weeklySun03"; Desc = "ERP processed retention 90 dana"; Type = "node" },
  @{ Name = "SPC-Smenski-Digest-S1"; Script = "scripts\smenski-digest.mjs"; Extra = "--pdf"; Schedule = "shift14"; Desc = "Email digest smena 1 (14h)"; Type = "node" },
  @{ Name = "SPC-Smenski-Digest-S2"; Script = "scripts\smenski-digest.mjs"; Extra = "--smena 2 --pdf"; Schedule = "shift22"; Desc = "Email digest smena 2 (22h)"; Type = "node" },
  @{ Name = "SPC-Auto-Podsetnici"; Script = "scripts\auto-podsetnici.mjs"; Extra = ""; Schedule = "daily08"; Desc = "Proaktivni podsetnici (oba modula)"; Type = "node" },
  @{ Name = "SPC-Auto-Health"; Script = "scripts\auto-health-check.mjs"; Extra = "--email"; Schedule = "daily0630"; Desc = "Health check + email ako problem"; Type = "node" },
  @{ Name = "SPC-Nedeljni-Rollup"; Script = "scripts\nedeljni-rollup.mjs"; Extra = ""; Schedule = "weeklyFri15"; Desc = "Nedeljni email rollup"; Type = "node" },
  @{ Name = "SPC-Postgres-Backup"; Script = "scripts\backup-postgres-windows.ps1"; Extra = ""; Schedule = "daily02"; Desc = "Nocni PostgreSQL backup (Docker)"; Type = "powershell" },
  @{ Name = "SPC-MomentDrop-Watcher"; Script = "scripts\watch-moment-drop.mjs"; Extra = "--watch"; Schedule = "atlogon"; Desc = "Moment-drop auto uvoz"; Type = "node" }
)

$results = @()
foreach ($t in $tasks) {
  $results += Register-SpcTask -Name $t.Name -ScriptRel $t.Script -ExtraArgs $t.Extra -Schedule $t.Schedule -Description $t.Desc -TaskType $t.Type
}

if (-not $Uninstall) {
  $ok = @($results | Where-Object { $_.Ok }).Count
  $fail = @($results | Where-Object { -not $_.Ok }).Count
  $LogsDir = Join-Path $Root "logs"

  Write-Host ""
  Write-Host "Rezultat: $ok uspesno, $fail neuspesno (od $($tasks.Count) taskova)"
  if ($fail -gt 0) {
    Write-Host "Neuspesni:"
    $results | Where-Object { -not $_.Ok } | ForEach-Object { Write-Host "  - $($_.Name)" }
    Write-Host ""
    Write-Host "Resenje: npm run auto:install:admin"
  }
  Write-Host ""
  Write-Host 'Provera: Get-ScheduledTask | Where-Object { $_.TaskName -like "SPC-*" }'
  Write-Host "Logovi: $LogsDir"
  Write-Host "Pregled: npm run logs:auto"
  Write-Host "Env: .env.local - SUPABASE_URL, SMTP_TO, LICENSE_VAZI_DO (opciono)"
  Write-Host "SQL: npm run db:migrate:auto"
}

if (@($results | Where-Object { -not $_.Ok }).Count -gt 0) {
  exit 1
}
