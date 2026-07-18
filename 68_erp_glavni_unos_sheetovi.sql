-- Trajni sheetovi Glavnog unosa + automatsko ERP raspoređivanje po šifri vozila.
-- Pokrenuti posle 67_erp_master_podaci.sql.
-- Idempotentno: može se pokrenuti više puta.

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

-- Sačuvaj postojeće sheetove (ako tabela redova postoji).
DO $$
BEGIN
  IF to_regclass('public.glavni_unos_redovi') IS NOT NULL THEN
    INSERT INTO glavni_unos_sheetovi (naziv, redosled)
    SELECT DISTINCT sheet_naziv, 100
    FROM glavni_unos_redovi
    WHERE NULLIF(TRIM(sheet_naziv), '') IS NOT NULL
    ON CONFLICT (naziv) DO NOTHING;
  END IF;
END $$;

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

DO $$
BEGIN
  IF to_regclass('public.glavni_unos_redovi') IS NOT NULL THEN
    ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS izvor TEXT;
    ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS erp_kljuc TEXT;
    ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS pogon_kod TEXT;
    ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS sifra_merenja TEXT;

    -- Samo ne-prazni ERP ključevi moraju biti jedinstveni (ručni redovi ostaju bez ključa).
    DROP INDEX IF EXISTS uq_glavni_unos_erp_red;
    CREATE UNIQUE INDEX uq_glavni_unos_erp_red
      ON glavni_unos_redovi (sheet_naziv, erp_kljuc)
      WHERE NULLIF(TRIM(erp_kljuc), '') IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_glavni_unos_sheet_vozilo
  ON glavni_unos_sheetovi (sifra_vozila, aktivan);

ALTER TABLE glavni_unos_sheetovi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_glavni_unos_sheetovi" ON glavni_unos_sheetovi;
DROP POLICY IF EXISTS auth_glavni_unos_sheetovi ON glavni_unos_sheetovi;
CREATE POLICY auth_glavni_unos_sheetovi ON glavni_unos_sheetovi
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE
  ON glavni_unos_sheetovi TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
