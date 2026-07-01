-- Glavni unos u aplikaciji + mapa linija → pogon
-- Pokreni u Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS pogon_linija_mapa (
  linija_faza   TEXT PRIMARY KEY,
  linija_id     INT,
  pogon_kod     TEXT NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS glavni_unos_redovi (
  id                  BIGSERIAL PRIMARY KEY,
  sheet_naziv         TEXT NOT NULL DEFAULT 'vozilo1',
  redosled            INT NOT NULL DEFAULT 0,
  id_deo              TEXT,
  datum               TEXT,
  broj_crteza         TEXT,
  radni_nalog         TEXT,
  naziv_dela          TEXT,
  slika               TEXT,
  linija              TEXT,
  operacija           TEXT,
  masina_id           INT,
  ukupno_kom          INT,
  kom_za_kontrolu_n   INT,
  karakteristika      TEXT,
  klasa               TEXT,
  nominal             NUMERIC,
  usl                 NUMERIC,
  lsl                 NUMERIC,
  jedinica            TEXT,
  tip                 TEXT,
  instrument          TEXT,
  kontolor            TEXT,
  nivo_kontrole_fac   TEXT,
  fac_broj            INT,
  spc_broj_merenja    INT,
  reakcioni_plan      TEXT,
  podatke_uneo        TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_glavni_unos_sheet ON glavni_unos_redovi(sheet_naziv, redosled);
CREATE INDEX IF NOT EXISTS idx_glavni_unos_deo ON glavni_unos_redovi(id_deo);

INSERT INTO pogon_linija_mapa (linija_faza, linija_id, pogon_kod) VALUES
  ('Ulazna kontrola', 1, 'A'),
  ('Preseraj', 2, 'B'),
  ('Karoserija', 3, 'C'),
  ('Lakirnica', 4, 'D'),
  ('Montaža', 5, 'E'),
  ('Završna', 6, 'F'),
  ('Mašinska obrada', 7, 'G'),
  ('Alatnica', 8, 'H'),
  ('Logistika', 9, 'I')
ON CONFLICT (linija_faza) DO UPDATE SET
  linija_id = EXCLUDED.linija_id,
  pogon_kod = EXCLUDED.pogon_kod,
  updated_at = NOW();

ALTER TABLE pogon_linija_mapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE glavni_unos_redovi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_pogon_linija" ON pogon_linija_mapa;
CREATE POLICY "auth_pogon_linija" ON pogon_linija_mapa
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_glavni_unos" ON glavni_unos_redovi;
CREATE POLICY "auth_glavni_unos" ON glavni_unos_redovi
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
