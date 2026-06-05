-- ============================================================
-- Proširi uloge u radnici: kvalitet (inženjer), sef (menadžment)
-- Pokreni u Supabase → SQL Editor (jednom)
-- ============================================================

ALTER TABLE radnici DROP CONSTRAINT IF EXISTS radnici_uloga_check;

ALTER TABLE radnici ADD CONSTRAINT radnici_uloga_check
  CHECK (uloga IN ('operator', 'kontrolor', 'admin', 'kvalitet', 'sef'));

NOTIFY pgrst, 'reload schema';
