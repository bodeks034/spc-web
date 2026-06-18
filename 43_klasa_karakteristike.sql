-- AQL klasa greške po dimenziji (Critical / Major / Minor) — prag SPC alarma na liniji
ALTER TABLE karakteristike_merljive
  ADD COLUMN IF NOT EXISTS klasa TEXT;

COMMENT ON COLUMN karakteristike_merljive.klasa IS
  'AQL klasa defekta: Critical, Major, Minor — prag NOK alarma na liniji (20/30/40%).';
