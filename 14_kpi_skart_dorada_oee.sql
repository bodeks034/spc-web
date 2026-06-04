-- KPI: škart, dorada, OEE — zajednički za atributivne i merljive
-- Pokreni u Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS kpi_unos (
  id                 BIGSERIAL PRIMARY KEY,
  modul              TEXT NOT NULL CHECK (modul IN ('atributivne', 'merljive')),
  datum              DATE NOT NULL DEFAULT CURRENT_DATE,
  smena              INT CHECK (smena BETWEEN 1 AND 3),
  id_deo             TEXT NOT NULL,
  serija             TEXT,
  radni_nalog        TEXT,
  ukupno_kom         INT NOT NULL DEFAULT 0,
  ispravno_iz_prve   INT NOT NULL DEFAULT 0,
  neusaglaseno       INT NOT NULL DEFAULT 0,
  dorada             INT NOT NULL DEFAULT 0,
  skart              INT NOT NULL DEFAULT 0,
  ok_nakon_dorade    INT NOT NULL DEFAULT 0,
  planirano_min      INT NOT NULL DEFAULT 0,
  zastoj_min         INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_unos_filter
  ON kpi_unos (modul, datum, id_deo, smena);

ALTER TABLE kpi_unos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_kpi_unos" ON kpi_unos;
CREATE POLICY "auth_read_kpi_unos" ON kpi_unos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_kpi_unos" ON kpi_unos;
CREATE POLICY "auth_insert_kpi_unos" ON kpi_unos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
