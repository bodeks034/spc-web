-- Jedinstveni ID inspekcije (komad) — više NOK defekata na istom komadu deli isti inspekcija_id
ALTER TABLE kontrolni_log
  ADD COLUMN IF NOT EXISTS inspekcija_id TEXT;

CREATE INDEX IF NOT EXISTS idx_kontrolni_log_inspekcija ON kontrolni_log (inspekcija_id);

NOTIFY pgrst, 'reload schema';
