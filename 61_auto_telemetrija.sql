-- Auto telemetrija — cron run log + audit auto-akcija

CREATE TABLE IF NOT EXISTS auto_run_log (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  poruka TEXT,
  trajanje_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auto_run_log_job_created_idx
  ON auto_run_log (job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auto_akcije_log (
  id BIGSERIAL PRIMARY KEY,
  tip TEXT NOT NULL,
  entitet TEXT,
  entitet_id BIGINT,
  id_deo TEXT,
  opis TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auto_akcije_log_created_idx
  ON auto_akcije_log (created_at DESC);

CREATE INDEX IF NOT EXISTS auto_akcije_log_tip_idx
  ON auto_akcije_log (tip, created_at DESC);

ALTER TABLE auto_run_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_akcije_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auto_run_log_read ON auto_run_log;
CREATE POLICY auto_run_log_read ON auto_run_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS auto_run_log_insert ON auto_run_log;
CREATE POLICY auto_run_log_insert ON auto_run_log
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS auto_akcije_log_read ON auto_akcije_log;
CREATE POLICY auto_akcije_log_read ON auto_akcije_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS auto_akcije_log_insert ON auto_akcije_log;
CREATE POLICY auto_akcije_log_insert ON auto_akcije_log
  FOR INSERT TO authenticated WITH CHECK (true);
