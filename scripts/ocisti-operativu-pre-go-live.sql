-- =============================================================================
-- SPC Web — čišćenje OPERATIVNIH podataka pre go-live (nova firma / prazna fabrika)
--
-- Pokreni u Supabase SQL Editoru (postgres / service uloga) ILI:
--   npm run db:ocisti-operativu -- --potvrdi          (briše i 8D/PFMEA)
--   npm run db:ocisti-operativu:qms -- --potvrdi    (zadrži PFMEA/8D šablone)
--
-- PRE pokretanja (obavezno):
--   npm run backup:db
--   npm run backup:storage
--
-- ŠTA OSTAJE (šifrarnik — ručno obriši demo delove u Modulu 0 po potrebi):
--   delovi, karakteristike_merljive, sop_deo_varijabilni, delovi_atributivni_pogon
--   greske_katalog, defekti, katalog_gresaka_vozilo, radni_nalozi, radnici
--   linije, masine, smene, kupci, merila, kalibracije
--   glavni_unos_redovi, glavni_unos_sheetovi, pogon_linija_mapa
--   tipovi_vozila, barkod_profili, sifrarnik_liste_vrednosti
--   crtez_assets, moment_job, moment_pozicija, moment_korak (MOMENT master)
--   kontrolni_plan, kontrolna_lista_stavke, msa_kalendar (bez studija)
--   spc_baseline, ciljevi
--   ERP master: dobavljaci, materijali, radni_centri, operacije, sastavnica, …
--   app_licenca, licenca_uredjaji, app_podesavanja, auth.users
--
-- ŠTA SE BRIŠE (operativa / istorija / QMS rad):
--   merenja, log, KPI, FAI, alarmi, eskalacije, NCR, 8D, PFMEA/CP dokumenti
--   moment_protokol, prijemna kontrola, MSA studije, ERP uvoz log, auto log, …
--
-- POSLE SQL-a (ručno):
--   1) Storage → bucket spc-excel-sync — obriši kontrolni_log.xlsx (i ostale mirror fajlove)
--   2) Storage → spc-crtezi — obriši demo crteže ako ne trebaju (šifrarnik putanje ostaju)
--   3) Na tabletima: Admin → Offline red → isprazni; Ctrl+F5
--
-- Opciono (odkomentariši na dnu): radni_nalozi, demo delovi, spc_baseline
--
-- Varijanta koja ZADRŽAVA PFMEA/8D: scripts/ocisti-operativu-zadrzi-qms.sql
-- =============================================================================

-- ── 0) Provera PRE (broj redova) ─────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  n bigint;
BEGIN
  RAISE NOTICE '=== PRE brisanja ===';
  FOR r IN
    SELECT unnest(ARRAY[
      'merenja_varijabilna', 'kontrolni_log', 'kpi_unos', 'fai_unosi',
      'spc_alarmi', 'eskalacije', 'ncr_capa', 'osmd_izvestaji',
      'pfmea_cp_dokumenti', 'moment_protokol'
    ]) AS tabela
  LOOP
    IF to_regclass('public.' || r.tabela) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM %I', r.tabela) INTO n;
      RAISE NOTICE '% : % redova', r.tabela, n;
    END IF;
  END LOOP;
END $$;

-- ── 1) Brisanje (transakcija) ────────────────────────────────────────────────
-- U SQL Editoru: selektuj samo blok BEGIN…COMMIT ispod i pokreni Run.

BEGIN;

-- MSA kalendar: odveži studije pre brisanja gage_rr_studije
UPDATE msa_kalendar SET poslednja_studija_id = NULL WHERE poslednja_studija_id IS NOT NULL;

-- QMS / alarmi (redosled zbog FK)
DO $$ BEGIN
  IF to_regclass('public.ncr_capa') IS NOT NULL THEN DELETE FROM ncr_capa; END IF;
  IF to_regclass('public.karantin_lotovi') IS NOT NULL THEN DELETE FROM karantin_lotovi; END IF;
  IF to_regclass('public.spc_alarmi') IS NOT NULL THEN DELETE FROM spc_alarmi; END IF;
  IF to_regclass('public.eskalacije') IS NOT NULL THEN DELETE FROM eskalacije; END IF;
END $$;

-- Unos sa linije
TRUNCATE TABLE merenja_varijabilna RESTART IDENTITY;
TRUNCATE TABLE kontrolni_log RESTART IDENTITY;
TRUNCATE TABLE kpi_unos RESTART IDENTITY;
TRUNCATE TABLE fai_unosi RESTART IDENTITY;

-- MOMENT — samo protokol sa linije (master job/korak ostaje)
DO $$ BEGIN
  IF to_regclass('public.moment_protokol') IS NOT NULL THEN
    TRUNCATE TABLE moment_protokol RESTART IDENTITY;
  END IF;
END $$;

-- Legacy SOP unosi (ako tabela postoji)
DO $$ BEGIN
  IF to_regclass('public.sop_unosi') IS NOT NULL THEN
    TRUNCATE TABLE sop_unosi RESTART IDENTITY;
  END IF;
END $$;

-- Ček-liste — log popunjavanja (stavke šablona ostaju u kontrolna_lista_stavke)
TRUNCATE TABLE kontrolna_lista_log RESTART IDENTITY;

-- MSA studije
TRUNCATE TABLE gage_rr_studije RESTART IDENTITY;

-- 8D + PFMEA/CP (operativni QMS dokumenti — veze u moment_korak → SET NULL)
DO $$ BEGIN
  IF to_regclass('public.osmd_izvestaji') IS NOT NULL THEN DELETE FROM osmd_izvestaji; END IF;
  IF to_regclass('public.pfmea_cp_dokumenti') IS NOT NULL THEN DELETE FROM pfmea_cp_dokumenti; END IF;
