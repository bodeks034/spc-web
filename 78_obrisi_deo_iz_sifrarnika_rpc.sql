-- RPC: brisanje dela i povezanih šifrarnik redova (merenja ostaju)
-- Pokreni u Supabase SQL Editoru. Zahteva admin radnika ili service_role.

CREATE OR REPLACE FUNCTION public.obrisi_deo_iz_sifrarnika(
  p_id_deo text,
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
  id text := upper(trim(coalesce(p_id_deo, '')));
BEGIN
  IF id = '' THEN
    RETURN json_build_object('ok', false, 'poruka', 'ID dela je obavezan.');
  END IF;

  IF uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM radnici r
      WHERE r.user_id = uid AND r.uloga = 'admin' AND COALESCE(r.aktivan, true)
    ) INTO admin_ok;
  ELSE
    admin_ok := true;
  END IF;

  IF NOT admin_ok THEN
    RETURN json_build_object('ok', false, 'poruka', 'Samo admin može obrisati deo iz šifrarnika.');
  END IF;

  IF p_potvrdi IS DISTINCT FROM 'OBRISI_DEO' THEN
    RETURN json_build_object(
      'ok', false,
      'poruka', 'Potrebna potvrda: p_potvrdi = OBRISI_DEO.'
    );
  END IF;

  IF to_regclass('public.glavni_unos_redovi') IS NOT NULL THEN
    DELETE FROM glavni_unos_redovi WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.greske_katalog') IS NOT NULL THEN
    DELETE FROM greske_katalog WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.karakteristike_merljive') IS NOT NULL THEN
    DELETE FROM karakteristike_merljive WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.sop_deo_varijabilni') IS NOT NULL THEN
    DELETE FROM sop_deo_varijabilni WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.delovi_atributivni_pogon') IS NOT NULL THEN
    DELETE FROM delovi_atributivni_pogon WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.barkod_profili') IS NOT NULL THEN
    DELETE FROM barkod_profili WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.radni_nalozi') IS NOT NULL THEN
    DELETE FROM radni_nalozi WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.ciljevi') IS NOT NULL THEN
    DELETE FROM ciljevi WHERE upper(trim(id_deo)) = id;
  END IF;
  IF to_regclass('public.delovi') IS NOT NULL THEN
    DELETE FROM delovi WHERE upper(trim(id_deo)) = id;
  END IF;

  RETURN json_build_object('ok', true, 'id_deo', id);
END;
$$;

REVOKE ALL ON FUNCTION public.obrisi_deo_iz_sifrarnika(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obrisi_deo_iz_sifrarnika(text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
