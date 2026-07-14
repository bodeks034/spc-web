-- ERP uvoz — upsert kataloga grešaka po poslovnom ključu
-- Pokreni u Supabase SQL Editor (posle 24 / 31 ako već nisu)

ALTER TABLE greske_katalog ADD COLUMN IF NOT EXISTS defekt TEXT;
ALTER TABLE greske_katalog ADD COLUMN IF NOT EXISTS opis TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_greske_katalog_kat_pod_defekt
  ON greske_katalog (kategorija, podkategorija, defekt);

-- SERIAL sekvenca posle ručnog/Excel uvoza sa eksplicitnim id
SELECT setval(
  pg_get_serial_sequence('greske_katalog', 'id'),
  COALESCE((SELECT MAX(id) FROM greske_katalog), 0),
  true
);

NOTIFY pgrst, 'reload schema';
