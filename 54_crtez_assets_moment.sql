-- Crtež assets (DWG izvor → SVG/PNG prikaz) + digitalni momentni ključ (JOB / korak / protokol)
-- Pokreni u Supabase SQL Editoru posle 53_pfmea_d_posle.sql

-- ─── Merila: digitalni momentni ključ na liniji ─────────────────────────────
ALTER TABLE merila ADD COLUMN IF NOT EXISTS kategorija TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS vendor_profil TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS linija_stanica TEXT;

COMMENT ON COLUMN merila.kategorija IS 'dimenzionalno | momentni_kljuc | vizuelno | …';
COMMENT ON COLUMN merila.vendor_profil IS 'SPC neutral → adapter: atlas | bosch | stahlwille | saltus | norbar';
COMMENT ON COLUMN merila.linija_stanica IS 'Opciona stanica na liniji (više istih modela)';

-- ─── Zajednički crteži (deo, vozilo, moment job, prilog) ────────────────────
CREATE TABLE IF NOT EXISTS crtez_assets (
  id              BIGSERIAL PRIMARY KEY,
  ref_tip         TEXT NOT NULL
    CHECK (ref_tip IN ('deo', 'vozilo', 'moment_job', 'pfmea_prilog', 'ostalo')),
  ref_id          TEXT NOT NULL,
  naziv           TEXT,
  izvor_format    TEXT CHECK (izvor_format IN ('dwg', 'dxf', 'svg', 'png', 'jpg', 'pdf', 'ostalo')),
  izvor_putanja   TEXT,
  prikaz_format   TEXT NOT NULL DEFAULT 'svg'
    CHECK (prikaz_format IN ('svg', 'png', 'jpg', 'webp')),
  prikaz_putanja  TEXT NOT NULL,
  revizija        TEXT NOT NULL DEFAULT 'A',
  aktivna         BOOLEAN NOT NULL DEFAULT TRUE,
  napomena        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crtez_assets_ref ON crtez_assets(ref_tip, ref_id, aktivna);
CREATE INDEX IF NOT EXISTS idx_crtez_assets_aktivna ON crtez_assets(aktivna) WHERE aktivna = TRUE;

COMMENT ON TABLE crtez_assets IS 'Izvor (npr. DWG) + derivat za prikaz (SVG/PNG) — zajednički za sve module';

-- ─── JOB definicija (po id_deo, više job-ova) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_job (
  id                    BIGSERIAL PRIMARY KEY,
  id_deo                TEXT NOT NULL REFERENCES delovi(id_deo),
  kod_job               TEXT NOT NULL,
  naziv                 TEXT NOT NULL,
  tip_vozila            TEXT REFERENCES tipovi_vozila(kod),
  operacija             TEXT,
  pogon_kod             TEXT,
  linija                TEXT,
  crtez_asset_id        BIGINT REFERENCES crtez_assets(id) ON DELETE SET NULL,
  vendor_profil         TEXT,
  revizija              TEXT NOT NULL DEFAULT 'A',
  aktivan               BOOLEAN NOT NULL DEFAULT TRUE,
  pfmea_cp_dokument_id  BIGINT REFERENCES pfmea_cp_dokumenti(id) ON DELETE SET NULL,
  napomena              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_moment_job_uniq
  ON moment_job (id_deo, kod_job, COALESCE(operacija, ''), COALESCE(pogon_kod, ''), revizija);

CREATE INDEX IF NOT EXISTS idx_moment_job_deo ON moment_job(id_deo, aktivan);
CREATE INDEX IF NOT EXISTS idx_moment_job_tip ON moment_job(tip_vozila, aktivan) WHERE tip_vozila IS NOT NULL;

COMMENT ON TABLE moment_job IS 'Posao na digitalnom ključu (npr. Motor, Točkovi) — primarno po id_deo';

-- ─── Pozicije na dijagramu (Poz. br.) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_pozicija (
  id              BIGSERIAL PRIMARY KEY,
  job_id          BIGINT NOT NULL REFERENCES moment_job(id) ON DELETE CASCADE,
  poz_br          TEXT NOT NULL,
  opis            TEXT,
  klasifikacija   TEXT CHECK (klasifikacija IN ('VSK', 'KSK', 'STD')),
  koord_x         NUMERIC,
  koord_y         NUMERIC,
  napomena        TEXT,
  UNIQUE (job_id, poz_br)
);

CREATE INDEX IF NOT EXISTS idx_moment_poz_job ON moment_pozicija(job_id);

-- ─── Koraci sekvence (ono što ključ vidi: 3/8) ──────────────────────────────
CREATE TABLE IF NOT EXISTS moment_korak (
  id                      BIGSERIAL PRIMARY KEY,
  job_id                  BIGINT NOT NULL REFERENCES moment_job(id) ON DELETE CASCADE,
  redosled                INT NOT NULL CHECK (redosled > 0),
  poz_br                  TEXT,
  prolaz                  INT NOT NULL DEFAULT 1 CHECK (prolaz > 0),
  tip                     TEXT NOT NULL DEFAULT 'NM'
    CHECK (tip IN ('NM', 'NM_UGAO', 'STAGED')),
  cilj_nm                 NUMERIC,
  tol_min                 NUMERIC,
  tol_max                 NUMERIC,
  tol_pct                 NUMERIC,
  ugao_cilj               NUMERIC,
  ugao_tol                NUMERIC,
  klasifikacija           TEXT CHECK (klasifikacija IN ('VSK', 'KSK', 'STD')),
  varijanta               TEXT,
  merilo_id               INT REFERENCES merila(id) ON DELETE SET NULL,
  control_plan_stavka_id  BIGINT REFERENCES control_plan_stavke(id) ON DELETE SET NULL,
  blokiraj_na_nok         BOOLEAN NOT NULL DEFAULT TRUE,
  uzorak_obavezan         BOOLEAN,
  napomena                TEXT,
  UNIQUE (job_id, redosled)
);

CREATE INDEX IF NOT EXISTS idx_moment_korak_job ON moment_korak(job_id, redosled);
CREATE INDEX IF NOT EXISTS idx_moment_korak_cp ON moment_korak(control_plan_stavka_id) WHERE control_plan_stavka_id IS NOT NULL;

-- ─── Protokol sa linije (rezultat zatezanja) ────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_protokol (
  id                BIGSERIAL PRIMARY KEY,
  datum             DATE NOT NULL DEFAULT CURRENT_DATE,
  smena             INT CHECK (smena BETWEEN 1 AND 3),
  id_deo            TEXT NOT NULL REFERENCES delovi(id_deo),
  radni_nalog       TEXT,
  job_id            BIGINT NOT NULL REFERENCES moment_job(id),
  korak_id          BIGINT NOT NULL REFERENCES moment_korak(id),
  korak_redosled    INT NOT NULL,
  poz_br            TEXT,
  ostvareno_nm      NUMERIC,
  ostvareno_ugao    NUMERIC,
  status            TEXT NOT NULL CHECK (status IN ('OK', 'NOK')),
  merilo_id         INT REFERENCES merila(id) ON DELETE SET NULL,
  radnik_id         INT REFERENCES radnici(id) ON DELETE SET NULL,
  operater          TEXT,
  linija            TEXT,
  izvor             TEXT NOT NULL DEFAULT 'rucno'
    CHECK (izvor IN ('rucno', 'fajl', 'serial', 'wifi', 'neutral_csv')),
  napomena          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moment_prot_datum ON moment_protokol(datum, id_deo, job_id);
CREATE INDEX IF NOT EXISTS idx_moment_prot_rn ON moment_protokol(radni_nalog, job_id) WHERE radni_nalog IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moment_prot_merilo ON moment_protokol(merilo_id, datum) WHERE merilo_id IS NOT NULL;

-- ─── Vendor profili u šifrarniku lista ─────────────────────────────────────
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES
  ('moment_kljuc_vendor', 'atlas', 1),
  ('moment_kljuc_vendor', 'bosch', 2),
  ('moment_kljuc_vendor', 'stahlwille', 3),
  ('moment_kljuc_vendor', 'saltus', 4),
  ('moment_kljuc_vendor', 'norbar', 5)
ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;

INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES
  ('moment_kljuc_kategorija', 'momentni_kljuc', 1),
  ('moment_kljuc_kategorija', 'dimenzionalno', 2)
ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE crtez_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_pozicija ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_korak ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_protokol ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_crtez_assets" ON crtez_assets;
CREATE POLICY "auth_crtez_assets" ON crtez_assets
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_moment_job" ON moment_job;
CREATE POLICY "auth_moment_job" ON moment_job
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_moment_pozicija" ON moment_pozicija;
CREATE POLICY "auth_moment_pozicija" ON moment_pozicija
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_moment_korak" ON moment_korak;
CREATE POLICY "auth_moment_korak" ON moment_korak
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_moment_protokol" ON moment_protokol;
CREATE POLICY "auth_moment_protokol" ON moment_protokol
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── GRANT ───────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON crtez_assets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON moment_job TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON moment_pozicija TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON moment_korak TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON moment_protokol TO authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE crtez_assets_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE moment_job_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE moment_pozicija_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE moment_korak_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE moment_protokol_id_seq TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
