-- RPC: čišćenje operativnih podataka iz Admin panela (šifrarnik ostaje)
-- Pokreni u Supabase SQL Editoru. Zahteva admin radnika (auth.uid → radnici.uloga=admin).

CREATE OR REPLACE FUNCTION public.ocisti_operativu_pre_go_live(
  p_zadrzi_qms boolean DEFAULT false,
  p_potvrdi text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_ok boolean := false;
BEGIN
  IF uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM radnici r
      WHERE r.user_id = uid AND r.uloga = 'admin' AND COALESCE(r.aktivan, true)
    ) INTO admin_ok;
  END IF;

  IF NOT admin_ok THEN
    RETURN json_build_object('ok', false, 'poruka', 'Samo admin može pokrenuti čišćenje operativnih podataka.');
  END IF;

  IF p_potvrdi IS DISTINCT FROM 'OCISTI_OPERATIVU' THEN
    RETURN json_build_object(
      'ok', false,
      'poruka', 'Potrebna potvrda: p_potvrdi = OCISTI_OPERATIVU. Pre toga uradi backup (npm run backup:db).'
    );
  END IF;

  IF to_regclass('public.msa_kalendar') IS NOT NULL THEN
    UPDATE msa_kalendar SET poslednja_studija_id = NULL WHERE poslednja_studija_id IS NOT NULL;
  END IF;

  IF NOT p_zadrzi_qms THEN
    IF to_regclass('public.ncr_capa') IS NOT NULL THEN DELETE FROM ncr_capa; END IF;
    IF to_regclass('public.pfmea_cp_dokumenti') IS NOT NULL THEN DELETE FROM pfmea_cp_dokumenti; END IF;
    IF to_regclass('public.osmd_izvestaji') IS NOT NULL THEN DELETE FROM osmd_izvestaji; END IF;
  END IF;

  IF to_regclass('public.karantin_lotovi') IS NOT NULL THEN DELETE FROM karantin_lotovi; END IF;
  IF to_regclass('public.spc_alarmi') IS NOT NULL THEN DELETE FROM spc_alarmi; END IF;
  IF to_regclass('public.eskalacije') IS NOT NULL THEN DELETE FROM eskalacije; END IF;

  IF to_regclass('public.merenja_varijabilna') IS NOT NULL THEN
    TRUNCATE TABLE merenja_varijabilna RESTART IDENTITY;
  END IF;
  IF to_regclass('public.kontrolni_log') IS NOT NULL THEN
    TRUNCATE TABLE kontrolni_log RESTART IDENTITY;
  END IF;
  IF to_regclass('public.kpi_unos') IS NOT NULL THEN
    TRUNCATE TABLE kpi_unos RESTART IDENTITY;
  END IF;
  IF to_regclass('public.fai_unosi') IS NOT NULL THEN
    TRUNCATE TABLE fai_unosi RESTART IDENTITY;
  END IF;

  IF to_regclass('public.moment_protokol') IS NOT NULL THEN DELETE FROM moment_protokol; END IF;
  IF to_regclass('public.gage_rr_studije') IS NOT NULL THEN DELETE FROM gage_rr_studije; END IF;
  IF to_regclass('public.erp_uvoz_log') IS NOT NULL THEN DELETE FROM erp_uvoz_log; END IF;
  IF to_regclass('public.auto_run_log') IS NOT NULL THEN DELETE FROM auto_run_log; END IF;

  RETURN json_build_object(
    'ok', true,
    'poruka', CASE WHEN p_zadrzi_qms
      THEN 'Operativni podaci obrisani (NCR/8D/PFMEA dokumenti zadržani).'
      ELSE 'Operativni podaci obrisani (uključujući NCR/8D/PFMEA).'
    END,
    'zadrzi_qms', p_zadrzi_qms
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ocisti_operativu_pre_go_live(boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ocisti_operativu_pre_go_live(boolean, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
