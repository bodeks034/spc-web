-- Kupac u glavnom unosu (propagira se u radni_nalozi)
ALTER TABLE glavni_unos_redovi ADD COLUMN IF NOT EXISTS kupac TEXT;

NOTIFY pgrst, 'reload schema';
