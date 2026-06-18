# Automatski dnevni ERP uvoz — Windows Task Scheduler wrapper
# Upotreba: powershell -ExecutionPolicy Bypass -File scripts\erp-dnevni-uvoz.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Učitaj .env.erp ako postoji
$envFile = Join-Path $root ".env.erp"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
      $parts = $line.Split("=", 2)
      $key = $parts[0].Trim()
      $val = $parts[1].Trim().Trim('"').Trim("'")
      if (-not [string]::IsNullOrEmpty($key) -and -not $env:$key) {
        Set-Item -Path "env:$key" -Value $val
      }
    }
  }
}

Write-Host "ERP dnevni uvoz — $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
node scripts/erp-dnevni-uvoz.mjs
exit $LASTEXITCODE
