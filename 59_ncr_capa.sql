-- NCR / CAPA modul — formalni tok uzrok → akcija → verifikacija
-- Pokreni posle 58_moment_pfmea_link.sql

CREATE TABLE IF NOT EXISTS ncr_capa (
  id                BIGSERIAL PRIMARY KEY,
  broj_ncr          TEXT NOT NULL UNIQUE,
  id_deo            TEXT NOT NULL REFERENCES delovi(id_deo),
  radni_nalog       TEXT,
  serija            TEXT,
  vin               TEXT,
  smena             INT CHECK (smena BETWEEN 1 AND 3),
  linija            TEXT,
  opis              TEXT NOT NULL,
  uzrok             TEXT,
  korektivna        TEXT,
  verifikacija      TEXT,
  status            TEXT NOT NULL DEFAULT 'otvoren'
    CHECK (status IN ('otvoren', 'analiza', 'akcija', 'verifikacija', 'zatvoren')),
  prioritet         TEXT NOT NULL DEFAULT 'normalan'
    CHECK (prioritet IN ('nizak', 'normalan', 'visok', 'kriticno')),
  rok               DATE,
  izvor             TEXT,
  eskalacija_id     INT REFERENCES eskalacije(id) ON DELETE SET NULL,
  osmd_id           INT REFERENCES osmd_izvestaji(id) ON DELETE SET NULL,
  spc_alarm_id      BIGINT REFERENCES spc_alarmi(id) ON DELETE SET NULL,
  pfmea_stavka_id   BIGINT REFERENCES pfmea_stavke(id) ON DELETE SET NULL,
  kreirao_id        INT REFERENCES radnici(id) ON DELETE SET NULL,
  odobrio_id        INT REFERENCES radnici(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  zatvoreno_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ncr_capa_deo_status ON ncr_capa(id_deo, status);
CREATE INDEX IF NOT EXISTS idx_ncr_capa_status ON ncr_capa(status) WHERE status <> 'zatvoren';
CREATE INDEX IF NOT EXISTS idx_ncr_capa_rok ON ncr_capa(rok) WHERE status <> 'zatvoren';

COMMENT ON TABLE ncr_capa IS 'NCR/CAPA — neusaglašenost, uzrok, korektivna mera, verifikacija, veza 8D/PFMEA/SPC';

ALTER TABLE ncr_capa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_ncr_capa" ON ncr_capa;
CREATE POLICY "auth_ncr_capa" ON ncr_capa
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON ncr_capa TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE ncr_capa_id_seq TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
