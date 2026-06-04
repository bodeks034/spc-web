-- Revizija granica merljivih karakteristika (LSL/USL/nominala)
-- Pokreni posle 11_varijabilne_schema.sql

CREATE TABLE IF NOT EXISTS karakteristike_revizija (
  id                BIGSERIAL PRIMARY KEY,
  karakteristika_id BIGINT REFERENCES karakteristike_merljive(id) ON DELETE SET NULL,
  id_deo            TEXT NOT NULL,
  pozicija          TEXT,
  polje             TEXT NOT NULL,
  stara_vrednost    TEXT,
  nova_vrednost     TEXT,
  radnik_id         BIGINT REFERENCES radnici(id) ON DELETE SET NULL,
  radnik_ime        TEXT,
  napomena          TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kar_rev_deo ON karakteristike_revizija(id_deo, created_at DESC);

ALTER TABLE karakteristike_revizija ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_kar_rev" ON karakteristike_revizija;
CREATE POLICY "auth_read_kar_rev" ON karakteristike_revizija
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_insert_kar_rev" ON karakteristike_revizija;
CREATE POLICY "auth_insert_kar_rev" ON karakteristike_revizija
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_update_kar_merljive" ON karakteristike_merljive;
CREATE POLICY "auth_update_kar_merljive" ON karakteristike_merljive
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
