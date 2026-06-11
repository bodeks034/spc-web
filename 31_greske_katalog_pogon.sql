-- Greške po pogonu (A–H) za atributivne.
-- Pokreni u Supabase SQL Editoru (jednom).

ALTER TABLE greske_katalog
  ADD COLUMN IF NOT EXISTS pogon_kod TEXT;

COMMENT ON COLUMN greske_katalog.pogon_kod IS
  'A–H: greška samo za taj pogon. Prazno = stari zajednički katalog (svi pogoni).';

CREATE INDEX IF NOT EXISTS idx_greske_katalog_pogon
  ON greske_katalog (pogon_kod) WHERE pogon_kod IS NOT NULL;

NOTIFY pgrst, 'reload schema';
