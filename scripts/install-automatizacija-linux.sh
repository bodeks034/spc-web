#!/usr/bin/env bash
# Instalacija SPC cron zadataka (Linux / Ubuntu server).
#
#   cd /opt/spc-web
#   chmod +x scripts/install-automatizacija-linux.sh
#   ./scripts/install-automatizacija-linux.sh
#
# Deinstalacija:
#   ./scripts/install-automatizacija-linux.sh --uninstall
#
# Zahteva: node u PATH, .env.local u korenu projekta

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node || true)"
MARKER="# SPC-AUTO-CRON"
UNINSTALL=false

if [[ "${1:-}" == "--uninstall" ]]; then
  UNINSTALL=true
fi

if [[ -z "$NODE" ]]; then
  echo "Greska: node nije u PATH" >&2
  exit 1
fi

CRON_LINES=(
  "0 6 * * * cd $ROOT && $NODE scripts/erp-dnevni-uvoz.mjs >> logs/erp-uvoz.log 2>&1"
  "15 6 * * * cd $ROOT && $NODE scripts/erp-izvoz-kvalitet.mjs >> logs/erp-izvoz-kvalitet.log 2>&1"
  "0 3 * * 0 cd $ROOT && $NODE scripts/erp-processed-cleanup.mjs --apply --remove-empty-dirs >> logs/erp-processed-cleanup.log 2>&1"
  "5 14 * * * cd $ROOT && $NODE scripts/smenski-digest.mjs --pdf >> logs/smenski-digest.log 2>&1"
  "5 22 * * * cd $ROOT && $NODE scripts/smenski-digest.mjs --smena 2 --pdf >> logs/smenski-digest.log 2>&1"
  "0 8 * * * cd $ROOT && $NODE scripts/auto-podsetnici.mjs >> logs/auto-podsetnici.log 2>&1"
  "30 6 * * * cd $ROOT && $NODE scripts/auto-health-check.mjs --email >> logs/auto-health.log 2>&1"
  "0 15 * * 5 cd $ROOT && $NODE scripts/nedeljni-rollup.mjs >> logs/nedeljni-rollup.log 2>&1"
  "0 2 * * * cd $ROOT && bash scripts/backup-postgres-linux.sh >> logs/pg-backup.log 2>&1"
)

mkdir -p "$ROOT/logs"

if $UNINSTALL; then
  crontab -l 2>/dev/null | grep -v "$MARKER" | grep -v "scripts/erp-dnevni-uvoz" | grep -v "scripts/erp-izvoz-kvalitet" | grep -v "scripts/erp-processed-cleanup" | grep -v "scripts/smenski-digest" | grep -v "scripts/auto-podsetnici" | grep -v "scripts/auto-health-check" | grep -v "scripts/nedeljni-rollup" | grep -v "scripts/backup-postgres-linux" | crontab - 2>/dev/null || true
  echo "Uklonjeni SPC cron unosi."
  exit 0
fi

EXISTING="$(crontab -l 2>/dev/null || true)"
NEW="$EXISTING"
for line in "${CRON_LINES[@]}"; do
  if echo "$EXISTING" | grep -Fq "$line"; then
    continue
  fi
  NEW="${NEW}
$MARKER
$line"
done

echo "$NEW" | crontab -
echo "Instalirano ${#CRON_LINES[@]} cron zadataka za $ROOT"
echo "Provera: crontab -l | grep SPC"
echo "Logovi: $ROOT/logs"
echo "Env: .env.local (SUPABASE_URL, SMTP_TO, SPC_BACKUP_DIR)"
