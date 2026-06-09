-- Odobrenje merenja uprkos istekloj kalibraciji (više uređaja, realtime).
-- Pokreni u Supabase SQL Editoru posle 08_fix_admin_radnik.sql

CREATE TABLE IF NOT EXISTS kalibracija_zahtevi (
  id            SERIAL PRIMARY KEY,
  operater_id   INT REFERENCES radnici(id),
  id_deo        TEXT NOT NULL,
  naziv_dela    TEXT,
  instrumenti   TEXT,
  razlog        TEXT,
  status        TEXT NOT NULL DEFAULT 'ceka',
  admin_id      INT REFERENCES radnici(id),
  napomena      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kalibracija_zahtevi_deo_status
  ON kalibracija_zahtevi (id_deo, status);

CREATE INDEX IF NOT EXISTS idx_kalibracija_zahtevi_operater
  ON kalibracija_zahtevi (operater_id, status);

ALTER TABLE kalibracija_zahtevi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_kalibracija_zahtevi" ON kalibracija_zahtevi;
CREATE POLICY "auth_read_kalibracija_zahtevi"
  ON kalibracija_zahtevi FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_kalibracija_zahtevi" ON kalibracija_zahtevi;
CREATE POLICY "auth_insert_kalibracija_zahtevi"
  ON kalibracija_zahtevi FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_update_kalibracija_zahtevi" ON kalibracija_zahtevi;
CREATE POLICY "auth_update_kalibracija_zahtevi"
  ON kalibracija_zahtevi FOR UPDATE
  USING (auth.role() = 'authenticated');
