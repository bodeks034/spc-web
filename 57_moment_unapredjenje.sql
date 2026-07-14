-- Moment ključ — proširenje (tool master, torque_id, error kodovi, trasabilitet)
-- Pokreni posle 54_crtez_assets_moment.sql

ALTER TABLE merila ADD COLUMN IF NOT EXISTS tool_kod TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS nm_min NUMERIC;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS nm_max NUMERIC;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS program_kod TEXT;

COMMENT ON COLUMN merila.tool_kod IS 'TK001–TK005 — opseg alata za automatski izbor na liniji';
COMMENT ON COLUMN merila.program_kod IS 'Program na ključu (P001…) — vendor adapter';

ALTER TABLE moment_job ADD COLUMN IF NOT EXISTS dijagram_fajl TEXT;
ALTER TABLE moment_job ADD COLUMN IF NOT EXISTS sekvenca_sablon TEXT;

ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS torque_id TEXT;
ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS tool_kod TEXT;
ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS program_kod TEXT;
ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS vijak TEXT;
ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS klasa_vijka TEXT;
ALTER TABLE moment_korak ADD COLUMN IF NOT EXISTS sklop TEXT;

CREATE INDEX IF NOT EXISTS idx_moment_korak_torque ON moment_korak(torque_id) WHERE torque_id IS NOT NULL;

ALTER TABLE moment_protokol ADD COLUMN IF NOT EXISTS error_kod TEXT;
ALTER TABLE moment_protokol ADD COLUMN IF NOT EXISTS tool_kod TEXT;
ALTER TABLE moment_protokol ADD COLUMN IF NOT EXISTS program_kod TEXT;
ALTER TABLE moment_protokol ADD COLUMN IF NOT EXISTS vin TEXT;
ALTER TABLE moment_protokol ADD COLUMN IF NOT EXISTS torque_id TEXT;

INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES
  ('moment_error_kod', 'E001', 1),
  ('moment_error_kod', 'E002', 2),
  ('moment_error_kod', 'E003', 3),
  ('moment_error_kod', 'E004', 4),
  ('moment_error_kod', 'E005', 5),
  ('moment_error_kod', 'E006', 6),
  ('moment_error_kod', 'E007', 7),
  ('moment_tool_kod', 'TK001', 1),
  ('moment_tool_kod', 'TK002', 2),
  ('moment_tool_kod', 'TK003', 3),
  ('moment_tool_kod', 'TK004', 4),
  ('moment_tool_kod', 'TK005', 5)
ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;

NOTIFY pgrst, 'reload schema';
