#!/bin/bash
# Noćni backup PostgreSQL + opciono Storage — pokreni na Linux serveru (cron).
# Prilagodi putanje i ime Docker kontejnera.

set -euo pipefail

BACKUP_DIR="/opt/spc-web/backup/nightly"
DB_CONTAINER="supabase-db"
RETAIN_DAYS=14

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y-%m-%d_%H%M)
FILE="$BACKUP_DIR/spc_${STAMP}.sql.gz"

echo "Dump -> $FILE"
docker exec "$DB_CONTAINER" pg_dump -U postgres postgres | gzip > "$FILE"

find "$BACKUP_DIR" -name "spc_*.sql.gz" -mtime +$RETAIN_DAYS -delete

echo "OK"

# Opciono Storage (nedeljno u cron-u):
# cd /opt/spc-web && SUPABASE_URL=http://127.0.0.1:8000 SUPABASE_SERVICE_ROLE_KEY=... npm run backup:storage
