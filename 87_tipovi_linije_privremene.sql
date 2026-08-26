-- Privremene linije vozila (VOZ-01…10) i proizvoda (PRO-01…10) + GU sheetovi.
-- Pokreni posle 86_sifrarnik_mv_scale.sql
-- Idempotentno: ON CONFLICT ažurira naziv/napomenu, ne briše postojeće MRAP/NTV tipove.

BEGIN;

INSERT INTO tipovi_vozila (kod, naziv, prefiks_id_deo, napomena, aktivan) VALUES
  ('VOZ-01', 'Privremeni Vozilo 1',  'VOZ-01', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-02', 'Privremeni Vozilo 2',  'VOZ-02', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-03', 'Privremeni Vozilo 3',  'VOZ-03', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-04', 'Privremeni Vozilo 4',  'VOZ-04', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-05', 'Privremeni Vozilo 5',  'VOZ-05', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-06', 'Privremeni Vozilo 6',  'VOZ-06', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-07', 'Privremeni Vozilo 7',  'VOZ-07', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-08', 'Privremeni Vozilo 8',  'VOZ-08', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-09', 'Privremeni Vozilo 9',  'VOZ-09', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('VOZ-10', 'Privremeni Vozilo 10', 'VOZ-10', 'Privremena linija vozila — preimenuj Naziv kad saznaš pravo ime', true),
  ('PRO-01', 'Privremeni Proizvod 1',  'PRO-01', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-02', 'Privremeni Proizvod 2',  'PRO-02', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-03', 'Privremeni Proizvod 3',  'PRO-03', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-04', 'Privremeni Proizvod 4',  'PRO-04', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-05', 'Privremeni Proizvod 5',  'PRO-05', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-06', 'Privremeni Proizvod 6',  'PRO-06', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-07', 'Privremeni Proizvod 7',  'PRO-07', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-08', 'Privremeni Proizvod 8',  'PRO-08', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-09', 'Privremeni Proizvod 9',  'PRO-09', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true),
  ('PRO-10', 'Privremeni Proizvod 10', 'PRO-10', 'Samostalan proizvod (ne ugrađuje se u vozilo)', true)
ON CONFLICT (kod) DO UPDATE SET
  naziv = EXCLUDED.naziv,
  prefiks_id_deo = EXCLUDED.prefiks_id_deo,
  napomena = EXCLUDED.napomena,
  aktivan = EXCLUDED.aktivan,
  updated_at = NOW();

-- GU sheetovi: _delovi nosi sifra_vozila (ERP veza); _final bez (jedinstveni indeks po šifri).
DO $$
DECLARE
  rec RECORD;
  r INT := 200;
BEGIN
  IF to_regclass('public.glavni_unos_sheetovi') IS NULL THEN
    RAISE NOTICE 'Preskačem sheetove — pokreni 68_erp_glavni_unos_sheetovi.sql';
    RETURN;
  END IF;

  FOR rec IN
    SELECT kod FROM tipovi_vozila
    WHERE kod ~ '^(VOZ|PRO)-[0-9]+$'
    ORDER BY kod
  LOOP
    INSERT INTO glavni_unos_sheetovi (naziv, sifra_vozila, redosled, aktivan)
    VALUES (lower(rec.kod) || '_delovi', rec.kod, r, true)
    ON CONFLICT (naziv) DO UPDATE SET
      sifra_vozila = EXCLUDED.sifra_vozila,
      redosled = EXCLUDED.redosled,
      aktivan = true,
      updated_at = NOW();

    r := r + 1;

    INSERT INTO glavni_unos_sheetovi (naziv, sifra_vozila, redosled, aktivan)
    VALUES (lower(rec.kod) || '_final', NULL, r, true)
    ON CONFLICT (naziv) DO UPDATE SET
      redosled = EXCLUDED.redosled,
      aktivan = true,
      updated_at = NOW();

    r := r + 1;
  END LOOP;
END $$;

INSERT INTO glavni_unos_sheetovi (naziv, sifra_vozila, redosled, aktivan)
VALUES ('opsti_1', NULL, 1, true)
ON CONFLICT (naziv) DO UPDATE SET aktivan = true, updated_at = NOW();

NOTIFY pgrst, 'reload schema';

COMMIT;
