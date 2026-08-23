-- Uže RLS za audit log — samo kvalitet, šef, admin (posle 81_sifrarnik_audit_rls.sql)

CREATE OR REPLACE FUNCTION public.sifrarnik_audit_moze_pristup()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM radnici r
    WHERE r.user_id = auth.uid()
      AND r.uloga IN ('admin', 'kvalitet', 'sef')
      AND COALESCE(r.aktivan, true)
  );
$$;

DROP POLICY IF EXISTS "auth_read_sifrarnik_audit" ON public.sifrarnik_audit;
CREATE POLICY "auth_read_sifrarnik_audit" ON public.sifrarnik_audit
  FOR SELECT TO authenticated
  USING (public.sifrarnik_audit_moze_pristup());

DROP POLICY IF EXISTS "auth_insert_sifrarnik_audit" ON public.sifrarnik_audit;
CREATE POLICY "auth_insert_sifrarnik_audit" ON public.sifrarnik_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.sifrarnik_audit_moze_pristup());

GRANT EXECUTE ON FUNCTION public.sifrarnik_audit_moze_pristup() TO authenticated;
