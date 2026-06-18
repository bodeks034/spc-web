-- Log automatskog / ručnog ERP uvoza radnih naloga
-- Pokreni u Supabase SQL Editoru posle 37_fai_broj_merenja.sql

CREATE TABLE IF NOT EXISTS erp_uvoz_log (
  id              BIGSERIAL PRIMARY KEY,
  izvor           TEXT NOT NULL DEFAULT 'cron',
  fajl            TEXT,
  ukupno_redova   INT DEFAULT 0,
  validnih        INT DEFAULT 0,
  upsertovano     INT DEFAULT 0,
  aktivnih        INT DEFAULT 0,
  upozorenja      INT DEFAULT 0,
  uspeh           BOOLEAN DEFAULT true,
  greska          TEXT,
  detalj          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS erp_uvoz_log_created_at_idx ON erp_uvoz_log (created_at DESC);

ALTER TABLE erp_uvoz_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_erp_uvoz_log" ON erp_uvoz_log;
CREATE POLICY "auth_read_erp_uvoz_log" ON erp_uvoz_log
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "service_insert_erp_uvoz_log" ON erp_uvoz_log;
CREATE POLICY "service_insert_erp_uvoz_log" ON erp_uvoz_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
