-- SPC alarmi: obavezna reakcija na liniji (komentar operatera / zatvaranje)
ALTER TABLE spc_alarmi
  ADD COLUMN IF NOT EXISTS pozicija TEXT,
  ADD COLUMN IF NOT EXISTS komentar_operater TEXT,
  ADD COLUMN IF NOT EXISTS komentar_zatvaranja TEXT,
  ADD COLUMN IF NOT EXISTS potvrdio_id INT REFERENCES radnici(id),
  ADD COLUMN IF NOT EXISTS zatvorio_id INT REFERENCES radnici(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_spc_alarmi_status_deo
  ON spc_alarmi(status, id_deo)
  WHERE status IN ('otvoren', 'potvrden');

NOTIFY pgrst, 'reload schema';
