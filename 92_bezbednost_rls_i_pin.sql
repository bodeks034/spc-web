-- Bezbednost: zatvaranje eskalacije privilegija preko tabele radnici,
-- premeštanje provere PIN-a iz browsera u bazu, i provera uloge u
-- SECURITY DEFINER funkcijama koje su je do sada preskakale.
--
-- Pokreni posle 91_arhiviranje_i_audit_trigger.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 1. Jedinstveni izvor istine o ulozi pozivaoca
--    (do sada je svaka funkcija imala svoj inline SELECT nad radnici)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.uloga_korisnika()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(trim(r.uloga))
  FROM radnici r
  WHERE r.user_id = auth.uid()
    AND COALESCE(r.aktivan, true)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.je_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.uloga_korisnika() = 'admin', false);
$$;

-- Kvalitet/šef/admin — nivo koji sme da menja šifrarnik i zatvara QMS zapise.
CREATE OR REPLACE FUNCTION public.je_kvalitet_ili_vise()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.uloga_korisnika() IN ('admin', 'kvalitet', 'sef'), false);
$$;

GRANT EXECUTE ON FUNCTION public.uloga_korisnika() TO authenticated;
GRANT EXECUTE ON FUNCTION public.je_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.je_kvalitet_ili_vise() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. radnici: bio je otvoren UPDATE za sve ulogovane
--    (operater je mogao sebi da upiše uloga='admin' i tuđi pin_hash)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_update_radnici" ON public.radnici;

DROP POLICY IF EXISTS "radnici_update_sebe" ON public.radnici;
CREATE POLICY "radnici_update_sebe" ON public.radnici
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "radnici_admin_sve" ON public.radnici;
CREATE POLICY "radnici_admin_sve" ON public.radnici
  FOR ALL TO authenticated
  USING (public.je_admin())
  WITH CHECK (public.je_admin());

-- RLS ne ume da ograniči pojedinačnu kolonu, pa osetljive kolone
-- čuva triger: samo admin sme da menja ulogu, PIN i aktivnost.
CREATE OR REPLACE FUNCTION public.radnici_zastita_kolona()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (skripte, cron) i migracije nemaju auth.uid() — puštamo ih.
  IF auth.uid() IS NULL OR public.je_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.uloga IS DISTINCT FROM OLD.uloga THEN
    RAISE EXCEPTION 'Promenu uloge može izvršiti samo admin.';
  END IF;
  IF NEW.pin_hash IS DISTINCT FROM OLD.pin_hash THEN
    RAISE EXCEPTION 'PIN se menja preko funkcije postavi_pin_radnika.';
  END IF;
  IF NEW.aktivan IS DISTINCT FROM OLD.aktivan THEN
    RAISE EXCEPTION 'Aktivaciju radnika može menjati samo admin.';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Vezu sa Auth nalogom može menjati samo admin.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_radnici_zastita_kolona ON public.radnici;
CREATE TRIGGER trg_radnici_zastita_kolona
  BEFORE UPDATE ON public.radnici
  FOR EACH ROW EXECUTE FUNCTION public.radnici_zastita_kolona();

-- ─────────────────────────────────────────────────────────────
-- 3. pin_hash više nije čitljiv iz klijenta
--    (4-cifreni SHA-256 bez salt-a se offline probija trenutno)
-- ─────────────────────────────────────────────────────────────

-- UI treba samo podatak "ima li radnik PIN", ne i sam heš.
ALTER TABLE public.radnici
  ADD COLUMN IF NOT EXISTS ima_pin boolean
  GENERATED ALWAYS AS (pin_hash IS NOT NULL AND pin_hash <> '') STORED;