END $$;

-- Prijem dobavljača + ocene
DO $$ BEGIN
  IF to_regclass('public.prijemna_kontrola_dobavljaca') IS NOT NULL THEN
    DELETE FROM prijemna_kontrola_dobavljaca;
  END IF;
  IF to_regclass('public.ocene_dobavljaca') IS NOT NULL THEN
    DELETE FROM ocene_dobavljaca;
  END IF;
END $$;

-- Analitičke / izveštajne tabele (Excel import ostaci)
DO $$ BEGIN
  IF to_regclass('public.analiza_kontrolor') IS NOT NULL THEN TRUNCATE analiza_kontrolor RESTART IDENTITY; END IF;
  IF to_regclass('public.analiza_masina') IS NOT NULL THEN TRUNCATE analiza_masina RESTART IDENTITY; END IF;
  IF to_regclass('public.analiza_smena') IS NOT NULL THEN TRUNCATE analiza_smena RESTART IDENTITY; END IF;
  IF to_regclass('public.dpmo') IS NOT NULL THEN TRUNCATE dpmo RESTART IDENTITY; END IF;
  IF to_regclass('public.pareto') IS NOT NULL THEN TRUNCATE pareto RESTART IDENTITY; END IF;
END $$;

-- Operativni zahtevi (kalibracija / prekid — ne briše merila ni radnike)
DELETE FROM kalibracija_zahtevi;
DO $$ BEGIN
  IF to_regclass('public.prekidi_zahtevi') IS NOT NULL THEN
    DELETE FROM prekidi_zahtevi;
  END IF;
END $$;

-- Revizije granica / kontrolnog plana (istorija — master ostaje)
DO $$ BEGIN
  IF to_regclass('public.karakteristike_revizija') IS NOT NULL THEN DELETE FROM karakteristike_revizija; END IF;
  IF to_regclass('public.kontrolni_plan_revizija') IS NOT NULL THEN DELETE FROM kontrolni_plan_revizija; END IF;
END $$;

-- ERP uvoz log (master tabele dobavljaci/materijali ostaju)
DO $$ BEGIN
  IF to_regclass('public.erp_uvoz_reject') IS NOT NULL THEN DELETE FROM erp_uvoz_reject; END IF;
  IF to_regclass('public.erp_uvoz_batch') IS NOT NULL THEN DELETE FROM erp_uvoz_batch; END IF;
  IF to_regclass('public.erp_uvoz_log') IS NOT NULL THEN DELETE FROM erp_uvoz_log; END IF;
END $$;

-- Automatizacija / obaveštenja
DO $$ BEGIN
  IF to_regclass('public.auto_akcije_log') IS NOT NULL THEN DELETE FROM auto_akcije_log; END IF;
  IF to_regclass('public.auto_run_log') IS NOT NULL THEN DELETE FROM auto_run_log; END IF;
  IF to_regclass('public.notifikacije_log') IS NOT NULL THEN DELETE FROM notifikacije_log; END IF;
END $$;

-- Sekvence ID (eksplicitno na glavnim tabelama)
SELECT setval(pg_get_serial_sequence('merenja_varijabilna', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('kontrolni_log', 'id'), 1, false);
DO $$ BEGIN
  IF pg_get_serial_sequence('ncr_capa', 'id') IS NOT NULL THEN
    PERFORM setval(pg_get_serial_sequence('ncr_capa', 'id'), 1, false);
  END IF;
END $$;

COMMIT;

-- ── 2) Provera POSLE ─────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  n bigint;
BEGIN
  RAISE NOTICE '=== POSLE brisanja ===';
  FOR r IN
    SELECT unnest(ARRAY[
      'merenja_varijabilna', 'kontrolni_log', 'kpi_unos', 'fai_unosi',
      'spc_alarmi', 'eskalacije', 'ncr_capa', 'osmd_izvestaji',
      'pfmea_cp_dokumenti', 'moment_protokol', 'delovi', 'karakteristike_merljive'
    ]) AS tabela
  LOOP
    IF to_regclass('public.' || r.tabela) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM %I', r.tabela) INTO n;
      RAISE NOTICE '% : % redova', r.tabela, n;
    END IF;
  END LOOP;
END $$;

-- ── 3) OPCIONO — odkomentariši po potrebi ─────────────────────────────────────

-- A) Obriši sve radne naloge (ERP će ih ponovo uvesti)
-- BEGIN;
-- DELETE FROM radni_nalozi;
-- COMMIT;

-- B) Obriši demo delove iz šifrarnika (primer — prilagodi liste)
-- BEGIN;
-- DELETE FROM karakteristike_merljive WHERE id_deo IN ('DEMO-001', 'DEMO-5502', 'MRAP-001');
-- DELETE FROM delovi_atributivni_pogon WHERE id_deo IN ('DEMO-001', 'DEMO-5502', 'MRAP-001');
-- DELETE FROM sop_deo_varijabilni WHERE id_deo IN ('DEMO-001', 'DEMO-5502', 'MRAP-001');
-- DELETE FROM moment_job WHERE id_deo IN ('DEMO-001', 'DEMO-5502', 'MRAP-001');
-- DELETE FROM delovi WHERE id_deo IN ('DEMO-001', 'DEMO-5502', 'MRAP-001');
-- COMMIT;

-- C) Reset SPC baseline (odobrene granice karti)
-- BEGIN;
-- DELETE FROM spc_baseline;
-- COMMIT;

-- D) Serijski brojevi / trasabilitet lotova (ako koristite tabele iz ERP mastera)
-- BEGIN;
-- DELETE FROM serijski_brojevi;
-- DELETE FROM serije;
-- COMMIT;

NOTIFY pgrst, 'reload schema';
