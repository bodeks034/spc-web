-- Login ekran zove proveri_licencu() pre auth (anon ključ).
-- Migracija 92 je REVOKE-ovala EXECUTE od anon → "permission denied for function proveri_licencu".
-- Funkcija je SECURITY DEFINER i vraća samo status licence (ne PII).

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'proveri_licencu'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', f.sig);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
