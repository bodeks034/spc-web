-- Dijagram siluete vozila po tipu (Modul 0 → Tipovi vozila)
-- Pokreni u Supabase SQL Editoru

ALTER TABLE tipovi_vozila
  ADD COLUMN IF NOT EXISTS dijagram_src TEXT;

COMMENT ON COLUMN tipovi_vozila.dijagram_src IS
  'Silueta za unos zona: /vozilo/dijagrami/MRAP.png (public) ili vozilo-dijagram/MRAP.png (Storage atributivne/)';

UPDATE tipovi_vozila SET dijagram_src = '/vozilo/dijagrami/NTV.png'
  WHERE kod = 'NTV' AND (dijagram_src IS NULL OR dijagram_src = '');
UPDATE tipovi_vozila SET dijagram_src = '/vozilo/dijagrami/MRAP.png'
  WHERE kod = 'MRAP' AND (dijagram_src IS NULL OR dijagram_src = '');
UPDATE tipovi_vozila SET dijagram_src = '/vozilo/dijagrami/MRAP1.png'
  WHERE kod = 'MRAP1' AND (dijagram_src IS NULL OR dijagram_src = '');

NOTIFY pgrst, 'reload schema';
