# Pakuje projekat za prenos na firminski server (USB / interni share).
# Ne uključuje node_modules, dist, .env sa tajnim ključevima.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "deploy-paket"
$datum = Get-Date -Format "yyyy-MM-dd"

if (Test-Path $out) {
    Write-Host "Brisem stari deploy-paket..."
    Remove-Item -Recurse -Force $out
}

New-Item -ItemType Directory -Force -Path $out | Out-Null

$excludeDirs = @("node_modules", "dist", "deploy-paket", ".git")
$excludeFiles = @(".env", ".env.local", ".env.production")

function ShouldSkip($rel) {
    foreach ($d in $excludeDirs) {
        if ($rel -eq $d -or $rel.StartsWith("$d\")) { return $true }
    }
    $name = Split-Path -Leaf $rel
    if ($excludeFiles -contains $name) { return $true }
    return $false
}

Write-Host "Kopiram fajlove u $out ..."
Get-ChildItem -Path $root -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    if (ShouldSkip $rel) { return }
    $dest = Join-Path $out $rel
    $destDir = Split-Path -Parent $dest
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    Copy-Item $_.FullName $dest -Force
}

# README u paketu
@"

SPC Web — deploy paket ($datum)
================================

1. Pročitaj docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md
2. IT checklist: deploy/IT_CHECKLIST.md
3. HTTPS: deploy/TLS_QUICKSTART.md
4. Na serveru: Docker + Supabase (vidi uputstvo)
5. SQL migracije redom (docs/MIGRACIJE.md) ili scripts/primeni-migracije-lokalno.cmd (trening)
6. Restore backup/supabase/*.sql ako postoji
7. Kopiraj deploy/env.production.example -> .env.production (firminski URL!)
8. npm ci && npm run build
9. Nginx: deploy/nginx-spc.conf.example

Desktop trening (pre firme):
  scripts\setup-desktop-trening.cmd
  scripts\primeni-migracije-lokalno.cmd
  npm run dev

Backup folder: $(if (Test-Path (Join-Path $root 'backup')) { 'UKLJUCEN' } else { 'NIJE PRONADJEN - pokreni backup:db pre pakovanja' })

"@ | Set-Content -Path (Join-Path $out "DEPLOY_README.txt") -Encoding UTF8

$zip = Join-Path $root "deploy-paket_$datum.zip"
if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
    Compress-Archive -Path $out -DestinationPath $zip -Force
    Write-Host "ZIP: $zip"
}

Write-Host ""
Write-Host "Gotovo: $out"
Write-Host "Prebaci deploy-paket (ili ZIP) na server firme prema IT proceduri."
