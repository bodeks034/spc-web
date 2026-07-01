-- Zaglavlje 8D izveštaja (reklamacija kupca, artikal, datumi…)
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS broj_8d TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS broj_reklamacije TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS kupac_ime_id TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS kupac_lokacija TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS kupac_kontakt TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS artikal_naziv_sifra TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS lot_serijski TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS otpremnica_rn TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS kolicina_reklamacije TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS datum_prijema_reklamacije DATE;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS datum_otvaranja_8d DATE;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS datum_cilj_zatvaranja DATE;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS klasa_greske TEXT;
ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS bezbednost_problem TEXT;
