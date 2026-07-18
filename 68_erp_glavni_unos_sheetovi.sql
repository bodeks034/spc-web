-- Trajni sheetovi Glavnog unosa + automatsko ERP raspoređivanje po šifri vozila.
-- Pokrenuti posle 67_erp_master_podaci.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS glavni_unos_sheetovi (
  naziv          TEXT PRIMARY KEY,
  sifra_vozila   TEXT,
  redosled       INT NOT NULL DEFAULT 0,
  aktivan        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_glavni_unos_sheet_sifra_vozila
  ON glavni_unos_sheetovi (sifra_vozila)
  WHERE NULLIF(TRIM(sifra_vozila), '') IS NOT NULL;

-- Sačuvaj sve postojeće sheetove i dodaj standardne prazne.
INSERT INTO glavni_unos_sheetovi (naziv, redosled)
SELECT DISTINCT sheet_naziv, 100
FROM glavni_unos_redovi
WHERE NULLIF(TRIM(sheet_naziv), '') IS NOT NULL
ON CONFLICT (naziv) DO NOTHING;

INSERT INTO glavni_unos_sheetovi (naziv, redosled) VALUES
  ('vozilo1', 1),
  ('vozilo2', 2),
  ('vozilo3', 3),
  ('vozilo6', 6)
ON CONFLICT (naziv) DO NOTHING;

-- Pilot veza iz ERP primera: RTB-001 pripada TV4X4 i ide u vozilo1.
UPDATE glavni_unos_sheetovi
SET sifra_vozila = 'TV4X4', updated_at = NOW()
WHERE naziv = 'vozilo1'
  AND (sifra_vozila IS NULL OR sifra_vozila = 'TV4X4');

ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS izvor TEXT;
ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS erp_kljuc TEXT;
ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS pogon_kod TEXT;
ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS sifra_merenja TEXT;

-- NULL ERP ključ kod ručnih redova dozvoljava više ručnih dimenzija.
CREATE UNIQUE INDEX IF NOT EXISTS uq_glavni_unos_erp_red
  ON glavni_unos_redovi (sheet_naziv, erp_kljuc);

CREATE INDEX IF NOT EXISTS idx_glavni_unos_sheet_vozilo
  ON glavni_unos_sheetovi (sifra_vozila, aktivan);

ALTER TABLE glavni_unos_sheetovi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_glavni_unos_sheetovi" ON glavni_unos_sheetovi;
CREATE POLICY "auth_glavni_unos_sheetovi" ON glavni_unos_sheetovi
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';

COMMIT;
