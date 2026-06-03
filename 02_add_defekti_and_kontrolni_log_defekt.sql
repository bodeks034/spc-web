-- ============================================================
-- SPC: Defekti hijerarhija + kontrolni_log.defekt
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS defekti (
  id            BIGSERIAL PRIMARY KEY,
  kategorija    TEXT NOT NULL,
  podkategorija TEXT NOT NULL,
  defekt        TEXT NOT NULL,
  aktivan       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kategorija, podkategorija, defekt)
);

ALTER TABLE kontrolni_log
  ADD COLUMN IF NOT EXISTS defekt TEXT;

CREATE INDEX IF NOT EXISTS idx_defekti_hijerarhija
  ON defekti (kategorija, podkategorija, defekt);

ALTER TABLE defekti ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'defekti'
      AND policyname = 'Defekti citanje'
  ) THEN
    CREATE POLICY "Defekti citanje" ON defekti
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'defekti'
      AND policyname = 'Defekti admin upis'
  ) THEN
    CREATE POLICY "Defekti admin upis" ON defekti
      FOR ALL USING (auth.jwt() ->> 'role' = 'admin')
      WITH CHECK (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

COMMIT;
