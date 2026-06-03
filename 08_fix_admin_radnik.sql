-- ============================================================
-- Ispravka admin + svi radnici na @fabrika.com (pokreni u SQL Editoru)
-- ============================================================

-- Svi postojeći @fabrika.rs → @fabrika.com
UPDATE radnici SET email = REPLACE(email, '@fabrika.rs', '@fabrika.com')
WHERE email LIKE '%@fabrika.rs';

UPDATE radnici SET
  uloga = 'admin',
  email = 'admin@fabrika.com',
  aktivan = true,
  napomena = COALESCE(napomena, 'Sistem administrator')
WHERE id = 5
   OR ime ILIKE 'ADMIN'
   OR email ILIKE 'admin@fabrika.com'
   OR email ILIKE 'admin@fabrika.rs';

-- Ako je user_id pogrešno vezan, resetuj pa se ponovo uloguj sa admin@fabrika.com
-- UPDATE radnici SET user_id = NULL WHERE email ILIKE 'admin@fabrika.com';

INSERT INTO radnici (id, ime, uloga, email, aktivan, napomena) VALUES
  (1, 'PETROVIC DRAGOMIR', 'kontrolor', 'petrovic@fabrika.com', true, NULL),
  (2, 'KIKA KON', 'kontrolor', 'kika@fabrika.com', true, NULL),
  (3, 'MIKA KON', 'kontrolor', 'mika@fabrika.com', true, NULL),
  (4, 'PERA OPERATER', 'operator', 'pera@fabrika.com', true, NULL),
  (5, 'ADMIN', 'admin', 'admin@fabrika.com', true, 'Sistem administrator')
ON CONFLICT (id) DO UPDATE SET
  ime = EXCLUDED.ime,
  uloga = EXCLUDED.uloga,
  email = EXCLUDED.email,
  aktivan = true;

-- Kolone koje app koristi za zahtev prekida
ALTER TABLE prekidi_zahtevi ADD COLUMN IF NOT EXISTS naziv_dela TEXT;
ALTER TABLE prekidi_zahtevi ADD COLUMN IF NOT EXISTS cilj INT;
ALTER TABLE prekidi_zahtevi ADD COLUMN IF NOT EXISTS admin_id INT REFERENCES radnici(id);
ALTER TABLE prekidi_zahtevi ADD COLUMN IF NOT EXISTS napomena TEXT;
ALTER TABLE prekidi_zahtevi ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sekvenca kontrolni_log (posle CSV importa sa id 1,2,3…)
SELECT setval(
  pg_get_serial_sequence('kontrolni_log', 'id'),
  COALESCE((SELECT MAX(id) FROM kontrolni_log), 1),
  (SELECT COUNT(*) > 0 FROM kontrolni_log)
);

CREATE OR REPLACE FUNCTION public.sync_kontrolni_log_seq()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT setval(
    pg_get_serial_sequence('kontrolni_log', 'id'),
    COALESCE((SELECT MAX(id) FROM kontrolni_log), 1),
    (SELECT COUNT(*) > 0 FROM kontrolni_log)
  );
$$;

GRANT EXECUTE ON FUNCTION public.sync_kontrolni_log_seq() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
