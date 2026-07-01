-- Šifrarnik modul: tipovi vozila + profili barkod etiketa
-- Pokreni u Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS tipovi_vozila (
  kod             TEXT PRIMARY KEY,
  naziv           TEXT NOT NULL,
  prefiks_id_deo  TEXT,
  slika_sop       TEXT,
  aktivan         BOOLEAN NOT NULL DEFAULT TRUE,
  napomena        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barkod_profili (
  id               BIGSERIAL PRIMARY KEY,
  id_deo           TEXT NOT NULL REFERENCES delovi(id_deo) ON DELETE CASCADE,
  format           TEXT NOT NULL DEFAULT 'id'
    CHECK (format IN ('id', 'id_rn', 'puna')),
  sadrzaj_barkoda  TEXT NOT NULL,
  radni_nalog      TEXT,
  tip_koda         TEXT NOT NULL DEFAULT 'oba'
    CHECK (tip_koda IN ('oba', 'qr', 'code128')),
  aktivna          BOOLEAN NOT NULL DEFAULT TRUE,
  napomena         TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_deo, format)
);

CREATE INDEX IF NOT EXISTS idx_barkod_profili_deo ON barkod_profili(id_deo);

COMMENT ON TABLE tipovi_vozila IS 'Tip celog vozila (MRAP, NTV, …) — šifrarnik modul';
COMMENT ON TABLE barkod_profili IS 'Sadržaj barkoda po delu — zamena Excel Barkod_etikete.xlsx';

INSERT INTO tipovi_vozila (kod, naziv, prefiks_id_deo, slika_sop, napomena) VALUES
  ('MRAP',  'MRAP oklopno vozilo',     'MRAP',  'MRAP_SOP.jpg',  'Finalna kontrola celog vozila'),
  ('MRAP1', 'MRAP1 oklopno 6×6',       'MRAP1', 'MRAP1_SOP.jpg', 'Finalna kontrola celog vozila'),
  ('NTV',   'NTV novo terensko',       'NTV',   'NTV_SOP.jpg',   'Finalna kontrola celog vozila'),
  ('AUTO',  'Automobil (legacy)',      'AUTO',  'Auto_final_SOP.jpg', 'Stari AUTO-001 katalog')
ON CONFLICT (kod) DO UPDATE SET
  naziv = EXCLUDED.naziv,
  prefiks_id_deo = EXCLUDED.prefiks_id_deo,
  slika_sop = EXCLUDED.slika_sop,
  napomena = EXCLUDED.napomena,
  updated_at = NOW();

ALTER TABLE tipovi_vozila ENABLE ROW LEVEL SECURITY;
ALTER TABLE barkod_profili ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_tipovi_vozila" ON tipovi_vozila;
CREATE POLICY "auth_tipovi_vozila" ON tipovi_vozila
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_barkod_profili" ON barkod_profili;
CREATE POLICY "auth_barkod_profili" ON barkod_profili
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
