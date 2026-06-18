-- ============================================================
-- Brisanje SVIH unosa merenja / kontrola iz baze
-- Pokreni u Supabase → SQL Editor (service / postgres uloga)
--
-- NE briše: delovi, karakteristike_merljive, radnici, radni_nalozi,
--           sop_deo_varijabilni, spc_baseline (granice karti).
--
-- PRE pokretanja: backup
--   cd C:\mix\spc-web
--   npm run backup:db
-- ============================================================

-- ── 0) Koliko ima (provera) ─────────────────────────────────
SELECT 'merenja_varijabilna' AS tabela, COUNT(*) AS redova FROM merenja_varijabilna
UNION ALL SELECT 'kontrolni_log', COUNT(*) FROM kontrolni_log;

-- Opciono (ako tabele postoje — pokreni posebno):
-- SELECT COUNT(*) FROM kpi_unos;
-- SELECT COUNT(*) FROM fai_unosi;
-- SELECT COUNT(*) FROM spc_alarmi;
-- SELECT COUNT(*) FROM karantin_lotovi;

-- ── 1) SVE — merenja + log + povezani alarmi ────────────────
-- Odkomentariši blok ispod kada si siguran (ukloni /* i */).

/*
BEGIN;

-- Alarmi / karantin (prvo zavisne tabele)
DELETE FROM karantin_lotovi;
DELETE FROM spc_alarmi;

-- Glavni unosi
TRUNCATE TABLE merenja_varijabilna RESTART IDENTITY;
TRUNCATE TABLE kontrolni_log RESTART IDENTITY;

-- KPI sa linije + FAI (ako koristite module)
TRUNCATE TABLE kpi_unos RESTART IDENTITY;
TRUNCATE TABLE fai_unosi RESTART IDENTITY;

-- Sekvence ID (posle TRUNCATE obično 1, ali eksplicitno)
SELECT setval(pg_get_serial_sequence('merenja_varijabilna', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('kontrolni_log', 'id'), 1, false);

COMMIT;
*/

-- ── 2) SAMO jedan deo (primer: DEMO-001) ────────────────────
-- Zameni id_deo i odkomentariši.

/*
BEGIN;

DELETE FROM merenja_varijabilna WHERE id_deo = 'DEMO-001';
DELETE FROM kontrolni_log WHERE id_deo = 'DEMO-001';
DELETE FROM kpi_unos WHERE id_deo = 'DEMO-001';
DELETE FROM fai_unosi WHERE id_deo = 'DEMO-001';
DELETE FROM spc_alarmi WHERE id_deo = 'DEMO-001';
DELETE FROM karantin_lotovi WHERE id_deo = 'DEMO-001';

COMMIT;
*/

-- ── 3) Posle brisanja — ponovna provera ─────────────────────
-- SELECT COUNT(*) FROM merenja_varijabilna;
-- SELECT COUNT(*) FROM kontrolni_log;

-- ── Napomena ────────────────────────────────────────────────
-- Excel mirror u Storage (kontrolni_log.xlsx) se NE briše ovim SQL-om.
-- Storage → bucket spc-excel-sync → obriši ili zameni fajl ručno.
--
-- MSA studije (gage_rr_studije) — odvojeno, po potrebi:
--   TRUNCATE TABLE gage_rr_studije RESTART IDENTITY;
--
-- Ček-liste (kontrolna_lista_log) — odvojeno:
--   TRUNCATE TABLE kontrolna_lista_log RESTART IDENTITY;

NOTIFY pgrst, 'reload schema';
