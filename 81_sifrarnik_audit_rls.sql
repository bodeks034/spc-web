-- RLS za audit log šifrarnika (posle 80_sifrarnik_audit.sql)

ALTER TABLE public.sifrarnik_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_sifrarnik_audit" ON public.sifrarnik_audit;
CREATE POLICY "auth_read_sifrarnik_audit" ON public.sifrarnik_audit
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth_insert_sifrarnik_audit" ON public.sifrarnik_audit;
CREATE POLICY "auth_insert_sifrarnik_audit" ON public.sifrarnik_audit
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.sifrarnik_audit TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sifrarnik_audit_id_seq TO authenticated;
