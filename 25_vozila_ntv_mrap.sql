-- NTV, MRAP, MRAP1 — zamena AUTO-001 u šifrarniku delova
-- Pokreni u Supabase SQL Editor ili uz import delovi.csv

INSERT INTO delovi (
  id_deo, naziv_dela, karakteristika, linija_id, masina_id,
  kom_za_kontrolu, slika_naziv, aktivan, napomena, tip_kontrole, vozilo_katalog_id
) VALUES
  ('NTV-001', 'NTV komplet', 'Finalna vizuelna kontrola celog vozila', 48, 1, 5, 'NTV_SOP.jpg', true, 'NTV — novo terensko vozilo', 'vozilo', 'NTV'),
  ('MRAP-001', 'MRAP komplet', 'Finalna vizuelna kontrola celog vozila', 48, 1, 5, 'MRAP_SOP.jpg', true, 'MRAP — oklopno vozilo', 'vozilo', 'MRAP'),
  ('MRAP1-001', 'MRAP1 komplet', 'Finalna vizuelna kontrola celog vozila', 48, 1, 5, 'MRAP1_SOP.jpg', true, 'MRAP1 — oklopno vozilo 6x6', 'vozilo', 'MRAP1')
ON CONFLICT (id_deo) DO UPDATE SET
  naziv_dela = EXCLUDED.naziv_dela,
  karakteristika = EXCLUDED.karakteristika,
  linija_id = EXCLUDED.linija_id,
  masina_id = EXCLUDED.masina_id,
  kom_za_kontrolu = EXCLUDED.kom_za_kontrolu,
  slika_naziv = EXCLUDED.slika_naziv,
  aktivan = EXCLUDED.aktivan,
  napomena = EXCLUDED.napomena,
  tip_kontrole = EXCLUDED.tip_kontrole,
  vozilo_katalog_id = EXCLUDED.vozilo_katalog_id;

-- Opciono: deaktiviraj stari AUTO-001 ako postoji
UPDATE delovi SET aktivan = false WHERE id_deo = 'AUTO-001';
