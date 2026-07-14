#!/usr/bin/env bash
# Nocni PostgreSQL backup (Docker) — Linux cron.
# Env: SPC_BACKUP_DIR, SPC_DOCKER_DB (default: supabase-db)

set -euo pipefail

CONTAINER="${SPC_DOCKER_DB:-supabase-db}"
OUT_DIR="${SPC_BACKUP_DIR:-/var/backups/spc}"
KEEP_DAYS="${SPC_BACKUP_KEEP_DAYS:-30}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Kontejner '$CONTAINER' nije pokrenut." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT_FILE="$OUT_DIR/spc_pg_${STAMP}.sql"

docker exec "$CONTAINER" pg_dump -U postgres -d postgres --no-owner --no-acl > "$OUT_FILE"
gzip -f "$OUT_FILE"
echo "Backup: ${OUT_FILE}.gz"

find "$OUT_DIR" -name 'spc_pg_*.sql.gz' -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
