-- Šifrarnik: filter po liniji u MV RPC-ovima + automatsko osvežavanje MV-a.
--
-- Do sada je izbor radne linije potpuno zaobilazio mv_delovi_sifrarnik_status
-- (klijent je povlačio limit*3 redova i filtrirao u JS-u), a MV se osvežavao
-- samo iz Glavnog unosa — pa su statusi posle upsert-a dela, brisanja ili ERP
-- uvoza ostajali bajati.
--
-- Pokreni posle 88_obrisi_deo_kaskadno.sql.

-- ─────────────────────────────────────────────────────────────
-- 1. Zajednički uslov pripadnosti dela liniji (isto pravilo kao
--    primeniFilterLinijeNaQuery u src/lib/linijaProizvoda.js)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deo_pripada_liniji(
  p_vozilo_katalog_id text,
  p_sifra_vozila text,
  p_id_deo text,
  p_linija text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_linija IS NULL OR trim(p_linija) = ''
    OR upper(trim(coalesce(p_vozilo_katalog_id, ''))) = upper(trim(p_linija))
    OR upper(trim(coalesce(p_sifra_vozila, ''))) = upper(trim(p_linija))
    OR upper(trim(coalesce(p_id_deo, ''))) LIKE upper(trim(p_linija)) || '-%';
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. RPC-ovi liste / pretrage / filtera sa p_linija
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.sifrarnik_lista_delovi(text, int, int);
DROP FUNCTION IF EXISTS public.sifrarnik_pretrazi_delovi(text, text, int, int);
DROP FUNCTION IF EXISTS public.sifrarnik_filter_delovi(text, boolean, boolean, text, int, int);

CREATE OR REPLACE FUNCTION public.sifrarnik_lista_delovi(
  p_tip_kontrole text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_linija text DEFAULT NULL
)
RETURNS TABLE (
  id int, id_deo text, naziv_dela text, karakteristika text, tip_kontrole text,
  vozilo_katalog_id text, sifra_vozila text, broj_crteza text, revizija text,
  slika_naziv text, aktivan boolean, napomena text, kom_za_kontrolu int,
  greska_katalog_id text, linija_id int, masina_id int,
  status_sifrarnik text, gu_broj int, gr_broj int, ima_barkod boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id, d.id_deo, d.naziv_dela, d.karakteristika, d.tip_kontrole,
    d.vozilo_katalog_id, d.sifra_vozila, d.broj_crteza, d.revizija,
    d.slika_naziv, d.aktivan, d.napomena, d.kom_za_kontrolu,
    d.greska_katalog_id, d.linija_id, d.masina_id,
    mv.status_sifrarnik, mv.gu_broj, mv.gr_broj, mv.ima_barkod
  FROM public.mv_delovi_sifrarnik_status mv
  JOIN public.delovi d ON d.id = mv.id
  WHERE (p_tip_kontrole IS NULL OR d.tip_kontrole = p_tip_kontrole)
    AND public.deo_pripada_liniji(d.vozilo_katalog_id, d.sifra_vozila, d.id_deo, p_linija)
  ORDER BY d.id_deo
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

CREATE OR REPLACE FUNCTION public.sifrarnik_pretrazi_delovi(
  p_q text,
  p_tip_kontrole text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_linija text DEFAULT NULL
)
RETURNS TABLE (
  id int, id_deo text, naziv_dela text, karakteristika text, tip_kontrole text,
  vozilo_katalog_id text, sifra_vozila text, broj_crteza text, revizija text,
  slika_naziv text, aktivan boolean, napomena text, kom_za_kontrolu int,
  greska_katalog_id text, linija_id int, masina_id int,
  status_sifrarnik text, gu_broj int, gr_broj int, ima_barkod boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id, d.id_deo, d.naziv_dela, d.karakteristika, d.tip_kontrole,
    d.vozilo_katalog_id, d.sifra_vozila, d.broj_crteza, d.revizija,
    d.slika_naziv, d.aktivan, d.napomena, d.kom_za_kontrolu,
    d.greska_katalog_id, d.linija_id, d.masina_id,
    mv.status_sifrarnik, mv.gu_broj, mv.gr_broj, mv.ima_barkod
  FROM public.mv_delovi_sifrarnik_status mv
  JOIN public.delovi d ON d.id = mv.id
  WHERE (
      p_q IS NULL OR trim(p_q) = ''
      OR upper(d.id_deo) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.naziv_dela, '')) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.karakteristika, '')) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.broj_crteza, '')) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.vozilo_katalog_id, '')) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.sifra_vozila, '')) LIKE '%' || upper(trim(p_q)) || '%'
    )
    AND (p_tip_kontrole IS NULL OR d.tip_kontrole = p_tip_kontrole)
    AND public.deo_pripada_liniji(d.vozilo_katalog_id, d.sifra_vozila, d.id_deo, p_linija)
  ORDER BY d.id_deo
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

