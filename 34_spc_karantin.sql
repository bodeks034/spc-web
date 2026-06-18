-- SPC karantin: status + HOLD lot/RN
ALTER TABLE spc_alarmi DROP CONSTRAINT IF EXISTS spc_alarmi_status_check;
ALTER TABLE spc_alarmi ADD CONSTRAINT spc_alarmi_status_check
  CHECK (status IN ('otvoren', 'potvrden', 'zatvoren', 'karantin'));

CREATE TABLE IF NOT EXISTS karantin_lotovi (
  id             SERIAL PRIMARY KEY,
  id_deo         TEXT NOT NULL REFERENCES delovi(id_deo),
  radni_nalog    TEXT,
  razlog         TEXT NOT NULL,
  spc_alarm_id   BIGINT REFERENCES spc_alarmi(id),
  eskalacija_id  INT REFERENCES eskalacije(id),
  status         TEXT NOT NULL DEFAULT 'aktivan'
    CHECK (status IN ('aktivan', 'pusten')),
  kreirao_id     INT REFERENCES radnici(id),
  pustio_id      INT REFERENCES radnici(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_karantin_deo_status ON karantin_lotovi(id_deo, status)
  WHERE status = 'aktivan';
CREATE INDEX IF NOT EXISTS idx_karantin_alarm ON karantin_lotovi(spc_alarm_id);

ALTER TABLE karantin_lotovi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_karantin_lotovi" ON karantin_lotovi;
CREATE POLICY "auth_read_karantin_lotovi" ON karantin_lotovi
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_karantin_lotovi" ON karantin_lotovi;
CREATE POLICY "auth_insert_karantin_lotovi" ON karantin_lotovi
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_karantin_lotovi" ON karantin_lotovi;
CREATE POLICY "auth_update_karantin_lotovi" ON karantin_lotovi
  FOR UPDATE USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
