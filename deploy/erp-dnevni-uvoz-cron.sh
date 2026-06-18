#!/bin/bash
# Dnevni ERP uvoz — Linux cron (firminski server)
# Primer crontab (05:30 svaki dan):
#   30 5 * * * cd /opt/spc-web && /usr/bin/node scripts/erp-dnevni-uvoz.mjs >> logs/erp-uvoz.log 2>&1

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.env.erp" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.erp"
  set +a
fi

exec node scripts/erp-dnevni-uvoz.mjs
