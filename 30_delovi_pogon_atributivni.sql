-- Atributivne: vise pogona po id_deo (vizuelna kontrola).
-- NE dira UNIQUE na delovi.id_deo (FK zavisnosti).
-- Pokreni ceo fajl u Supabase SQL Editoru.

CREATE TABLE IF NOT EXISTS delovi_atributivni_pogon (
  id_deo          TEXT NOT NULL REFERENCES delovi(id_deo) ON DELETE CASCADE,
  pogon_kod       TEXT NOT NULL,
  radni_nalog     TEXT,
  naziv_dela      TEXT,
  karakteristika  TEXT,
  linija_id       INT REFERENCES linije(id),
  masina_id       INT REFERENCES masine(id),
  kom_za_kontrolu INT,
  napomena        TEXT,
  aktivan         BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id_deo, pogon_kod)
);

CREATE INDEX IF NOT EXISTS idx_delovi_atr_pogon_id
  ON delovi_atributivni_pogon (id_deo);

ALTER TABLE delovi_atributivni_pogon ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_delovi_atributivni_pogon" ON delovi_atributivni_pogon;
CREATE POLICY "auth_read_delovi_atributivni_pogon"
  ON delovi_atributivni_pogon FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_upsert_delovi_atributivni_pogon" ON delovi_atributivni_pogon;
CREATE POLICY "auth_upsert_delovi_atributivni_pogon"
  ON delovi_atributivni_pogon FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
