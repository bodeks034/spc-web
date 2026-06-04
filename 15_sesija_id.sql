-- ID sesije serije — povezuje unose istog ciklusa (audit, offline sync)
-- Pokreni u Supabase SQL Editoru posle 14_kpi_skart_dorada_oee.sql

ALTER TABLE kontrolni_log
  ADD COLUMN IF NOT EXISTS sesija_id TEXT;

ALTER TABLE merenja_varijabilna
  ADD COLUMN IF NOT EXISTS sesija_id TEXT;

ALTER TABLE kpi_unos
  ADD COLUMN IF NOT EXISTS sesija_id TEXT;

CREATE INDEX IF NOT EXISTS idx_kontrolni_log_sesija ON kontrolni_log (sesija_id);
CREATE INDEX IF NOT EXISTS idx_merenja_var_sesija ON merenja_varijabilna (sesija_id);
CREATE INDEX IF NOT EXISTS idx_kpi_unos_sesija ON kpi_unos (sesija_id);

NOTIFY pgrst, 'reload schema';
