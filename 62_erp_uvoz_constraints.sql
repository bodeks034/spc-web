-- ERP uvoz — UNIQUE ključevi za Supabase upsert (onConflict)
-- Pokreni posle 38_erp_uvoz_log.sql
-- Radi i na šemi sa broj_naloga (03) i legacy radni_nalog (01).

-- Mašine: SAP preset koristi upsert na naziv
CREATE UNIQUE INDEX IF NOT EXISTS idx_masine_naziv_unique ON masine (naziv);

-- Kupci: sinhronizacija iz radnih naloga
CREATE UNIQUE INDEX IF NOT EXISTS idx_kupci_naziv_unique ON kupci (naziv);

-- Radni nalozi: dopuna kolona (bezbedno ako već postoje iz 03_schema)
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS broj_naloga TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS kolicina INT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS kupac TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS datum_unosa DATE DEFAULT CURRENT_DATE;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS rok_isporuke DATE;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS operater TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS napomena TEXT;

-- Legacy (01_supabase_schema): kopiraj radni_nalog → broj_naloga samo ako ta kolona postoji
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'radni_nalozi'
      AND column_name = 'radni_nalog'
  ) THEN
    UPDATE radni_nalozi
    SET broj_naloga = UPPER(TRIM(radni_nalog))
    WHERE (broj_naloga IS NULL OR TRIM(broj_naloga) = '')
      AND radni_nalog IS NOT NULL
      AND TRIM(radni_nalog) <> '';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_radni_nalozi_broj_unique ON radni_nalozi (broj_naloga)
WHERE broj_naloga IS NOT NULL;

NOTIFY pgrst, 'reload schema';
