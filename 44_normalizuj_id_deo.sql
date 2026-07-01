-- Normalizacija id_deo: Excel cesto unese unicode crticu umesto ASCII "-"
-- Pokreni u Supabase SQL Editoru (jednom)

UPDATE glavni_unos_redovi
SET id_deo = upper(regexp_replace(replace(replace(id_deo, E'\u2013', '-'), E'\u2014', '-'), '\s', '', 'g'))
WHERE id_deo IS NOT NULL
  AND id_deo ~ E'[\u2010-\u2015\u2212]';

UPDATE karakteristike_merljive
SET id_deo = upper(regexp_replace(replace(replace(id_deo, E'\u2013', '-'), E'\u2014', '-'), '\s', '', 'g'))
WHERE id_deo IS NOT NULL
  AND id_deo ~ E'[\u2010-\u2015\u2212]';

UPDATE sop_deo_varijabilni
SET id_deo = upper(regexp_replace(replace(replace(id_deo, E'\u2013', '-'), E'\u2014', '-'), '\s', '', 'g'))
WHERE id_deo IS NOT NULL
  AND id_deo ~ E'[\u2010-\u2015\u2212]';

-- Demo DEMO-NM-001 (samo ako jos nema u Osnovnom)
INSERT INTO glavni_unos_redovi (
  sheet_naziv, redosled, id_deo, naziv_dela, radni_nalog, broj_crteza,
  linija, operacija, masina_id, ukupno_kom, kom_za_kontrolu_n,
  karakteristika, tip, klasa, nominal, usl, lsl, jedinica, instrument,
  spc_broj_merenja, reakcioni_plan, slika
)
SELECT 'vozilo1', 100, 'DEMO-NM-001', 'Nosac motora (demo NM)', 'RN-2026-DEMONM001-A', 'CR-NM001',
  'Ulazna kontrola', 'Ulazna kontrola', 1, 50, 5,
  'Ukupna duzina', 'Merljiva', 'Major', 230, 230.2, 229.8, 'mm', 'Pomicno merilo',
  5, 'Korekcija', 'NM-01.png'
WHERE NOT EXISTS (SELECT 1 FROM glavni_unos_redovi WHERE id_deo = 'DEMO-NM-001');

INSERT INTO glavni_unos_redovi (
  sheet_naziv, redosled, id_deo, naziv_dela, radni_nalog, broj_crteza,
  linija, operacija, masina_id, ukupno_kom, kom_za_kontrolu_n,
  karakteristika, tip, klasa, nominal, usl, lsl, jedinica, instrument,
  spc_broj_merenja, reakcioni_plan, slika
)
SELECT 'vozilo1', 101, 'DEMO-NM-001', 'Nosac motora (demo NM)', 'RN-2026-DEMONM001-A', 'CR-NM001',
  'Ulazna kontrola', 'Ulazna kontrola', 1, 50, 5,
  'Pravougaonost', 'Merljiva', 'Major', 90, 444444, 440000, 'stepen', 'Uglomer',
  5, 'Korekcija', 'NM-01.png'
WHERE NOT EXISTS (
  SELECT 1 FROM glavni_unos_redovi
  WHERE id_deo = 'DEMO-NM-001' AND karakteristika = 'Pravougaonost'
);

NOTIFY pgrst, 'reload schema';
