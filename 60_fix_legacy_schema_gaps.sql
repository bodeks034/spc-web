-- Popravka starijih migracija koje nisu u potpunosti primenjene na cloud pilotu
-- Pokreni posle 48_pfmea_control_plan.sql (tabela već postoji)
-- Idempotentno — bezbedno ponoviti

-- 48 — kolona id_deo na dokumentima (starija verzija tabele je mogla biti bez nje)
ALTER TABLE pfmea_cp_dokumenti ADD COLUMN IF NOT EXISTS id_deo TEXT;
CREATE INDEX IF NOT EXISTS idx_pfmea_cp_dok_deo ON pfmea_cp_dokumenti(id_deo, aktivan);

-- 50 — PFMEA nova ocena + odobrenje
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS s_posle TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS o_posle TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS odobrio TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS datum TEXT;

-- 53 — D posle
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS d_posle TEXT;

-- 43 — AQL klasa na merljivim dimenzijama
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS klasa TEXT;
COMMENT ON COLUMN karakteristike_merljive.klasa IS
  'AQL klasa defekta: Critical, Major, Minor — prag NOK alarma na liniji (20/30/40%).';

NOTIFY pgrst, 'reload schema';
