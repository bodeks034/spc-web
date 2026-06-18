-- =============================================================================
-- Čišćenje pogrešnog pogon_kod za 5502-A i NT-001
-- Pokreni u Supabase SQL Editoru (Run kao postgres).
--
-- Uzrok: migracija 40_karakteristike_unique_pogon.sql je prazan pogon postavila
-- na 'A', pa se Preseraj (B) i Karoserija (C) mešaju sa Ulaznom (A).
-- Za 5502-A: pogon iz glavnog unosa (trenutno G = Mašinska obrada, nema Preseraja).
--
-- Posle skripte: Ctrl+F5 u aplikaciji.
-- Za puni uvoz iz CSV: npm run sync:glavni-unos:import (cmd)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. DIJAGNOSTIKA (pokreni pre izmene — kopiraj rezultat ako treba podrška)
-- -----------------------------------------------------------------------------
-- SELECT id_deo, pogon_kod, COUNT(*) AS redova
-- FROM karakteristike_merljive
-- WHERE id_deo IN ('5502-A', 'NT-001')
-- GROUP BY 1, 2
-- ORDER BY 1, 2;
--
-- SELECT id_deo, pogon_kod, sifra_merenja, pozicija, radni_nalog, linija_faza
-- FROM karakteristike_merljive
-- WHERE id_deo IN ('5502-A', 'NT-001')
-- ORDER BY id_deo, pogon_kod, sifra_merenja, pozicija;
--
-- SELECT * FROM sop_deo_varijabilni
-- WHERE id_deo IN ('5502-A', 'NT-001')
-- ORDER BY id_deo, pogon_kod;

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Očekivani pogon (RN sufiks → linija_faza)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _kar_pogon_fix ON COMMIT DROP AS
SELECT
  k.id,
  k.id_deo,
  k.pogon_kod AS stari_pogon,
  k.sifra_merenja,
  k.pozicija,
  COALESCE(
    NULLIF(UPPER(substring(TRIM(k.radni_nalog) FROM '-([A-H])$')), ''),
    CASE TRIM(k.linija_faza)
      WHEN 'Ulazna kontrola' THEN 'A'
      WHEN 'Preseraj'          THEN 'B'
      WHEN 'Karoserija'        THEN 'C'
      WHEN 'Lakirnica'         THEN 'D'
      WHEN 'Montaža'           THEN 'E'
      WHEN 'Montaza'           THEN 'E'
      WHEN 'Završna'           THEN 'F'
      WHEN 'Zavrsna'           THEN 'F'
      WHEN 'Mašinska obrada'   THEN 'G'
      WHEN 'Masinska obrada'   THEN 'G'
      WHEN 'Alatnica'          THEN 'H'
    END,
    NULLIF(UPPER(TRIM(k.pogon_kod)), '')
  ) AS novi_pogon
FROM karakteristike_merljive k
WHERE k.id_deo IN ('5502-A', 'NT-001');

-- -----------------------------------------------------------------------------
-- 2. Duplikati: obriši red na pogrešnom pogonu ako isti ključ već postoji na dobrom
--    (UNIQUE: id_deo, pogon_kod, sifra_merenja, pozicija)
-- -----------------------------------------------------------------------------
DELETE FROM karakteristike_merljive k
USING _kar_pogon_fix f
WHERE k.id = f.id
  AND f.stari_pogon IS DISTINCT FROM f.novi_pogon
  AND f.novi_pogon IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM karakteristike_merljive k2
    WHERE k2.id_deo = f.id_deo
      AND k2.pogon_kod = f.novi_pogon
      AND k2.sifra_merenja = f.sifra_merenja
      AND k2.pozicija = f.pozicija
      AND k2.id <> k.id
  );

-- -----------------------------------------------------------------------------
-- 3. Ispravi pogon_kod na karakteristikama
-- -----------------------------------------------------------------------------
UPDATE karakteristike_merljive k
SET pogon_kod = f.novi_pogon
FROM _kar_pogon_fix f
WHERE k.id = f.id
  AND f.novi_pogon IS NOT NULL
  AND k.pogon_kod IS DISTINCT FROM f.novi_pogon;

