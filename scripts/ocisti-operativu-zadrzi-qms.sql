-- =============================================================================
-- SPC Web — čišćenje operativnih podataka, ZADRŽAVA PFMEA/8D šablone
--
-- Varijanta od ocisti-operativu-pre-go-live.sql — ista operativa sa linije,
-- ali NE briše:
--   osmd_izvestaji (8D šabloni / reference)
--   pfmea_cp_dokumenti (+ pfmea_stavke, control_plan_stavke)
--
-- Pokreni u Supabase SQL Editoru ILI:
--   npm run db:ocisti-operativu:qms -- --potvrdi
--
-- PRE pokretanja (obavezno):
--   npm run backup:db
--   npm run backup:storage
--
-- Za potpuno brisanje i QMS dokumenata koristi:
--   scripts/ocisti-operativu-pre-go-live.sql
--   npm run db:ocisti-operativu -- --potvrdi
--
-- ŠTA OSTAJE (pored punog šifrarnika):
--   8D izveštaji, PFMEA/Control Plan dokumenti i stavke
--   moment_job / moment_korak veze ka PFMEA/CP ostaju netaknute
--
-- ŠTA SE BRIŠE (isto kao puni režim, osim 8D/PFMEA):
--   merenja, log, KPI, FAI, alarmi, eskalacije, NCR (otvoreni slučajevi)
--   moment_protokol, prijemna kontrola, MSA studije, logovi, …
--
-- NAPOMENA: NCR zapisi se brišu — veza NCR → 8D/PFMEA nestaje sa NCR-om,
-- ali sami 8D/PFMEA dokumenti ostaju u bazi.
-- =============================================================================

-- ── 0) Provera PRE ───────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  n bigint;
BEGIN
  RAISE NOTICE '=== PRE brisanja (zadrzi QMS) ===';
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

-- ── 1) Brisanje ──────────────────────────────────────────────────────────────
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.msa_kalendar') IS NOT NULL THEN
    UPDATE msa_kalendar SET poslednja_studija_id = NULL WHERE poslednja_studija_id IS NOT NULL;
  END IF;
END $$;

-- NCR + alarmi (8D/PFMEA dokumenti ostaju)
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

DO $$ BEGIN
  IF to_regclass('public.moment_protokol') IS NOT NULL THEN
    TRUNCATE TABLE moment_protokol RESTART IDENTITY;
  END IF;
  IF to_regclass('public.sop_unosi') IS NOT NULL THEN
    TRUNCATE TABLE sop_unosi RESTART IDENTITY;
  END IF;
  IF to_regclass('public.kontrolna_lista_log') IS NOT NULL THEN
    TRUNCATE TABLE kontrolna_lista_log RESTART IDENTITY;
  END IF;
  IF to_regclass('public.gage_rr_studije') IS NOT NULL THEN
    TRUNCATE TABLE gage_rr_studije RESTART IDENTITY;
  END IF;
END $$;

-- PFMEA/8D — NE DIRATI (razlika u odnosu na puni režim)

DO $$ BEGIN
  IF to_regclass('public.prijemna_kontrola_dobavljaca') IS NOT NULL THEN
    DELETE FROM prijemna_kontrola_dobavljaca;
  END IF;
  IF to_regclass('public.ocene_dobavljaca') IS NOT NULL THEN
    DELETE FROM ocene_dobavljaca;
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.analiza_kontrolor') IS NOT NULL THEN TRUNCATE analiza_kontrolor RESTART IDENTITY; END IF;
  IF to_regclass('public.analiza_masina') IS NOT NULL THEN TRUNCATE analiza_masina RESTART IDENTITY; END IF;
  IF to_regclass('public.analiza_smena') IS NOT NULL THEN TRUNCATE analiza_smena RESTART IDENTITY; END IF;
  IF to_regclass('public.dpmo') IS NOT NULL THEN TRUNCATE dpmo RESTART IDENTITY; END IF;
  IF to_regclass('public.pareto') IS NOT NULL THEN TRUNCATE pareto RESTART IDENTITY; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.kalibracija_zahtevi') IS NOT NULL THEN DELETE FROM kalibracija_zahtevi; END IF;
  IF to_regclass('public.prekidi_zahtevi') IS NOT NULL THEN DELETE FROM prekidi_zahtevi; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.karakteristike_revizija') IS NOT NULL THEN DELETE FROM karakteristike_revizija; END IF;
  IF to_regclass('public.kontrolni_plan_revizija') IS NOT NULL THEN DELETE FROM kontrolni_plan_revizija; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.erp_uvoz_reject') IS NOT NULL THEN DELETE FROM erp_uvoz_reject; END IF;
  IF to_regclass('public.erp_uvoz_batch') IS NOT NULL THEN DELETE FROM erp_uvoz_batch; END IF;
  IF to_regclass('public.erp_uvoz_log') IS NOT NULL THEN DELETE FROM erp_uvoz_log; END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.auto_akcije_log') IS NOT NULL THEN DELETE FROM auto_akcije_log; END IF;
  IF to_regclass('public.auto_run_log') IS NOT NULL THEN DELETE FROM auto_run_log; END IF;
  IF to_regclass('public.notifikacije_log') IS NOT NULL THEN DELETE FROM notifikacije_log; END IF;
END $$;

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
  RAISE NOTICE '=== POSLE brisanja (zadrzi QMS) ===';
  FOR r IN
    SELECT unnest(ARRAY[
      'merenja_varijabilna', 'kontrolni_log', 'ncr_capa',
      'osmd_izvestaji', 'pfmea_cp_dokumenti', 'delovi', 'karakteristike_merljive'
    ]) AS tabela
  LOOP
    IF to_regclass('public.' || r.tabela) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM %I', r.tabela) INTO n;
      RAISE NOTICE '% : % redova', r.tabela, n;
    END IF;
  END LOOP;
END $$;

-- Opciono: obriši samo demo 8D/PFMEA (zadrži produkcijske šablone)
-- BEGIN;
-- DELETE FROM pfmea_cp_dokumenti WHERE id_deo IN ('DEMO-001', 'MRAP-001');
-- DELETE FROM osmd_izvestaji WHERE id_deo IN ('DEMO-001', 'MRAP-001');
-- COMMIT;

NOTIFY pgrst, 'reload schema';
