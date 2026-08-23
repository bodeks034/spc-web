#!/bin/bash
# Nedeljni digest zaglavljenih delova u šifrarniku — Linux cron
# Primer crontab (petak 15:00):
#   0 15 * * 5 cd /opt/spc-web && /usr/bin/node scripts/auto-sifrarnik-zaglavljeni.mjs >> logs/auto-sifrarnik-zaglavljeni.log 2>&1

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
fi

exec node scripts/auto-sifrarnik-zaglavljeni.mjs