DO $$
DECLARE
  kolone text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO kolone
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'radnici'
    AND column_name <> 'pin_hash';

  EXECUTE 'REVOKE SELECT ON public.radnici FROM authenticated';
  EXECUTE format('GRANT SELECT (%s) ON public.radnici TO authenticated', kolone);

  EXECUTE 'REVOKE SELECT ON public.radnici FROM anon';
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Provera PIN-a u bazi, sa bcrypt-om i ograničenjem pokušaja
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pin_pokusaji (
  radnik_id int PRIMARY KEY REFERENCES public.radnici(id) ON DELETE CASCADE,
  neuspesnih int NOT NULL DEFAULT 0,
  zakljucan_do timestamptz,
  poslednji_u timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_pokusaji ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pin_pokusaji_admin" ON public.pin_pokusaji;
CREATE POLICY "pin_pokusaji_admin" ON public.pin_pokusaji
  FOR SELECT TO authenticated
  USING (public.je_admin());

REVOKE ALL ON public.pin_pokusaji FROM anon;
GRANT SELECT ON public.pin_pokusaji TO authenticated;

/** Stari SHA-256 heš iz browsera — prihvatamo ga jednom, pa migriramo na bcrypt. */
CREATE OR REPLACE FUNCTION public.pin_legacy_hash(p_pin text, p_radnik_id int)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(trim(coalesce(p_pin, '')) || '::spc-tablet::' || coalesce(p_radnik_id, 0)::text, 'sha256'),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.proveri_pin_radnika(p_radnik_id int, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  st record;
  pin text := trim(coalesce(p_pin, ''));
  ok boolean := false;
  legacy boolean := false;
  MAX_POKUSAJA constant int := 5;
  ZAKLJUCAJ constant interval := interval '5 minutes';
BEGIN
  IF pin !~ '^\d{4,6}$' THEN
    RETURN json_build_object('ok', false, 'poruka', 'PIN mora biti 4–6 cifara.');
  END IF;

  SELECT * INTO st FROM pin_pokusaji WHERE radnik_id = p_radnik_id;
  IF st.zakljucan_do IS NOT NULL AND st.zakljucan_do > now() THEN
    RETURN json_build_object(
      'ok', false,
      'poruka', format('Previše pogrešnih pokušaja. Pokušaj ponovo za %s min.',
        greatest(1, ceil(extract(epoch FROM (st.zakljucan_do - now())) / 60)::int))
    );
  END IF;

  SELECT id, ime, uloga, email, user_id, aktivan, pin_hash
  INTO r
  FROM radnici
  WHERE id = p_radnik_id;

  IF r.id IS NULL OR COALESCE(r.aktivan, true) = false THEN
    RETURN json_build_object('ok', false, 'poruka', 'Radnik nije aktivan.');
  END IF;
  IF r.pin_hash IS NULL OR r.pin_hash = '' THEN
    RETURN json_build_object('ok', false, 'poruka', 'PIN nije postavljen — admin mora podesiti PIN.');
  END IF;

  IF r.pin_hash LIKE '$2%' THEN
    ok := (crypt(pin, r.pin_hash) = r.pin_hash);
  ELSE
    ok := (public.pin_legacy_hash(pin, p_radnik_id) = r.pin_hash);
    legacy := ok;
  END IF;

  IF NOT ok THEN
    INSERT INTO pin_pokusaji (radnik_id, neuspesnih, poslednji_u)
    VALUES (p_radnik_id, 1, now())
    ON CONFLICT (radnik_id) DO UPDATE
      SET neuspesnih = pin_pokusaji.neuspesnih + 1,
          poslednji_u = now(),
          zakljucan_do = CASE
            WHEN pin_pokusaji.neuspesnih + 1 >= MAX_POKUSAJA THEN now() + ZAKLJUCAJ
            ELSE NULL
          END;
    RETURN json_build_object('ok', false, 'poruka', 'Pogrešan PIN.');
  END IF;

  -- Tiha migracija starog heša na bcrypt pri prvoj uspešnoj prijavi.
  IF legacy THEN
    UPDATE radnici SET pin_hash = crypt(pin, gen_salt('bf', 10)) WHERE id = p_radnik_id;
  END IF;

  DELETE FROM pin_pokusaji WHERE radnik_id = p_radnik_id;

  RETURN json_build_object(
    'ok', true,
    'radnik', json_build_object(
      'id', r.id, 'ime', r.ime, 'uloga', r.uloga,
      'email', r.email, 'user_id', r.user_id, 'aktivan', r.aktivan
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.postavi_pin_radnika(p_radnik_id int, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pin text := trim(coalesce(p_pin, ''));
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.je_admin() THEN
    RETURN json_build_object('ok', false, 'poruka', 'Samo admin može menjati PIN.');
  END IF;

  IF pin = '' THEN
    UPDATE radnici SET pin_hash = NULL WHERE id = p_radnik_id;
    DELETE FROM pin_pokusaji WHERE radnik_id = p_radnik_id;
    RETURN json_build_object('ok', true, 'obrisan', true);
  END IF;

  IF pin !~ '^\d{4,6}$' THEN
    RETURN json_build_object('ok', false, 'poruka', 'PIN mora biti 4–6 cifara.');
  END IF;

  UPDATE radnici SET pin_hash = crypt(pin, gen_salt('bf', 10)) WHERE id = p_radnik_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'poruka', 'Radnik ne postoji.');
  END IF;

  DELETE FROM pin_pokusaji WHERE radnik_id = p_radnik_id;
  RETURN json_build_object('ok', true);
END;
$$;

/** Lista radnika za brzu smenu — vraća ko IMA PIN, bez ijednog heša. */
CREATE OR REPLACE FUNCTION public.radnici_sa_pinom()
RETURNS TABLE (id int, ime text, uloga text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.ime, r.uloga
  FROM radnici r
  WHERE COALESCE(r.aktivan, true)
    AND r.pin_hash IS NOT NULL
    AND r.pin_hash <> ''
  ORDER BY r.ime;
$$;

GRANT EXECUTE ON FUNCTION public.proveri_pin_radnika(int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.postavi_pin_radnika(int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.radnici_sa_pinom() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.pin_legacy_hash(text, int) FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────
-- 5. Arhiviranje dela je bilo dostupno svakom operateru
-- ─────────────────────────────────────────────────────────────
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
  autor text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.je_kvalitet_ili_vise() THEN
    RETURN json_build_object('ok', false, 'poruka', 'Arhiviranje dela sme kvalitet, šef smene ili admin.');
  END IF;

  IF id = '' THEN
    RETURN json_build_object('ok', false, 'poruka', 'ID dela je obavezan.');
  END IF;

  -- Identitet se uzima iz tokena; p_korisnik je samo dopuna za offline skripte.
  autor := COALESCE(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    nullif(trim(coalesce(p_korisnik, '')), '')
  );

  UPDATE delovi
  SET aktivan = false,
      arhiviran_u = now(),
      arhiviran_razlog = nullif(trim(coalesce(p_razlog, '')), ''),
      arhivirao = autor
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
  IF auth.uid() IS NOT NULL AND NOT public.je_kvalitet_ili_vise() THEN
    RETURN json_build_object('ok', false, 'poruka', 'Vraćanje iz arhive sme kvalitet, šef smene ili admin.');
  END IF;

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
-- 6. Audit trag: arhiviranje je moglo svako, a arhiva nije imala RLS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sifrarnik_audit_arhiviraj(p_meseci int DEFAULT 12)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - (greatest(p_meseci, 1) || ' months')::interval;
  moved int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.je_admin() THEN
    RAISE EXCEPTION 'Arhiviranje audit loga može samo admin.';
  END IF;

  WITH moved_rows AS (
    DELETE FROM public.sifrarnik_audit
    WHERE created_at < cutoff
    RETURNING *
  )
  INSERT INTO public.sifrarnik_audit_arhiva
  SELECT * FROM moved_rows;

  GET DIAGNOSTICS moved = ROW_COUNT;
  RETURN moved;
END;
$$;

-- CREATE TABLE ... LIKE ne nasleđuje RLS, pa je arhiva bila otvorena.
ALTER TABLE public.sifrarnik_audit_arhiva ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_arhiva_citanje" ON public.sifrarnik_audit_arhiva;
CREATE POLICY "audit_arhiva_citanje" ON public.sifrarnik_audit_arhiva
  FOR SELECT TO authenticated
  USING (public.sifrarnik_audit_moze_pristup());

REVOKE ALL ON public.sifrarnik_audit_arhiva FROM anon;

-- ─────────────────────────────────────────────────────────────
-- 7. Tabela stanja MV-a nikad nije dobila RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.sifrarnik_mv_stanje ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mv_stanje_citanje" ON public.sifrarnik_mv_stanje;
CREATE POLICY "mv_stanje_citanje" ON public.sifrarnik_mv_stanje
  FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.sifrarnik_mv_stanje FROM anon;

-- ─────────────────────────────────────────────────────────────
-- 8. proveri_licencu je odavao tenant i module neautentifikovanom posetiocu
-- ─────────────────────────────────────────────────────────────
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', f.sig);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.uloga_korisnika() IS 'Uloga ulogovanog radnika (admin/kvalitet/sef/kontrolor/operator) ili NULL.';
COMMENT ON FUNCTION public.proveri_pin_radnika(int, text) IS 'Provera PIN-a u bazi: bcrypt, migracija starog SHA-256 heša, 5 pokušaja pa 5 min pauze.';
COMMENT ON TABLE public.pin_pokusaji IS 'Brojač neuspelih PIN prijava po radniku (rate limit za tablet).';
