-- RPC: brisanje dela iz šifrarnika sa kaskadnim čišćenjem svih FK zavisnosti.
-- Zamenjuje verziju iz 78_obrisi_deo_iz_sifrarnika_rpc.sql koja je padala na
-- foreign key violation kada deo ima operativne unose (merenja, kontrolni_log, ...).
-- Napomena: posle ovoga obavezno 95_obrisi_deo_eskalacije_fk.sql (eskalacije ↔ spc_alarmi).
-- Pokreni u Supabase SQL Editoru.

CREATE OR REPLACE FUNCTION public.obrisi_deo_iz_sifrarnika(
  p_id_deo text,
  p_potvrdi text DEFAULT NULL,
  p_sa_operativom boolean DEFAULT false
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
  r record;
  blokade jsonb := '[]'::jsonb;
  n bigint;
  obrisano jsonb := '{}'::jsonb;
BEGIN
  IF id = '' THEN
    RETURN json_build_object('ok', false, 'poruka', 'ID dela je obavezan.');
  END IF;

  IF uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM radnici r2
      WHERE r2.user_id = uid AND r2.uloga = 'admin' AND COALESCE(r2.aktivan, true)
    ) INTO admin_ok;
  ELSE
    admin_ok := true;
  END IF;

  IF NOT admin_ok THEN
    RETURN json_build_object('ok', false, 'poruka', 'Samo admin može obrisati deo iz šifrarnika.');
  END IF;

  IF p_potvrdi IS DISTINCT FROM 'OBRISI_DEO' THEN
    RETURN json_build_object('ok', false, 'poruka', 'Potrebna potvrda: p_potvrdi = OBRISI_DEO.');
  END IF;

  IF to_regclass('public.delovi') IS NULL THEN
    RETURN json_build_object('ok', false, 'poruka', 'Tabela delovi ne postoji.');
  END IF;

  -- Sve tabele koje imaju FK na delovi(id_deo) bez ON DELETE CASCADE.
  FOR r IN
    SELECT DISTINCT c.conrelid::regclass::text AS tabela, a.attname AS kolona
    FROM pg_constraint c
    JOIN pg_class ref ON ref.oid = c.confrelid
    JOIN pg_namespace ns ON ns.oid = ref.relnamespace
    JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f'
      AND ns.nspname = 'public'
      AND ref.relname = 'delovi'
      AND c.confdeltype = 'a'
  LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE upper(trim(%I::text)) = $1', r.tabela, r.kolona)
      INTO n USING id;
    CONTINUE WHEN n = 0;

    IF p_sa_operativom THEN
      EXECUTE format('DELETE FROM %s WHERE upper(trim(%I::text)) = $1', r.tabela, r.kolona) USING id;
      obrisano := obrisano || jsonb_build_object(r.tabela, n);
    ELSE
      blokade := blokade || jsonb_build_object('tabela', r.tabela, 'redova', n);
    END IF;
  END LOOP;

  IF jsonb_array_length(blokade) > 0 THEN
    RETURN json_build_object(
      'ok', false,
      'kod', 'zavisnosti',
      'id_deo', id,
      'blokade', blokade,
      'poruka', format(
        'Deo %s ima povezane unose u %s tabel(a). Ponovi brisanje sa opcijom "obriši i povezane unose".',
        id, jsonb_array_length(blokade)
      )
    );
  END IF;

  DELETE FROM delovi WHERE upper(trim(id_deo)) = id;

  RETURN json_build_object('ok', true, 'id_deo', id, 'obrisano', obrisano);
END;
$$;

REVOKE ALL ON FUNCTION public.obrisi_deo_iz_sifrarnika(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obrisi_deo_iz_sifrarnika(text, text, boolean) TO authenticated, service_role;

-- Stara 2-argumentna verzija se uklanja da PostgREST ne bi imao dvosmislen poziv.
DROP FUNCTION IF EXISTS public.obrisi_deo_iz_sifrarnika(text, text);

NOTIFY pgrst, 'reload schema';
