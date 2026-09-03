-- Šifrarnik: arhiviranje dela umesto tvrdog brisanja, pregled zavisnosti
-- ("gde se koristi") i audit na nivou baze.
--
-- Pokreni posle 90_dashboard_agregati.sql.

-- ─────────────────────────────────────────────────────────────
-- 1. Arhiviranje
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.delovi ADD COLUMN IF NOT EXISTS arhiviran_u timestamptz;
ALTER TABLE public.delovi ADD COLUMN IF NOT EXISTS arhiviran_razlog text;
ALTER TABLE public.delovi ADD COLUMN IF NOT EXISTS arhivirao text;

CREATE INDEX IF NOT EXISTS idx_delovi_arhiviran ON public.delovi (arhiviran_u)
  WHERE arhiviran_u IS NOT NULL;

CREATE OR REPLACE FUNCTION public.arhiviraj_deo(
  p_id_deo text,
  p_razlog text DEFAULT NULL,
  p_korisnik text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  id text := upper(trim(coalesce(p_id_deo, '')));
  pogodjeno int;
BEGIN
  IF id = '' THEN
    RETURN json_build_object('ok', false, 'poruka', 'ID dela je obavezan.');
  END IF;

  UPDATE delovi
  SET aktivan = false,
      arhiviran_u = now(),
      arhiviran_razlog = nullif(trim(coalesce(p_razlog, '')), ''),
      arhivirao = nullif(trim(coalesce(p_korisnik, '')), '')
  WHERE upper(trim(id_deo)) = id;

  GET DIAGNOSTICS pogodjeno = ROW_COUNT;
  IF pogodjeno = 0 THEN
    RETURN json_build_object('ok', false, 'poruka', format('Deo %s ne postoji.', id));
  END IF;

  RETURN json_build_object('ok', true, 'id_deo', id, 'arhiviran', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.vrati_deo_iz_arhive(p_id_deo text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  id text := upper(trim(coalesce(p_id_deo, '')));
  pogodjeno int;
BEGIN
  IF id = '' THEN
    RETURN json_build_object('ok', false, 'poruka', 'ID dela je obavezan.');
  END IF;

  UPDATE delovi
  SET aktivan = true, arhiviran_u = NULL, arhiviran_razlog = NULL, arhivirao = NULL
  WHERE upper(trim(id_deo)) = id;

  GET DIAGNOSTICS pogodjeno = ROW_COUNT;
  IF pogodjeno = 0 THEN
    RETURN json_build_object('ok', false, 'poruka', format('Deo %s ne postoji.', id));
  END IF;

  RETURN json_build_object('ok', true, 'id_deo', id, 'arhiviran', false);
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. "Gde se koristi" — sve tabele koje pokazuju na deo
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deo_zavisnosti(p_id_deo text)
RETURNS TABLE (
  tabela text,
  kolona text,
  redova bigint,
  kaskadno boolean
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  id text := upper(trim(coalesce(p_id_deo, '')));
  r record;
  n bigint;
BEGIN
  IF id = '' THEN RETURN; END IF;

  FOR r IN
    SELECT DISTINCT
      c.conrelid::regclass::text AS tab,
      a.attname AS kol,
      c.confdeltype = 'c' AS kaskada
    FROM pg_constraint c
    JOIN pg_class ref ON ref.oid = c.confrelid
    JOIN pg_namespace ns ON ns.oid = ref.relnamespace
    JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f' AND ns.nspname = 'public' AND ref.relname = 'delovi'
  LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE upper(trim(%I::text)) = $1', r.tab, r.kol)
      INTO n USING id;
    IF n > 0 THEN
      tabela := r.tab;
      kolona := r.kol;
      redova := n;
      kaskadno := r.kaskada;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Audit na nivou baze — pokriva i izmene koje klijent ne loguje
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sifrarnik_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
  v_akcija text;
BEGIN
  IF to_regclass('public.sifrarnik_audit') IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_akcija := lower(TG_OP) || '_' || TG_TABLE_NAME;

  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_id := upper(trim(to_jsonb(OLD) ->> 'id_deo'));
    ELSE
      v_id := upper(trim(to_jsonb(NEW) ->> 'id_deo'));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_id := NULL;
  END;

  INSERT INTO sifrarnik_audit (id_deo, akcija, izvor, detalji, korisnik)
  VALUES (
    nullif(v_id, ''),
    left(v_akcija, 64),
    'db_trigger',
    jsonb_build_object('tabela', TG_TABLE_NAME, 'op', TG_OP),
    nullif(current_setting('request.jwt.claim.email', true), '')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'delovi', 'greske_katalog', 'karakteristike_merljive', 'barkod_profili',
    'kupci', 'dobavljaci', 'linije', 'masine', 'smene', 'ciljevi',
    'tipovi_vozila', 'katalog_gresaka_vozilo', 'sop_deo_varijabilni'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.sifrarnik_audit_trigger()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.arhiviraj_deo(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vrati_deo_iz_arhive(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deo_zavisnosti(text) TO authenticated;

COMMENT ON FUNCTION public.arhiviraj_deo IS 'Meko brisanje dela — aktivan=false uz razlog i korisnika.';
COMMENT ON FUNCTION public.deo_zavisnosti IS 'Gde se deo koristi — broj redova po tabeli sa FK na delovi.';

NOTIFY pgrst, 'reload schema';
