-- Varijabilne veličine — šema (UserForm + Definicija_Karakteristika + DATA)
-- Pokreni posle 03_schema_from_docs.sql

-- Zaglavlje po delu (SOP list — kolona 21 = broj_merenja, default 5)
CREATE TABLE IF NOT EXISTS sop_deo_varijabilni (
  id_deo           TEXT PRIMARY KEY REFERENCES delovi(id_deo),
  radni_nalog      TEXT,
  naziv_dela       TEXT,
  slika            TEXT,
  masina           TEXT,
  linija           TEXT,
  broj_merenja     INT NOT NULL DEFAULT 5 CHECK (broj_merenja > 0 AND broj_merenja <= 100),
  kontrolor_ime    TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Karakteristike merljive (Definicija_Karakteristika)
CREATE TABLE IF NOT EXISTS karakteristike_merljive (
  id                 BIGSERIAL PRIMARY KEY,
  id_deo             TEXT NOT NULL REFERENCES delovi(id_deo),
  sifra_merenja      TEXT NOT NULL,
  pozicija           TEXT NOT NULL,
  naziv_mere         TEXT,
  nominala           NUMERIC,
  usl                NUMERIC,
  lsl                NUMERIC,
  usl_text           TEXT,
  lsl_text           TEXT,
  merni_instrument   TEXT,
  jedinica           TEXT,
  napomena           TEXT,
  UNIQUE (id_deo, sifra_merenja, pozicija)
);

CREATE INDEX IF NOT EXISTS idx_karakteristike_deo_ab
  ON karakteristike_merljive (id_deo, sifra_merenja);

-- Pojedinačna merenja (DATA list)
CREATE TABLE IF NOT EXISTS merenja_varijabilna (
  id                 BIGSERIAL PRIMARY KEY,
  datum              DATE NOT NULL DEFAULT CURRENT_DATE,
  smena              INT CHECK (smena BETWEEN 1 AND 3),
  radni_nalog        TEXT,
  id_deo             TEXT NOT NULL REFERENCES delovi(id_deo),
  karakteristika_id  BIGINT REFERENCES karakteristike_merljive(id),
  sifra_merenja      TEXT,
  pozicija           TEXT NOT NULL,
  vrednost_raw       TEXT NOT NULL,
  vrednost_dec       NUMERIC,
  status             TEXT NOT NULL CHECK (status IN ('OK', 'NOK')),
  linija             TEXT,
  kontrolor          TEXT,
  operater           TEXT,
  merni_instrument   TEXT,
  masina             TEXT,
  radnik_id          INT REFERENCES radnici(id),
  foto               TEXT,
  komentar           TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merenja_var_datum_deo
  ON merenja_varijabilna (datum, id_deo, pozicija);

-- RLS
ALTER TABLE sop_deo_varijabilni ENABLE ROW LEVEL SECURITY;
ALTER TABLE karakteristike_merljive ENABLE ROW LEVEL SECURITY;
ALTER TABLE merenja_varijabilna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_sop_deo_var" ON sop_deo_varijabilni;
CREATE POLICY "auth_read_sop_deo_var" ON sop_deo_varijabilni
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_karakteristike" ON karakteristike_merljive;
CREATE POLICY "auth_read_karakteristike" ON karakteristike_merljive
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_merenja_var" ON merenja_varijabilna;
CREATE POLICY "auth_read_merenja_var" ON merenja_varijabilna
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_merenja_var" ON merenja_varijabilna;
CREATE POLICY "auth_insert_merenja_var" ON merenja_varijabilna
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all_karakteristike" ON karakteristike_merljive;
CREATE POLICY "auth_all_karakteristike" ON karakteristike_merljive
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_all_sop_deo_var" ON sop_deo_varijabilni;
CREATE POLICY "auth_all_sop_deo_var" ON sop_deo_varijabilni
  FOR ALL USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
