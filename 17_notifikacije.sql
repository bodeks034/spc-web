-- Faza C: obaveštenja (Teams webhook, log) + podešavanja aplikacije
-- Pokreni u Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS app_podesavanja (
  kljuc       TEXT PRIMARY KEY,
  vrednost    TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifikacije_log (
  id          BIGSERIAL PRIMARY KEY,
  kanal       TEXT NOT NULL,
  alarm_id    TEXT,
  naslov      TEXT NOT NULL,
  poruka      TEXT,
  nivo        TEXT,
  uspeh       BOOLEAN DEFAULT true,
  greska      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_podesavanja ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikacije_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_app_podesavanja" ON app_podesavanja;
CREATE POLICY "auth_read_app_podesavanja" ON app_podesavanja
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_write_app_podesavanja" ON app_podesavanja;
CREATE POLICY "auth_write_app_podesavanja" ON app_podesavanja
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_notifikacije_log" ON notifikacije_log;
CREATE POLICY "auth_read_notifikacije_log" ON notifikacije_log
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_notifikacije_log" ON notifikacije_log;
CREATE POLICY "auth_insert_notifikacije_log" ON notifikacije_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

INSERT INTO app_podesavanja (kljuc, vrednost) VALUES
  ('notif_browser', '1'),
  ('notif_teams', '0'),
  ('teams_webhook', ''),
  ('notif_email', '0'),
  ('email_webhook', '')
ON CONFLICT (kljuc) DO NOTHING;

NOTIFY pgrst, 'reload schema';
