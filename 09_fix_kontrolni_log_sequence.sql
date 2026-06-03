-- ============================================================
-- Fix: duplicate key na kontrolni_log.id posle CSV importa
-- Pokreni u Supabase SQL Editoru
-- ============================================================

-- Sekvenca mora biti > MAX(id) posle ručnog/CSV upsert-a sa eksplicitnim id
SELECT setval(
  pg_get_serial_sequence('kontrolni_log', 'id'),
  COALESCE((SELECT MAX(id) FROM kontrolni_log), 1),
  (SELECT COUNT(*) > 0 FROM kontrolni_log)
);

SELECT setval(
  pg_get_serial_sequence('radnici', 'id'),
  COALESCE((SELECT MAX(id) FROM radnici), 1),
  (SELECT COUNT(*) > 0 FROM radnici)
);

-- Opciono: reset user_id da se ponovo veže pri loginu (odkomentariši po potrebi)
-- UPDATE radnici SET user_id = NULL WHERE email LIKE '%@fabrika.com';

NOTIFY pgrst, 'reload schema';
