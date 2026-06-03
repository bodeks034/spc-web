-- ============================================================
-- SPC agregati, alarmi, baseline (pokreni POSLE 05)
-- ============================================================

-- Dnevni rezime po smeni (ceo pogon)
CREATE OR REPLACE VIEW smena_rezime AS
SELECT
  datum,
  smena,
  COUNT(*)::INT                    AS merenja,
  COALESCE(SUM(ok_kolicina), 0)::INT  AS ok,
  COALESCE(SUM(nok_kolicina), 0)::INT AS nok,
  COALESCE(SUM(ukupno_merenja), 0)::INT AS ukupno
FROM kontrolni_log
GROUP BY datum, smena;

-- SPC agregat po danu / smeni / delu / mašini
CREATE OR REPLACE VIEW spc_dnevno AS
SELECT
  datum,
  smena,
  id_deo,
  masina_id,
  COUNT(*)::INT AS merenja,
  COALESCE(SUM(ok_kolicina), 0)::INT  AS ok,
  COALESCE(SUM(nok_kolicina), 0)::INT AS nok,
  COALESCE(SUM(ukupno_merenja), 0)::INT AS n,
  COALESCE(SUM(kom_nok), 0)::INT AS c
FROM kontrolni_log
GROUP BY datum, smena, id_deo, masina_id;

-- Rezime po delu i datumu (ciljevi / unos)
CREATE OR REPLACE VIEW deo_dnevno AS
SELECT
  datum,
  id_deo,
  COALESCE(SUM(ok_kolicina), 0)::INT  AS ok,
  COALESCE(SUM(nok_kolicina), 0)::INT AS nok,
  COALESCE(SUM(ukupno_merenja), 0)::INT AS n
FROM kontrolni_log
GROUP BY datum, id_deo;

-- Fiksni baseline kad je proces kvalifikovan
CREATE TABLE IF NOT EXISTS spc_baseline (
  id         SERIAL PRIMARY KEY,
  id_deo     TEXT NOT NULL REFERENCES delovi(id_deo),
  tip_karte  TEXT NOT NULL CHECK (tip_karte IN ('p','np','c','u','nc')),
  cl         NUMERIC(12,6) NOT NULL,
  ucl        NUMERIC(12,6) NOT NULL,
  lcl        NUMERIC(12,6) NOT NULL DEFAULT 0,
  vazi_od    DATE NOT NULL DEFAULT CURRENT_DATE,
  napomena   TEXT,
  kreirao_id INT REFERENCES radnici(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_deo, tip_karte, vazi_od)
);

-- Western Electric / out-of-control alarmi
CREATE TABLE IF NOT EXISTS spc_alarmi (
  id             BIGSERIAL PRIMARY KEY,
  id_deo         TEXT REFERENCES delovi(id_deo),
  datum          DATE NOT NULL DEFAULT CURRENT_DATE,
  tip_karte      TEXT,
  pravilo        TEXT NOT NULL,
  vrednost       NUMERIC(12,6),
  ucl            NUMERIC(12,6),
  lcl            NUMERIC(12,6),
  status         TEXT NOT NULL DEFAULT 'otvoren'
    CHECK (status IN ('otvoren','potvrden','zatvoren')),
  eskalacija_id  INT REFERENCES eskalacije(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spc_alarmi_deo_datum ON spc_alarmi(id_deo, datum);
CREATE INDEX IF NOT EXISTS idx_kontrolni_log_datum_smena ON kontrolni_log(datum, smena);
CREATE INDEX IF NOT EXISTS idx_kontrolni_log_deo_datum ON kontrolni_log(id_deo, datum);

ALTER TABLE spc_baseline ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_alarmi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_spc_baseline" ON spc_baseline;
CREATE POLICY "auth_read_spc_baseline" ON spc_baseline
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_spc_baseline" ON spc_baseline;
CREATE POLICY "auth_insert_spc_baseline" ON spc_baseline
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_spc_alarmi" ON spc_alarmi;
CREATE POLICY "auth_read_spc_alarmi" ON spc_alarmi
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_spc_alarmi" ON spc_alarmi;
CREATE POLICY "auth_insert_spc_alarmi" ON spc_alarmi
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_spc_alarmi" ON spc_alarmi;
CREATE POLICY "auth_update_spc_alarmi" ON spc_alarmi
  FOR UPDATE USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
