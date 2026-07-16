-- Linija pouzdanost: foto NOK atributivne, client_id idempotentnost, PIN za tablet
-- Pokreni u Supabase SQL Editoru (ili docker exec) posle 65_licenca_uredjaji.sql

ALTER TABLE kontrolni_log
  ADD COLUMN IF NOT EXISTS foto TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID;

COMMENT ON COLUMN kontrolni_log.foto IS 'Base64 data URL (JPEG), opciono za NOK';
COMMENT ON COLUMN kontrolni_log.client_id IS 'Klijentski UUID — sprečava dupli insert posle offline retry';

CREATE UNIQUE INDEX IF NOT EXISTS kontrolni_log_client_id_uidx
  ON kontrolni_log (client_id)
  WHERE client_id IS NOT NULL;

ALTER TABLE merenja_varijabilna
  ADD COLUMN IF NOT EXISTS client_id UUID;

COMMENT ON COLUMN merenja_varijabilna.client_id IS 'Klijentski UUID — sprečava dupli insert posle offline retry';

CREATE UNIQUE INDEX IF NOT EXISTS merenja_varijabilna_client_id_uidx
  ON merenja_varijabilna (client_id)
  WHERE client_id IS NOT NULL;

ALTER TABLE radnici
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

COMMENT ON COLUMN radnici.pin_hash IS 'SHA-256 hex PIN za brzu smenu / idle lock na tabletu';

NOTIFY pgrst, 'reload schema';
