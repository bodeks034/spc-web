-- Dobavljači: prijemna kontrola i KPI osnova za izveštaj dobavljača.
-- Pokrenuti posle 67_erp_master_podaci.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS prijemna_kontrola_dobavljaca (
  id BIGSERIAL PRIMARY KEY,
  erp_kljuc TEXT,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  sifra_dobavljaca TEXT NOT NULL
    REFERENCES dobavljaci(sifra_dobavljaca) ON UPDATE CASCADE,
  sifra_materijala TEXT
    REFERENCES materijali(sifra_materijala) ON UPDATE CASCADE,
  id_deo TEXT
    REFERENCES delovi(id_deo) ON UPDATE CASCADE,
  broj_lota TEXT,
  broj_dokumenta TEXT,
  primljeno NUMERIC NOT NULL DEFAULT 0 CHECK (primljeno >= 0),
  kontrolisano NUMERIC NOT NULL DEFAULT 0 CHECK (kontrolisano >= 0),
  ok_kolicina NUMERIC NOT NULL DEFAULT 0 CHECK (ok_kolicina >= 0),
  nok_kolicina NUMERIC NOT NULL DEFAULT 0 CHECK (nok_kolicina >= 0),
  defekt TEXT,
  foto_nok TEXT,
  foto_komentar TEXT,
  status TEXT NOT NULL DEFAULT 'otvoreno'
    CHECK (status IN ('prihvaceno', 'uslovno', 'odbijeno', 'otvoreno')),
  napomena TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kontrolisano <= primljeno),
  CHECK (ok_kolicina + nok_kolicina <= kontrolisano)
);

-- Idempotentno za slučaj da je starija verzija tabele već kreirana.
ALTER TABLE prijemna_kontrola_dobavljaca ADD COLUMN IF NOT EXISTS erp_kljuc TEXT;
ALTER TABLE prijemna_kontrola_dobavljaca
  ADD COLUMN IF NOT EXISTS foto_nok TEXT,
  ADD COLUMN IF NOT EXISTS foto_komentar TEXT;
COMMENT ON COLUMN prijemna_kontrola_dobavljaca.foto_nok
  IS 'Kompresovan JPEG data URL, opciono uz NOK prijem';
COMMENT ON COLUMN prijemna_kontrola_dobavljaca.foto_komentar
  IS 'Komentar uz fotografiju NOK dela ili materijala';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prijemna_kontrola_dobavljaca_id_deo_fkey'
  ) THEN
    BEGIN
      ALTER TABLE prijemna_kontrola_dobavljaca
        ADD CONSTRAINT prijemna_kontrola_dobavljaca_id_deo_fkey
        FOREIGN KEY (id_deo) REFERENCES delovi(id_deo) ON UPDATE CASCADE;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE prijemna_kontrola_dobavljaca
  ALTER COLUMN status SET DEFAULT 'otvoreno';

CREATE UNIQUE INDEX IF NOT EXISTS uq_prijemna_erp_kljuc
  ON prijemna_kontrola_dobavljaca (erp_kljuc)
  WHERE NULLIF(TRIM(erp_kljuc), '') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prijemna_dobavljac_datum
  ON prijemna_kontrola_dobavljaca (sifra_dobavljaca, datum DESC);
CREATE INDEX IF NOT EXISTS idx_prijemna_materijal
  ON prijemna_kontrola_dobavljaca (sifra_materijala);
CREATE INDEX IF NOT EXISTS idx_prijemna_lot
  ON prijemna_kontrola_dobavljaca (broj_lota);

ALTER TABLE prijemna_kontrola_dobavljaca ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all_prijemna_kontrola_dobavljaca
  ON prijemna_kontrola_dobavljaca;
CREATE POLICY auth_all_prijemna_kontrola_dobavljaca
  ON prijemna_kontrola_dobavljaca
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE
  ON prijemna_kontrola_dobavljaca TO authenticated, service_role;
GRANT USAGE, SELECT
  ON SEQUENCE prijemna_kontrola_dobavljaca_id_seq TO authenticated, service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
