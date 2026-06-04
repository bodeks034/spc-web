-- Gage R&R / MSA studije (merljive)
-- Pokreni u Supabase SQL Editor posle 05_dopuna_tabele_rls.sql

CREATE TABLE IF NOT EXISTS gage_rr_studije (
  id                BIGSERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  datum             DATE NOT NULL DEFAULT CURRENT_DATE,
  naziv             TEXT NOT NULL,
  merilo_id         INT REFERENCES merila(id) ON DELETE SET NULL,
  karakteristika    TEXT,
  lsl               NUMERIC,
  usl               NUMERIC,
  n_delova          INT NOT NULL,
  n_operatera       INT NOT NULL,
  n_ponavljanja     INT NOT NULL,
  operateri         JSONB NOT NULL DEFAULT '[]',
  delovi            JSONB NOT NULL DEFAULT '[]',
  matrica           JSONB NOT NULL,
  rezultat_xbar     JSONB,
  rezultat_anova    JSONB,
  pct_grr           NUMERIC,
  ndc               INT,
  status_msa        TEXT,
  kreirao_id        INT REFERENCES radnici(id) ON DELETE SET NULL,
  napomena          TEXT
);

CREATE INDEX IF NOT EXISTS idx_gage_rr_datum ON gage_rr_studije(datum DESC);
CREATE INDEX IF NOT EXISTS idx_gage_rr_merilo ON gage_rr_studije(merilo_id);

ALTER TABLE gage_rr_studije ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_gage_rr" ON gage_rr_studije;
CREATE POLICY "auth_read_gage_rr" ON gage_rr_studije
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_gage_rr" ON gage_rr_studije;
CREATE POLICY "auth_insert_gage_rr" ON gage_rr_studije
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_update_gage_rr" ON gage_rr_studije;
CREATE POLICY "auth_update_gage_rr" ON gage_rr_studije
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_delete_gage_rr" ON gage_rr_studije;
CREATE POLICY "auth_delete_gage_rr" ON gage_rr_studije
  FOR DELETE USING (auth.role() = 'authenticated');