-- -----------------------------------------------------------------------------
-- 4. SOP — ukloni fantomske pogone bez karakteristika (npr. stari Preseraj za 5502-A)
-- -----------------------------------------------------------------------------
DELETE FROM sop_deo_varijabilni
WHERE id_deo = '5502-A'
  AND pogon_kod NOT IN (
    SELECT DISTINCT pogon_kod FROM karakteristike_merljive
    WHERE id_deo = '5502-A' AND pogon_kod IS NOT NULL AND TRIM(pogon_kod) <> ''
  );

-- NT-001 SOP: uskladi RN sa sufiksom pogona (ne briše D–H bez merljivih)
UPDATE sop_deo_varijabilni s
SET radni_nalog = 'RN-2026-NT001-' || s.pogon_kod
WHERE s.id_deo = 'NT-001'
  AND s.pogon_kod ~ '^[A-H]$'
  AND s.radni_nalog IS DISTINCT FROM ('RN-2026-NT001-' || s.pogon_kod);

-- -----------------------------------------------------------------------------
-- 5. Atributivni pogon — samo pogoni koji postoje u karakteristikama
-- -----------------------------------------------------------------------------
DELETE FROM delovi_atributivni_pogon
WHERE id_deo = '5502-A'
  AND pogon_kod NOT IN (
    SELECT DISTINCT pogon_kod FROM karakteristike_merljive
    WHERE id_deo = '5502-A' AND pogon_kod IS NOT NULL AND TRIM(pogon_kod) <> ''
  );

-- -----------------------------------------------------------------------------
-- 6. Merenja — uskladi pogon sa karakteristikom (ako postoje stara merenja)
-- -----------------------------------------------------------------------------
UPDATE merenja_varijabilna m
SET pogon_kod = k.pogon_kod
FROM karakteristike_merljive k
WHERE m.karakteristika_id = k.id
  AND m.id_deo IN ('5502-A', 'NT-001')
  AND m.pogon_kod IS DISTINCT FROM k.pogon_kod;

UPDATE merenja_varijabilna m
SET pogon_kod = f.novi_pogon
FROM _kar_pogon_fix f
WHERE m.id_deo = f.id_deo
  AND m.sifra_merenja = f.sifra_merenja
  AND m.pozicija = f.pozicija
  AND m.karakteristika_id IS NULL
  AND f.novi_pogon IS NOT NULL
  AND m.pogon_kod IS DISTINCT FROM f.novi_pogon;

COMMIT;

-- -----------------------------------------------------------------------------
-- 7. PROVERA (očekivano)
-- -----------------------------------------------------------------------------
-- 5502-A: samo pogoni iz karakteristika (npr. G = Mašinska obrada)
SELECT id_deo, pogon_kod, sifra_merenja, COUNT(*) AS dimenzija
FROM karakteristike_merljive
WHERE id_deo = '5502-A'
GROUP BY 1, 2, 3
ORDER BY 3;

-- NT-001 | A: serija 1–2, B: 1–3, C: 1–3, F: 1 (bez mešanja na A)
SELECT id_deo, pogon_kod, sifra_merenja, COUNT(*) AS dimenzija
FROM karakteristike_merljive
WHERE id_deo = 'NT-001'
GROUP BY 1, 2, 3
ORDER BY 2, 3;

-- Pogoni koji NE odgovaraju RN (treba 0 redova)
SELECT k.id, k.id_deo, k.pogon_kod, k.radni_nalog, k.linija_faza, k.pozicija
FROM karakteristike_merljive k
WHERE k.id_deo IN ('5502-A', 'NT-001')
  AND k.radni_nalog ~ '-[A-H]$'
  AND k.pogon_kod IS DISTINCT FROM UPPER(substring(TRIM(k.radni_nalog) FROM '-([A-H])$'))
  AND k.id_deo <> '5502-A';

SELECT id_deo, pogon_kod, radni_nalog, linija
FROM sop_deo_varijabilni
WHERE id_deo IN ('5502-A', 'NT-001')
ORDER BY id_deo, pogon_kod;

NOTIFY pgrst, 'reload schema';
