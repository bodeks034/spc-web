-- ============================================================
-- Poveži Supabase Auth (auth.users) ↔ radnici.user_id
-- Pokreni u Supabase SQL Editoru
-- ============================================================

-- 1) Pregled: ko je povezan, ko nije
SELECT
  r.id          AS radnik_id,
  r.ime,
  r.uloga,
  r.email       AS email_radnici,
  r.user_id,
  u.id          AS auth_uid,
  u.email       AS email_auth,
  CASE
    WHEN r.user_id IS NULL AND u.id IS NOT NULL THEN 'MOŽE SE POVEZATI (email match)'
    WHEN r.user_id = u.id THEN 'OK'
    WHEN r.user_id IS NOT NULL AND u.id IS NULL THEN 'user_id u radnicima ali nema Auth naloga'
    WHEN r.user_id IS NOT NULL AND r.user_id <> u.id THEN 'KONFLIKT — pogrešan user_id'
    ELSE 'Nema Auth naloga sa istim emailom'
  END AS status
FROM radnici r
LEFT JOIN auth.users u ON lower(trim(u.email)) = lower(trim(r.email))
ORDER BY r.id;

-- 2) Automatsko povezivanje po emailu (preporučeno)
UPDATE radnici r
SET
  user_id = u.id,
  email   = lower(trim(u.email))
FROM auth.users u
WHERE lower(trim(r.email)) = lower(trim(u.email))
  AND r.user_id IS NULL;

-- 3) Ručno za jednog radnika (zameni vrednosti):
-- UPDATE radnici
-- SET user_id = 'PASTE-UUID-IZ-AUTH-USERS'::uuid,
--     email   = 'pera@fabrika.com'
-- WHERE id = 4;

-- 4) Reset pa ponovo povezivanje (ako je pogrešno vezano):
-- UPDATE radnici SET user_id = NULL WHERE id = 4;

NOTIFY pgrst, 'reload schema';
