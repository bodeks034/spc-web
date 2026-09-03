-- Crash log iz ErrorBoundary — insert za ulogovane, čitanje samo za admina.
-- Pokreni posle 96_storage_crtezi.sql.

CREATE TABLE IF NOT EXISTS public.error_log (
  id               bigserial PRIMARY KEY,
  created_at       timestamptz NOT NULL DEFAULT now(),
  modul            text,
  poruka           text,
  stack            text,
  component_stack  text,
  user_id          uuid,
  radnik_id        int,
  url              text,
  user_agent       text,
  pregledano       boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_error_log_created ON public.error_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_pregledano ON public.error_log (pregledano, created_at DESC);

COMMENT ON TABLE public.error_log IS 'Klijentske greške (ErrorBoundary). Linija sme samo da upiše; admin čita i označava.';

CREATE OR REPLACE FUNCTION public.error_log_pre_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.user_id := auth.uid();
  NEW.pregledano := false;
  NEW.poruka := left(COALESCE(NEW.poruka, ''), 500);
  NEW.stack := left(NEW.stack, 2000);
  NEW.component_stack := left(NEW.component_stack, 2000);
  NEW.url := left(NEW.url, 500);
  NEW.user_agent := left(NEW.user_agent, 300);
  NEW.modul := left(NEW.modul, 80);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS error_log_pre_insert ON public.error_log;
CREATE TRIGGER error_log_pre_insert
  BEFORE INSERT ON public.error_log
  FOR EACH ROW
  EXECUTE FUNCTION public.error_log_pre_insert();

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error_log_insert_auth" ON public.error_log;
CREATE POLICY "error_log_insert_auth" ON public.error_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "error_log_select_admin" ON public.error_log;
CREATE POLICY "error_log_select_admin" ON public.error_log
  FOR SELECT TO authenticated
  USING (public.je_admin());

DROP POLICY IF EXISTS "error_log_update_admin" ON public.error_log;
CREATE POLICY "error_log_update_admin" ON public.error_log
  FOR UPDATE TO authenticated
  USING (public.je_admin())
  WITH CHECK (public.je_admin());

DROP POLICY IF EXISTS "error_log_delete_admin" ON public.error_log;
CREATE POLICY "error_log_delete_admin" ON public.error_log
  FOR DELETE TO authenticated
  USING (public.je_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE error_log_id_seq TO authenticated;

NOTIFY pgrst, 'reload schema';
