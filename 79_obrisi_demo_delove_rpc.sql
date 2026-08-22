-- RPC: bulk brisanje DEMO/TEST/SAMPLE/XXX delova iz šifrarnika
-- Pokreni posle 78_obrisi_deo_iz_sifrarnika_rpc.sql

CREATE OR REPLACE FUNCTION public.obrisi_demo_delove_iz_sifrarnika(
  p_id_deo_list text[],
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
  raw_id text;
  id text;
  obrisano int := 0;
  ids_obrisano text[] := '{}';
  odbijeno text[] := '{}';
BEGIN
  IF uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM radnici r
      WHERE r.user_id = uid AND r.uloga = 'admin' AND COALESCE(r.aktivan, true)
    ) INTO admin_ok;
  ELSE
    admin_ok := true;
  END IF;

  IF NOT admin_ok THEN
    RETURN json_build_object('ok', false, 'poruka', 'Samo admin može obrisati demo delove.');
  END IF;

  IF p_potvrdi IS DISTINCT FROM 'OBRISI_DEMO' THEN
    RETURN json_build_object(
      'ok', false,
      'poruka', 'Potrebna potvrda: p_potvrdi = OBRISI_DEMO.'
    );
  END IF;

  IF p_id_deo_list IS NULL OR array_length(p_id_deo_list, 1) IS NULL THEN
    RETURN json_build_object('ok', false, 'poruka', 'Lista ID delova je prazna.');
  END IF;

  FOREACH raw_id IN ARRAY p_id_deo_list LOOP
    id := upper(trim(coalesce(raw_id, '')));
    IF id = '' THEN
      CONTINUE;
    END IF;

    IF id !~ '^(DEMO|TEST|SAMPLE|XXX)[-_]' THEN
      odbijeno := array_append(odbijeno, id);
      CONTINUE;
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

    obrisano := obrisano + 1;
    ids_obrisano := array_append(ids_obrisano, id);
  END LOOP;

  IF array_length(odbijeno, 1) IS NOT NULL THEN
    RETURN json_build_object(
      'ok', false,
      'poruka', 'Dozvoljeno samo DEMO/TEST ID. Odbijeno: ' || array_to_string(odbijeno[1:5], ', '),
      'odbijeno', odbijeno
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'obrisano', obrisano,
    'ids', ids_obrisano
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obrisi_demo_delove_iz_sifrarnika(text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obrisi_demo_delove_iz_sifrarnika(text[], text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
