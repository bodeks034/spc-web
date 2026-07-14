-- Pilot: JOB „Točkovi“ — primer sekvence (pokreni posle 54_crtez_assets_moment.sql)
-- Dijagram: public/moment/dijagrami/Sklop_05_Tockovi.svg
-- Zameni MRAP1-001 stvarnim id_deo iz vaše baze ako treba.

DO $$
DECLARE
  v_asset_id BIGINT;
  v_job_id BIGINT;
  v_deo TEXT := 'MRAP1-001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM delovi WHERE id_deo = v_deo) THEN
    RAISE NOTICE 'Pilot preskočen — nema dela % u tabeli delovi', v_deo;
    RETURN;
  END IF;

  SELECT id INTO v_asset_id FROM crtez_assets
  WHERE ref_tip = 'moment_job' AND ref_id = 'TOCKOVI' AND revizija = 'A'
  ORDER BY id DESC LIMIT 1;

  IF v_asset_id IS NULL THEN
    INSERT INTO crtez_assets (ref_tip, ref_id, naziv, prikaz_format, prikaz_putanja, revizija, napomena)
    VALUES (
      'moment_job', 'TOCKOVI', 'Sklop točkovi — pilot', 'svg',
      '/moment/dijagrami/Sklop_05_Tockovi.svg', 'A',
      'Javni SVG — DWG izvor opciono u crtezi/izvor/'
    )
    RETURNING id INTO v_asset_id;
  END IF;

  SELECT id INTO v_job_id FROM moment_job
  WHERE id_deo = v_deo AND kod_job = 'Tockovi' AND COALESCE(operacija, '') = 'MON-FINAL' AND revizija = 'A'
  LIMIT 1;

  IF v_job_id IS NULL THEN
    INSERT INTO moment_job (id_deo, kod_job, naziv, operacija, crtez_asset_id, vendor_profil, revizija, napomena)
    VALUES (
      v_deo, 'Tockovi', 'Točkovi, naplaci i geared hub', 'MON-FINAL',
      v_asset_id, 'atlas', 'A', 'Pilot sekvenca — lug nut VSK'
    )
    RETURNING id INTO v_job_id;
  END IF;

  INSERT INTO moment_pozicija (job_id, poz_br, opis, klasifikacija) VALUES
    (v_job_id, '1', 'Lug nut tapered / flanged (8 poz.)', 'VSK'),
    (v_job_id, '3', 'Geared hub access cover', 'STD'),
    (v_job_id, '5', 'Beadlock pinch bolt', 'VSK')
  ON CONFLICT (job_id, poz_br) DO NOTHING;

  INSERT INTO moment_korak (
    job_id, redosled, poz_br, prolaz, tip, cilj_nm, tol_min, tol_max,
    klasifikacija, blokiraj_na_nok, uzorak_obavezan, napomena
  ) VALUES
    (v_job_id, 1, '1', 1, 'NM', 149, 142, 156, 'VSK', TRUE, TRUE, 'Lug nut — 1. prolaz'),
    (v_job_id, 2, '1', 2, 'NM', 149, 142, 156, 'VSK', TRUE, TRUE, 'Lug nut — finalni prolaz'),
    (v_job_id, 3, '3', 1, 'NM', 20, 18, 22, 'STD', FALSE, FALSE, 'Hub access cover')
  ON CONFLICT (job_id, redosled) DO NOTHING;

  RAISE NOTICE 'Pilot moment JOB kreiran za % (job_id=%)', v_deo, v_job_id;
END $$;

NOTIFY pgrst, 'reload schema';
