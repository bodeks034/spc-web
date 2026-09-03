-- Uloge na nivou baze. Do sada su sve write politike bile
-- `auth.role() = 'authenticated'`, pa su provere iz src/lib/uloge.js
-- (mozeSifrarnik, mozeBrisanjeSifrarnik, mozeNcrZatvoriti) bile samo UI
-- kozmetika — operater je preko PostgREST-a mogao da menja šifrarnik.
--
-- Pokreni posle 92_bezbednost_rls_i_pin.sql.
--
-- Napomena o migraciji: dok baza nema nijednog radnika sa popunjenim
-- user_id, uloga_korisnika() vraća NULL i upis bi bio blokiran. Zato svaka
-- politika ima izlaz `NOT public.postoji_mapiranje_uloga()`, koji se sam
-- gasi čim se prvi radnik poveže sa Auth nalogom (10_povezi_auth_radnici.sql).

CREATE OR REPLACE FUNCTION public.postoji_mapiranje_uloga()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM radnici WHERE user_id IS NOT NULL);
$$;

/** Sme li pozivalac da menja šifrarnik (kvalitet, šef, admin). */
CREATE OR REPLACE FUNCTION public.sme_menjati_sifrarnik()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.je_kvalitet_ili_vise() OR NOT public.postoji_mapiranje_uloga();
$$;

GRANT EXECUTE ON FUNCTION public.postoji_mapiranje_uloga() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sme_menjati_sifrarnik() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- Šifrarnik: delovi, karakteristike, greške
-- Čitanje ostaje svima — operater mora da vidi deo koji kontroliše.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['delovi', 'karakteristike_merljive', 'greske_katalog', 'barkod_profili', 'tipovi_vozila']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON public.%I', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "uloge_read_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "uloge_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "uloge_write_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "uloge_write_%s" ON public.%I FOR ALL TO authenticated '
      || 'USING (public.sme_menjati_sifrarnik()) WITH CHECK (public.sme_menjati_sifrarnik())',
      t, t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- NCR/CAPA: prijavu otvara i operater sa linije, ali izmenu i
-- zatvaranje radi kvalitet/šef/admin (mozeNcrZatvoriti u UI-ju).
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.ncr_capa') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.ncr_capa ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "auth_insert_ncr" ON public.ncr_capa;
  DROP POLICY IF EXISTS "auth_update_ncr" ON public.ncr_capa;
  DROP POLICY IF EXISTS "auth_delete_ncr" ON public.ncr_capa;

  DROP POLICY IF EXISTS "uloge_read_ncr" ON public.ncr_capa;
  CREATE POLICY "uloge_read_ncr" ON public.ncr_capa
    FOR SELECT TO authenticated USING (true);

  DROP POLICY IF EXISTS "uloge_insert_ncr" ON public.ncr_capa;
  CREATE POLICY "uloge_insert_ncr" ON public.ncr_capa
    FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "uloge_update_ncr" ON public.ncr_capa;
  CREATE POLICY "uloge_update_ncr" ON public.ncr_capa
    FOR UPDATE TO authenticated
    USING (public.sme_menjati_sifrarnik())
    WITH CHECK (public.sme_menjati_sifrarnik());

  DROP POLICY IF EXISTS "uloge_delete_ncr" ON public.ncr_capa;
  CREATE POLICY "uloge_delete_ncr" ON public.ncr_capa
    FOR DELETE TO authenticated
    USING (public.je_admin() OR NOT public.postoji_mapiranje_uloga());
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Operativni zapisi: brisanje merenja nije posao operatera.
-- Unos i ispravka ostaju otvoreni (offline red mora da prođe).
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['kontrolni_log', 'merenja_varijabilna', 'kpi_unos']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "uloge_delete_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "uloge_delete_%s" ON public.%I FOR DELETE TO authenticated '
      || 'USING (public.je_admin() OR NOT public.postoji_mapiranje_uloga())',
      t, t);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.sme_menjati_sifrarnik() IS
  'Kvalitet/šef/admin, ili bilo ko dok nijedan radnik nije povezan sa Auth nalogom (bootstrap).';
COMMENT ON FUNCTION public.postoji_mapiranje_uloga() IS
  'Postoji li ijedan radnik sa user_id — prekidač koji uključuje proveru uloga.';
