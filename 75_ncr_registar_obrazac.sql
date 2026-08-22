-- NCR Registar + Obrazac (Excel NCR_Registar_i_Obrazac_v2)
-- Pokreni posle 59_ncr_capa.sql

-- Novi workflow statusi (Excel)
ALTER TABLE ncr_capa DROP CONSTRAINT IF EXISTS ncr_capa_status_check;
UPDATE ncr_capa SET status = CASE status
  WHEN 'otvoren' THEN 'open'
  WHEN 'analiza' THEN 'containment'
  WHEN 'akcija' THEN 'disposition'
  WHEN 'verifikacija' THEN 'verification'
  WHEN 'zatvoren' THEN 'closed'
  ELSE status
END WHERE status IN ('otvoren', 'analiza', 'akcija', 'verifikacija', 'zatvoren');

ALTER TABLE ncr_capa ALTER COLUMN status SET DEFAULT 'open';

-- Registar kolone
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS datum_otvaranja DATE;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS pogon TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS masina TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS naziv_dela TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS kupac TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS karakteristika TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS zahtev_spec TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS izmerena_vrednost TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS kolicina_proizvedena INT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS kolicina_sumnjiva INT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS kolicina_neispravna INT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS tip_greske TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS kategorija_6m TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS ozbiljnost TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS ponavljanje TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS prethodni_ncr TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS uticaj_kupca TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS detektovao TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS metoda_detekcije TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS datum_containment DATE;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS containment_mere TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS dispozicija TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS odobrio_dispoziciju TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS osmd_pokrenut BOOLEAN DEFAULT FALSE;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS osmd_broj TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS pfmea_revizija TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS cp_revizija TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS odgovoran TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS verifikacija_efikasnost TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS datum_zatvaranja DATE;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS sra_zavrseno TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS broj_reklamacije TEXT;
ALTER TABLE ncr_capa ADD COLUMN IF NOT EXISTS ncr_prosirenje JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill registra iz postojećih polja
UPDATE ncr_capa SET datum_otvaranja = created_at::date WHERE datum_otvaranja IS NULL;
UPDATE ncr_capa SET containment_mere = korektivna WHERE containment_mere IS NULL AND korektivna IS NOT NULL;
UPDATE ncr_capa SET verifikacija_efikasnost = verifikacija WHERE verifikacija_efikasnost IS NULL AND verifikacija IS NOT NULL;
UPDATE ncr_capa SET ozbiljnost = CASE prioritet
  WHEN 'nizak' THEN 'Low' WHEN 'normalan' THEN 'Medium' WHEN 'visok' THEN 'High' WHEN 'kriticno' THEN 'Critical'
  ELSE ozbiljnost END WHERE ozbiljnost IS NULL;

ALTER TABLE ncr_capa DROP CONSTRAINT IF EXISTS ncr_capa_status_check;
ALTER TABLE ncr_capa ADD CONSTRAINT ncr_capa_status_check CHECK (
  status IN ('open', 'containment', 'disposition', 'osmd_progress', 'verification', 'closed')
);

COMMENT ON COLUMN ncr_capa.ncr_prosirenje IS 'Obrazac sekcije B–H — polja koja nisu u registru';

NOTIFY pgrst, 'reload schema';
