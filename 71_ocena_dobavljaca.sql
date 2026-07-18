-- Periodična ocena dobavljača (Modul 2).
-- Pokrenuti posle 69_dobavljaci_prijemna_kontrola.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS ocene_dobavljaca (
  id BIGSERIAL PRIMARY KEY,
  sifra_dobavljaca TEXT NOT NULL
    REFERENCES dobavljaci(sifra_dobavljaca) ON UPDATE CASCADE,
  period_od DATE NOT NULL,
  period_do DATE NOT NULL,
  kvalitet_skor NUMERIC(5,2) NOT NULL CHECK (kvalitet_skor BETWEEN 0 AND 100),
  isporuka_skor NUMERIC(5,2) NOT NULL CHECK (isporuka_skor BETWEEN 0 AND 100),
  dokumentacija_skor NUMERIC(5,2) NOT NULL CHECK (dokumentacija_skor BETWEEN 0 AND 100),
  reakcija_skor NUMERIC(5,2) NOT NULL CHECK (reakcija_skor BETWEEN 0 AND 100),
  ukupna_ocena NUMERIC(5,2) NOT NULL CHECK (ukupna_ocena BETWEEN 0 AND 100),
  klasa CHAR(1) NOT NULL CHECK (klasa IN ('A', 'B', 'C', 'D')),
  ppm INTEGER NOT NULL DEFAULT 0 CHECK (ppm >= 0),
  kontrolisano NUMERIC NOT NULL DEFAULT 0 CHECK (kontrolisano >= 0),
  broj_prijema INTEGER NOT NULL DEFAULT 0 CHECK (broj_prijema >= 0),
  odbijeno_prijema INTEGER NOT NULL DEFAULT 0 CHECK (odbijeno_prijema >= 0),
  uslovno_prijema INTEGER NOT NULL DEFAULT 0 CHECK (uslovno_prijema >= 0),
  izvor_ostalih_ocena TEXT NOT NULL DEFAULT 'rucno'
    CHECK (izvor_ostalih_ocena IN ('rucno', 'erp')),
  obrazlozenje TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nacrt'
    CHECK (status IN ('nacrt', 'odobreno')),
  kreirao_radnik_id INT REFERENCES radnici(id) ON DELETE SET NULL,
  odobrio_radnik_id INT REFERENCES radnici(id) ON DELETE SET NULL,
  odobreno_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_do >= period_od),
  CHECK (NULLIF(TRIM(obrazlozenje), '') IS NOT NULL),
  CHECK (
    (status = 'nacrt')
    OR (status = 'odobreno' AND odobreno_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ocene_dobavljaca_sifra_period
  ON ocene_dobavljaca (sifra_dobavljaca, period_do DESC, created_at DESC);

COMMENT ON TABLE ocene_dobavljaca IS
  'Istorijski snapshot ocene: kvalitet 60%, isporuka 20%, dokumentacija 10%, reakcija 10%';
COMMENT ON COLUMN ocene_dobavljaca.kvalitet_skor IS
  'Automatski skor iz PPM-a i odbijenih/uslovnih prijema';
COMMENT ON COLUMN ocene_dobavljaca.izvor_ostalih_ocena IS
  'Ručni unos ili ERP izvor za isporuku, dokumentaciju i reakciju';
COMMENT ON COLUMN ocene_dobavljaca.status IS
  'Nacrt ili ručno odobrena ocena; aplikacija ne blokira dobavljača automatski';

ALTER TABLE ocene_dobavljaca ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_read_ocene_dobavljaca ON ocene_dobavljaca;
DROP POLICY IF EXISTS auth_write_ocene_dobavljaca ON ocene_dobavljaca;
CREATE POLICY auth_read_ocene_dobavljaca
  ON ocene_dobavljaca FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY auth_write_ocene_dobavljaca
  ON ocene_dobavljaca FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON ocene_dobavljaca TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE ocene_dobavljaca_id_seq TO authenticated;

COMMIT;
