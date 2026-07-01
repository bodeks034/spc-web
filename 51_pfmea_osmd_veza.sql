-- Veza PFMEA/CP dokumenta sa 8D izveštajem
ALTER TABLE pfmea_cp_dokumenti ADD COLUMN IF NOT EXISTS osmd_izvestaj_id BIGINT REFERENCES osmd_izvestaji(id) ON DELETE SET NULL;
ALTER TABLE pfmea_cp_dokumenti ADD COLUMN IF NOT EXISTS broj_8d TEXT;

CREATE INDEX IF NOT EXISTS idx_pfmea_cp_osmd ON pfmea_cp_dokumenti(osmd_izvestaj_id) WHERE osmd_izvestaj_id IS NOT NULL;
