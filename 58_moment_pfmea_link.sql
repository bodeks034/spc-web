-- Veza moment korak ↔ PFMEA (QS-TRQ-001)
-- Pokreni posle 54_crtez_assets_moment.sql i 48_pfmea_control_plan.sql

ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS pfmea_veza TEXT;
ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS pfmea_stavka_id BIGINT REFERENCES pfmea_stavke(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moment_korak_pfmea_stavka ON moment_korak(pfmea_stavka_id) WHERE pfmea_stavka_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moment_korak_pfmea_veza ON moment_korak(pfmea_veza) WHERE pfmea_veza IS NOT NULL;

NOTIFY pgrst, 'reload schema';
