-- Brojevi PFMEA i Control Plan u zaglavlju 8D + veza na PFMEA/CP dokument
-- Pokreni posle 46_osmd_zaglavlje.sql i 51_pfmea_osmd_veza.sql

ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS broj_pfmea TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS broj_control_plan TEXT;

ALTER TABLE pfmea_cp_dokumenti ADD COLUMN IF NOT EXISTS broj_pfmea TEXT;
ALTER TABLE pfmea_cp_dokumenti ADD COLUMN IF NOT EXISTS broj_control_plan TEXT;

CREATE INDEX IF NOT EXISTS idx_osmd_broj_pfmea ON osmd_izvestaji(broj_pfmea) WHERE broj_pfmea IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pfmea_cp_brojevi ON pfmea_cp_dokumenti(broj_pfmea, broj_control_plan);

NOTIFY pgrst, 'reload schema';
