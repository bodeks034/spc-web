-- Ispravka dijagrama za NTV/MRAP/MRAP1 u atributivnom unosu
-- Pokreni u Supabase SQL Editoru (posle 39 i 40)

-- 1) Tipovi vozila + dijagram_src
INSERT INTO tipovi_vozila (kod, naziv, prefiks_id_deo, slika_sop, dijagram_src, napomena) VALUES
  ('NTV',   'NTV novo terensko',       'NTV',   'NTV_SOP.jpg',   '/vozilo/dijagrami/NTV.png',   'Finalna kontrola celog vozila'),
  ('MRAP',  'MRAP oklopno vozilo',     'MRAP',  'MRAP_SOP.jpg',  '/vozilo/dijagrami/MRAP.png',  'Finalna kontrola celog vozila'),
  ('MRAP1', 'MRAP1 oklopno 6×6',       'MRAP1', 'MRAP1_SOP.jpg', '/vozilo/dijagrami/MRAP1.png', 'Finalna kontrola celog vozila'),
  ('AUTO',  'Automobil (legacy)',      'AUTO',  'Auto_final_SOP.jpg', '/vozilo/dijagrami/auto-limuzina.svg', 'Stari AUTO-001 katalog')
ON CONFLICT (kod) DO UPDATE SET
  naziv = EXCLUDED.naziv,
  prefiks_id_deo = EXCLUDED.prefiks_id_deo,
  slika_sop = EXCLUDED.slika_sop,
  dijagram_src = EXCLUDED.dijagram_src,
  napomena = EXCLUDED.napomena,
  updated_at = NOW();

-- 2) Delovi celog vozila (zamena AUTO-001)
INSERT INTO delovi (
  id_deo, naziv_dela, karakteristika, linija_id, masina_id,
  kom_za_kontrolu, slika_naziv, aktivan, napomena, tip_kontrole, vozilo_katalog_id
) VALUES
  ('NTV-001',   'NTV komplet',   'Finalna vizuelna kontrola celog vozila', 48, 1, 5, 'NTV_SOP.jpg',   true, 'NTV — novo terensko vozilo',   'vozilo', 'NTV'),
  ('MRAP-001',  'MRAP komplet',  'Finalna vizuelna kontrola celog vozila', 48, 1, 5, 'MRAP_SOP.jpg',  true, 'MRAP — oklopno vozilo',       'vozilo', 'MRAP'),
  ('MRAP1-001', 'MRAP1 komplet', 'Finalna vizuelna kontrola celog vozila', 48, 1, 5, 'MRAP1_SOP.jpg', true, 'MRAP1 — oklopno vozilo 6x6',  'vozilo', 'MRAP1')
ON CONFLICT (id_deo) DO UPDATE SET
  naziv_dela = EXCLUDED.naziv_dela,
  karakteristika = EXCLUDED.karakteristika,
  tip_kontrole = EXCLUDED.tip_kontrole,
  vozilo_katalog_id = EXCLUDED.vozilo_katalog_id,
  slika_naziv = EXCLUDED.slika_naziv,
  aktivan = EXCLUDED.aktivan,
  napomena = EXCLUDED.napomena;

UPDATE delovi SET aktivan = false WHERE id_deo = 'AUTO-001';

-- 3) Ispravi pogrešan vozilo_katalog_id (npr. FINAL-001 sa starog AUTO-001)
UPDATE delovi SET vozilo_katalog_id = split_part(id_deo, '-', 1)
WHERE tip_kontrole = 'vozilo'
  AND id_deo ~ '^(NTV|MRAP1|MRAP)-'
  AND (
    vozilo_katalog_id IS NULL
    OR vozilo_katalog_id IN ('FINAL-001', 'AUTO', 'AUTO-001')
    OR vozilo_katalog_id = id_deo
  );

NOTIFY pgrst, 'reload schema';
