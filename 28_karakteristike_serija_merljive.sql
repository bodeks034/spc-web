-- Serija merenja po fazi (ulazna=3, laser=5…) — ne jedan broj_merenja za ceo deo
-- Pokreni u Supabase SQL Editoru posle 11_varijabilne_schema.sql

ALTER TABLE karakteristike_merljive
  ADD COLUMN IF NOT EXISTS broj_merenja INT CHECK (broj_merenja IS NULL OR (broj_merenja > 0 AND broj_merenja <= 100)),
  ADD COLUMN IF NOT EXISTS faza_naziv TEXT,
  ADD COLUMN IF NOT EXISTS linija_faza TEXT;

COMMENT ON COLUMN karakteristike_merljive.broj_merenja IS 'Broj uzoraka u seriji (sifra_merenja) — npr. ulazna 3, laser 5';
COMMENT ON COLUMN karakteristike_merljive.faza_naziv IS 'Naziv faze KP: Ulazna kontrola, Laser sečenje…';
COMMENT ON COLUMN karakteristike_merljive.linija_faza IS 'Organizaciona linija: Ulazna kontrola, Preseraj, Karoserija, Završna';

NOTIFY pgrst, 'reload schema';
