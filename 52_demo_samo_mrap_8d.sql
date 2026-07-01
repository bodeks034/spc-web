-- Demo reset: zadrži samo 8D 8d-mrap-001-ATR-01, obriši sve PFMEA/CP
-- Pokreni u Supabase SQL Editor (jednokratno za test)

-- 1) Svi PFMEA/CP dokumenti (stavke se brišu CASCADE)
DELETE FROM pfmea_cp_dokumenti;

-- 2) Ostali 8D izveštaji — zadrži samo ciljni broj
DELETE FROM osmd_izvestaji
WHERE COALESCE(broj_8d, '') <> '8d-mrap-001-ATR-01';

-- Provera:
-- SELECT id, broj_8d, id_deo, created_at FROM osmd_izvestaji ORDER BY id;
-- SELECT COUNT(*) FROM pfmea_cp_dokumenti;
