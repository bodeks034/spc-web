-- Faza 5: kontrolni plan, MSA kalendar, FAI, SMTP podešavanja

CREATE TABLE IF NOT EXISTS kontrolni_plan (
  id              BIGSERIAL PRIMARY KEY,
  id_deo          TEXT NOT NULL REFERENCES delovi(id_deo),
  pogon_kod       TEXT,
  pozicija        TEXT NOT NULL,
  dimenzija       TEXT,
  metoda          TEXT,
  ucestalost      TEXT,
  reakcija        TEXT,
  revizija        TEXT NOT NULL DEFAULT 'A',
  vazi_od         DATE NOT NULL DEFAULT CURRENT_DATE,
  kreirao_id      INT REFERENCES radnici(id),
  aktivan         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kontrolni_plan_deo ON kontrolni_plan(id_deo, aktivan);

CREATE TABLE IF NOT EXISTS kontrolni_plan_revizija (
  id              BIGSERIAL PRIMARY KEY,
  plan_id         BIGINT REFERENCES kontrolni_plan(id) ON DELETE CASCADE,
  id_deo          TEXT NOT NULL,
  pozicija        TEXT,
  polje           TEXT NOT NULL,
  stara_vrednost  TEXT,
  nova_vrednost   TEXT,
  revizija        TEXT,
  vazi_od         DATE,
  radnik_id       INT REFERENCES radnici(id),
  radnik_ime      TEXT,
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS msa_kalendar (
  id                  SERIAL PRIMARY KEY,
  merilo_id           INT NOT NULL REFERENCES merila(id) ON DELETE CASCADE,
  interval_meseci     INT NOT NULL DEFAULT 12,
  sledeca_studija     DATE,
  poslednja_studija_id BIGINT REFERENCES gage_rr_studije(id) ON DELETE SET NULL,
  karakteristika      TEXT,
  napomena            TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (merilo_id)
);

CREATE TABLE IF NOT EXISTS fai_unosi (
  id              BIGSERIAL PRIMARY KEY,
  id_deo          TEXT NOT NULL REFERENCES delovi(id_deo),
  pogon_kod       TEXT,
  radni_nalog     TEXT,
  smena           INT NOT NULL DEFAULT 1,
  datum           DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'ceka'
    CHECK (status IN ('ceka', 'odobren', 'odbijen')),
  merenja_json    JSONB NOT NULL DEFAULT '[]',
  komentar        TEXT,
  kreirao_id      INT REFERENCES radnici(id),
  odobrio_id      INT REFERENCES radnici(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fai_deo_datum ON fai_unosi(id_deo, datum, smena, status);

ALTER TABLE kontrolni_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kontrolni_plan_revizija ENABLE ROW LEVEL SECURITY;
ALTER TABLE msa_kalendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE fai_unosi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_kontrolni_plan" ON kontrolni_plan;
CREATE POLICY "auth_kontrolni_plan" ON kontrolni_plan
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_kontrolni_plan_rev" ON kontrolni_plan_revizija;
CREATE POLICY "auth_kontrolni_plan_rev" ON kontrolni_plan_revizija
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_msa_kalendar" ON msa_kalendar;
CREATE POLICY "auth_msa_kalendar" ON msa_kalendar
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_fai_unosi" ON fai_unosi;
CREATE POLICY "auth_fai_unosi" ON fai_unosi
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

INSERT INTO app_podesavanja (kljuc, vrednost) VALUES
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from', ''),
  ('smtp_to', ''),
  ('smtp_tls', '1')
ON CONFLICT (kljuc) DO NOTHING;

NOTIFY pgrst, 'reload schema';