CREATE OR REPLACE FUNCTION public.sifrarnik_filter_delovi(
  p_nedostaje text DEFAULT NULL,
  p_samo_delimicni boolean DEFAULT false,
  p_samo_demo boolean DEFAULT false,
  p_tip_kontrole text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0,
  p_linija text DEFAULT NULL
)
RETURNS TABLE (
  id int, id_deo text, naziv_dela text, karakteristika text, tip_kontrole text,
  vozilo_katalog_id text, sifra_vozila text, broj_crteza text, revizija text,
  slika_naziv text, aktivan boolean, napomena text, kom_za_kontrolu int,
  greska_katalog_id text, linija_id int, masina_id int,
  status_sifrarnik text, gu_broj int, gr_broj int, ima_barkod boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id, d.id_deo, d.naziv_dela, d.karakteristika, d.tip_kontrole,
    d.vozilo_katalog_id, d.sifra_vozila, d.broj_crteza, d.revizija,
    d.slika_naziv, d.aktivan, d.napomena, d.kom_za_kontrolu,
    d.greska_katalog_id, d.linija_id, d.masina_id,
    mv.status_sifrarnik, mv.gu_broj, mv.gr_broj, mv.ima_barkod
  FROM public.mv_delovi_sifrarnik_status mv
  JOIN public.delovi d ON d.id = mv.id
  WHERE
    (p_tip_kontrole IS NULL OR d.tip_kontrole = p_tip_kontrole)
    AND public.deo_pripada_liniji(d.vozilo_katalog_id, d.sifra_vozila, d.id_deo, p_linija)
    AND (NOT coalesce(p_samo_demo, false) OR upper(mv.id_deo) ~ '^(DEMO|TEST|SAMPLE|XXX)[-_]')
    AND (NOT coalesce(p_samo_delimicni, false) OR mv.status_sifrarnik IN ('delimicno', 'samo_master'))
    AND (
      p_nedostaje IS NULL OR trim(p_nedostaje) = ''
      OR (p_nedostaje = 'gu' AND mv.gu_broj = 0)
      OR (p_nedostaje = 'greske' AND mv.gr_broj = 0)
      OR (p_nedostaje = 'crtez' AND coalesce(nullif(trim(d.slika_naziv), ''), '') = '')
      OR (p_nedostaje = 'barkod' AND NOT mv.ima_barkod AND mv.gu_broj > 0)
    )
  ORDER BY d.id_deo
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

-- Broj delova uz iste filtere — da paginacija zna ukupan skup bez skena u JS-u.
CREATE OR REPLACE FUNCTION public.sifrarnik_broj_delovi(
  p_tip_kontrole text DEFAULT NULL,
  p_linija text DEFAULT NULL,
  p_q text DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::bigint
  FROM public.mv_delovi_sifrarnik_status mv
  JOIN public.delovi d ON d.id = mv.id
  WHERE (p_tip_kontrole IS NULL OR d.tip_kontrole = p_tip_kontrole)
    AND public.deo_pripada_liniji(d.vozilo_katalog_id, d.sifra_vozila, d.id_deo, p_linija)
    AND (
      p_q IS NULL OR trim(p_q) = ''
      OR upper(d.id_deo) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.naziv_dela, '')) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.karakteristika, '')) LIKE '%' || upper(trim(p_q)) || '%'
      OR upper(coalesce(d.broj_crteza, '')) LIKE '%' || upper(trim(p_q)) || '%'
    );
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Automatsko osvežavanje MV-a
--    REFRESH CONCURRENTLY ne sme unutar transakcije, pa triger samo
--    podiže zastavicu, a klijent/cron poziva osvezi_..._ako_treba().
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sifrarnik_mv_stanje (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  prljav boolean NOT NULL DEFAULT true,
  izmenjeno_u timestamptz NOT NULL DEFAULT now(),
  osvezeno_u timestamptz
);

INSERT INTO public.sifrarnik_mv_stanje (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sifrarnik_mv_oznaci_prljav()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sifrarnik_mv_stanje
  SET prljav = true, izmenjeno_u = now()
  WHERE id;
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['delovi', 'glavni_unos_redovi', 'greske_katalog', 'barkod_profili'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_mv_prljav ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_%s_mv_prljav AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON public.%I
         FOR EACH STATEMENT EXECUTE FUNCTION public.sifrarnik_mv_oznaci_prljav()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.osvezi_sifrarnik_mv_ako_treba(
  p_min_sekundi int DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st record;
BEGIN
  SELECT * INTO st FROM sifrarnik_mv_stanje WHERE id;
  IF st IS NULL THEN
    INSERT INTO sifrarnik_mv_stanje (id) VALUES (true) ON CONFLICT DO NOTHING;
    SELECT * INTO st FROM sifrarnik_mv_stanje WHERE id;
  END IF;

  IF NOT st.prljav THEN
    RETURN json_build_object('osvezeno', false, 'razlog', 'nema promena');
  END IF;

  -- Ne osvežavaj češće od p_min_sekundi (batch unos okida mnogo trigera).
  IF st.osvezeno_u IS NOT NULL
     AND now() - st.osvezeno_u < make_interval(secs => greatest(0, coalesce(p_min_sekundi, 20)))
  THEN
    RETURN json_build_object('osvezeno', false, 'razlog', 'prerano');
  END IF;

  PERFORM public.refresh_sifrarnik_deo_status_mv();

  UPDATE sifrarnik_mv_stanje
  SET prljav = false, osvezeno_u = now()
  WHERE id;

  RETURN json_build_object('osvezeno', true, 'vreme', now());
END;
$$;

GRANT SELECT ON public.sifrarnik_mv_stanje TO authenticated;
GRANT EXECUTE ON FUNCTION public.deo_pripada_liniji(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_lista_delovi(text, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_pretrazi_delovi(text, text, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_filter_delovi(text, boolean, boolean, text, int, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_broj_delovi(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.osvezi_sifrarnik_mv_ako_treba(int) TO authenticated, service_role;

COMMENT ON FUNCTION public.sifrarnik_broj_delovi IS 'Ukupan broj delova uz filtere — za paginaciju bez klijentskog skena.';
COMMENT ON FUNCTION public.osvezi_sifrarnik_mv_ako_treba IS 'Osvežava MV samo ako je triger označio promenu i ako je prošlo dovoljno vremena.';

NOTIFY pgrst, 'reload schema';
