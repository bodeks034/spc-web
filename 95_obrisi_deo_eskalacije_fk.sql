-- 95: Brisanje dela ne sme pasti na spc_alarmi_eskalacija_id_fkey.
-- Problem: 88 briše tabele sa FK na delovi u proizvoljnom redosledu;
-- ako eskalacije odu pre spc_alarmi, Postgres odbija DELETE zbog eskalacija_id.
-- Pokreni u Supabase SQL Editoru (posle 88).

-- 1) Trajne FK veze: brisanje eskalacije/alarma ne sme blokirati čišćenje.
ALTER TABLE spc_alarmi DROP CONSTRAINT IF EXISTS spc_alarmi_eskalacija_id_fkey;
ALTER TABLE spc_alarmi
  ADD CONSTRAINT spc_alarmi_eskalacija_id_fkey
  FOREIGN KEY (eskalacija_id) REFERENCES eskalacije(id) ON DELETE SET NULL;

ALTER TABLE karantin_lotovi DROP CONSTRAINT IF EXISTS karantin_lotovi_eskalacija_id_fkey;
ALTER TABLE karantin_lotovi
  ADD CONSTRAINT karantin_lotovi_eskalacija_id_fkey
  FOREIGN KEY (eskalacija_id) REFERENCES eskalacije(id) ON DELETE SET NULL;

ALTER TABLE karantin_lotovi DROP CONSTRAINT IF EXISTS karantin_lotovi_spc_alarm_id_fkey;
ALTER TABLE karantin_lotovi
  ADD CONSTRAINT karantin_lotovi_spc_alarm_id_fkey
  FOREIGN KEY (spc_alarm_id) REFERENCES spc_alarmi(id) ON DELETE SET NULL;

-- 2) RPC: pre generic DELETE raskini među-operativne veze za taj id_deo.
-- Napomena: lokalna promenljiva se zove v_id (ne "id") da ne sudara sa kolonama id.
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
  v_id text := upper(trim(coalesce(p_id_deo, '')));
  r record;
  blokade jsonb := '[]'::jsonb;
  n bigint;
  obrisano jsonb := '{}'::jsonb;
BEGIN
  IF v_id = '' THEN
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

  -- Pre kaskade: raskini veze eskalacije ↔ alarm ↔ karantin (isti id_deo).
  IF p_sa_operativom THEN
    IF to_regclass('public.karantin_lotovi') IS NOT NULL THEN
      UPDATE karantin_lotovi
      SET spc_alarm_id = NULL, eskalacija_id = NULL
      WHERE upper(trim(id_deo)) = v_id;
    END IF;
    IF to_regclass('public.spc_alarmi') IS NOT NULL THEN
      UPDATE spc_alarmi
      SET eskalacija_id = NULL
      WHERE upper(trim(id_deo)) = v_id;
    END IF;
  END IF;

  -- Sve tabele koje imaju FK na delovi(id_deo) bez ON DELETE CASCADE.
  FOR r IN
    SELECT tabela, kolona
    FROM (
      SELECT
        c.conrelid::regclass::text AS tabela,
        a.attname AS kolona,
        MIN(
          CASE replace(c.conrelid::regclass::text, 'public.', '')
            WHEN 'karantin_lotovi' THEN 1
            WHEN 'spc_alarmi' THEN 2
            WHEN 'eskalacije' THEN 3
            ELSE 50
          END
        ) AS redosled
      FROM pg_constraint c
      JOIN pg_class ref ON ref.oid = c.confrelid
      JOIN pg_namespace ns ON ns.oid = ref.relnamespace
      JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
      WHERE c.contype = 'f'
        AND ns.nspname = 'public'
        AND ref.relname = 'delovi'
        AND c.confdeltype = 'a'
      GROUP BY 1, 2
    ) z
    ORDER BY redosled, tabela
  LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE upper(trim(%I::text)) = $1', r.tabela, r.kolona)
      INTO n USING v_id;
    CONTINUE WHEN n = 0;

    IF p_sa_operativom THEN
      EXECUTE format('DELETE FROM %s WHERE upper(trim(%I::text)) = $1', r.tabela, r.kolona) USING v_id;
      obrisano := obrisano || jsonb_build_object(r.tabela, n);
    ELSE
      blokade := blokade || jsonb_build_object('tabela', r.tabela, 'redova', n);
    END IF;
  END LOOP;

  IF jsonb_array_length(blokade) > 0 THEN
    RETURN json_build_object(
      'ok', false,
      'kod', 'zavisnosti',
      'id_deo', v_id,
      'blokade', blokade,
      'poruka', format(
        'Deo %s ima povezane unose u %s tabel(a). Ponovi brisanje sa opcijom "obriši i povezane unose".',
        v_id, jsonb_array_length(blokade)
      )
    );
  END IF;

  DELETE FROM delovi WHERE upper(trim(id_deo)) = v_id;

  RETURN json_build_object('ok', true, 'id_deo', v_id, 'obrisano', obrisano);
END;
$$;

REVOKE ALL ON FUNCTION public.obrisi_deo_iz_sifrarnika(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obrisi_deo_iz_sifrarnika(text, text, boolean) TO authenticated, service_role;

-- Marker za Admin → Status šeme / db:verify
CREATE OR REPLACE FUNCTION public.obrisi_deo_eskalacije_fk_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'spc_alarmi'
      AND c.contype = 'f'
      AND c.conname = 'spc_alarmi_eskalacija_id_fkey'
      AND c.confdeltype = 'n' -- SET NULL
  );
$$;

REVOKE ALL ON FUNCTION public.obrisi_deo_eskalacije_fk_ok() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obrisi_deo_eskalacije_fk_ok() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
