-- PFMEA + Control Plan (PPAP) — unos u aplikaciji, Supabase izvor istine

CREATE TABLE IF NOT EXISTS pfmea_cp_dokumenti (
  id              BIGSERIAL PRIMARY KEY,
  naziv           TEXT NOT NULL DEFAULT 'PFMEA / Control Plan',
  id_deo          TEXT,
  revizija        TEXT NOT NULL DEFAULT 'A',
  napomena        TEXT,
  kreirao_id      INT REFERENCES radnici(id),
  kreirao_ime     TEXT,
  aktivan         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pfmea_cp_dok_deo ON pfmea_cp_dokumenti(id_deo, aktivan);
CREATE INDEX IF NOT EXISTS idx_pfmea_cp_dok_upd ON pfmea_cp_dokumenti(updated_at DESC);

CREATE TABLE IF NOT EXISTS pfmea_stavke (
  id                  BIGSERIAL PRIMARY KEY,
  dokument_id         BIGINT NOT NULL REFERENCES pfmea_cp_dokumenti(id) ON DELETE CASCADE,
  red_broj            INT NOT NULL DEFAULT 0,
  br_dela             TEXT,
  proces              TEXT,
  mod_greske          TEXT,
  uzrok_greske        TEXT,
  efekat_greske       TEXT,
  s                   TEXT,
  uzrok_mehanizam     TEXT,
  o                   TEXT,
  postojece_kontrole  TEXT,
  d                   TEXT,
  rpn_before          TEXT,
  akcija              TEXT,
  odgovorni           TEXT,
  rok                 TEXT,
  status              TEXT,
  rpn_after           TEXT,
  pfmea_veza          TEXT,
  control_plan_ref    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pfmea_stavke_doc ON pfmea_stavke(dokument_id, red_broj);

CREATE TABLE IF NOT EXISTS control_plan_stavke (
  id                          BIGSERIAL PRIMARY KEY,
  dokument_id                 BIGINT NOT NULL REFERENCES pfmea_cp_dokumenti(id) ON DELETE CASCADE,
  red_broj                    INT NOT NULL DEFAULT 0,
  br_dela                     TEXT,
  proces                      TEXT,
  karakteristika              TEXT,
  klasifikacija               TEXT,
  nominalna                   TEXT,
  tolerancija                 TEXT,
  metoda                      TEXT,
  oprema                      TEXT,
  msa                         TEXT,
  ucestalost                  TEXT,
  velicina_uzoraka            TEXT,
  reakcija_nekontrolisano     TEXT,
  reakcija_na_nepravilan_deo  TEXT,
  zapis_forma                 TEXT,
  pfmea_referenca             TEXT,
  mod_greske_pfmea            TEXT,
  status_cp                   TEXT,
  odgovorni                   TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_stavke_doc ON control_plan_stavke(dokument_id, red_broj);

ALTER TABLE pfmea_cp_dokumenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE pfmea_stavke ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_plan_stavke ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_pfmea_cp_dok" ON pfmea_cp_dokumenti;
CREATE POLICY "auth_pfmea_cp_dok" ON pfmea_cp_dokumenti
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_pfmea_stavke" ON pfmea_stavke;
CREATE POLICY "auth_pfmea_stavke" ON pfmea_stavke
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_cp_stavke" ON control_plan_stavke;
CREATE POLICY "auth_cp_stavke" ON control_plan_stavke
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
