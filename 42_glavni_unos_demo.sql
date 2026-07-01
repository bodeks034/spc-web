-- Demo redovi u glavnom unosu (opciono — u app: Šifrarnik → Osnovno → Glavni unos → "Ubaci demo deo")
-- Pokreni u Supabase SQL Editoru

DELETE FROM glavni_unos_redovi WHERE id_deo IN ('DEMO-5502', 'MRAP-001');

INSERT INTO glavni_unos_redovi (
  sheet_naziv, redosled, id_deo, naziv_dela, radni_nalog, broj_crteza,
  linija, operacija, masina_id, ukupno_kom, kom_za_kontrolu_n,
  karakteristika, tip, klasa, nominal, usl, lsl, jedinica, instrument,
  spc_broj_merenja, reakcioni_plan, slika
) VALUES
  ('vozilo1', 0, 'DEMO-5502', 'Nosač motora (demo)', 'RN-2026-DEMO5502-A', 'CR-5502',
   'Ulazna kontrola', 'Ulazna kontrola', 1, 50, 5,
   'Ukupna dužina', 'Merljiva', 'Major', 245, 245.5, 244.5, 'mm', 'Mikrometar 0-25mm',
   5, 'Korekcija', 'DEMO-5502.jpg'),
  ('vozilo1', 1, 'DEMO-5502', 'Nosač motora (demo)', 'RN-2026-DEMO5502-A', 'CR-5502',
   'Ulazna kontrola', 'Ulazna kontrola', 1, 50, 5,
   'Oštećenje površine', 'Atributivna', 'Major', NULL, NULL, NULL, NULL, 'Vizuelno',
   NULL, 'Sortiranje', 'DEMO-5502.jpg'),
  ('vozilo1', 2, 'MRAP-001', 'MRAP komplet (demo)', 'RN-2026-MRAP001-F', 'MRAP-FIN',
   'Završna', 'Finalna kontrola', 1, 1, 5,
   'Finalna vizuelna kontrola celog vozila', 'Atributivna', 'Critical', NULL, NULL, NULL, NULL, 'Vizuelno',
   NULL, 'Zaustavi proces', 'MRAP_SOP.jpg');

NOTIFY pgrst, 'reload schema';
