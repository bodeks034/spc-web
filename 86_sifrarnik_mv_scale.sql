-- Skala 10k+ delova: RPC čita iz mv_delovi_sifrarnik_status (posle 84 + refresh)
-- Pokreni posle 85_sifrarnik_audit_retention.sql

DROP FUNCTION IF EXISTS public.sifrarnik_pretrazi_delovi(text, text, int, int);
DROP FUNCTION IF EXISTS public.sifrarnik_lista_delovi(text, int, int);
DROP FUNCTION IF EXISTS public.sifrarnik_filter_delovi(text, boolean, boolean, text, int, int);
DROP FUNCTION IF EXISTS public.sifrarnik_kompletnost_stat();
DROP FUNCTION IF EXISTS public.sifrarnik_duplikati_dimenzija(int);
DROP FUNCTION IF EXISTS public.sifrarnik_spremni_batch(int, int);

CREATE OR REPLACE FUNCTION public.sifrarnik_filter_delovi(
  p_nedostaje text DEFAULT NULL,
  p_samo_delimicni boolean DEFAULT false,
  p_samo_demo boolean DEFAULT false,
  p_tip_kontrole text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id int,
  id_deo text,
  naziv_dela text,
  karakteristika text,
  tip_kontrole text,
  vozilo_katalog_id text,
  sifra_vozila text,
  broj_crteza text,
  revizija text,
  slika_naziv text,
  aktivan boolean,
  napomena text,
  kom_za_kontrolu int,
  greska_katalog_id text,
  linija_id int,
  masina_id int,
  status_sifrarnik text,
  gu_broj int,
  gr_broj int,
  ima_barkod boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id,
    d.id_deo,
    d.naziv_dela,
    d.karakteristika,
    d.tip_kontrole,
    d.vozilo_katalog_id,
    d.sifra_vozila,
    d.broj_crteza,
    d.revizija,
    d.slika_naziv,
    d.aktivan,
    d.napomena,
    d.kom_za_kontrolu,
    d.greska_katalog_id,
    d.linija_id,
    d.masina_id,
    mv.status_sifrarnik,
    mv.gu_broj,
    mv.gr_broj,
    mv.ima_barkod
  FROM public.mv_delovi_sifrarnik_status mv
  JOIN public.delovi d ON d.id = mv.id
  WHERE
    (p_tip_kontrole IS NULL OR d.tip_kontrole = p_tip_kontrole)
    AND (
      NOT coalesce(p_samo_demo, false)
      OR upper(mv.id_deo) ~ '^(DEMO|TEST|SAMPLE|XXX)[-_]'
    )
    AND (
      NOT coalesce(p_samo_delimicni, false)
      OR mv.status_sifrarnik IN ('delimicno', 'samo_master')
    )
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

CREATE OR REPLACE FUNCTION public.sifrarnik_lista_delovi(
  p_tip_kontrole text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id int,
  id_deo text,
  naziv_dela text,
  karakteristika text,
  tip_kontrole text,
  vozilo_katalog_id text,
  sifra_vozila text,
  broj_crteza text,
  revizija text,
  slika_naziv text,
  aktivan boolean,
  napomena text,
  kom_za_kontrolu int,
  greska_katalog_id text,
  linija_id int,
  masina_id int,
  status_sifrarnik text,
  gu_broj int,
  gr_broj int,
  ima_barkod boolean
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
  ORDER BY d.id_deo
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

CREATE OR REPLACE FUNCTION public.sifrarnik_pretrazi_delovi(
  p_q text,
  p_tip_kontrole text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id int,
  id_deo text,
  naziv_dela text,
  karakteristika text,
  tip_kontrole text,
  vozilo_katalog_id text,
  sifra_vozila text,
  broj_crteza text,
  revizija text,
  slika_naziv text,
  aktivan boolean,
  napomena text,
  kom_za_kontrolu int,
  greska_katalog_id text,
  linija_id int,
  masina_id int,
  status_sifrarnik text,
  gu_broj int,
  gr_broj int,
  ima_barkod boolean
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
  )
  AND (p_tip_kontrole IS NULL OR d.tip_kontrole = p_tip_kontrole)
  ORDER BY d.id_deo
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

CREATE OR REPLACE FUNCTION public.sifrarnik_kompletnost_stat()
RETURNS TABLE (
  ukupno bigint,
  kompletno bigint,
  delimicno bigint,
  samo_master bigint,
  procenat int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*)::bigint AS ukupno,
    count(*) FILTER (WHERE status_sifrarnik = 'kompletan')::bigint AS kompletno,
    count(*) FILTER (WHERE status_sifrarnik = 'delimicno')::bigint AS delimicno,
    count(*) FILTER (WHERE status_sifrarnik = 'samo_master')::bigint AS samo_master,
    CASE WHEN count(*) = 0 THEN 100
      ELSE round(100.0 * count(*) FILTER (WHERE status_sifrarnik = 'kompletan') / count(*))::int
    END AS procenat
  FROM public.mv_delovi_sifrarnik_status;
$$;

CREATE OR REPLACE FUNCTION public.sifrarnik_duplikati_dimenzija(p_limit int DEFAULT 100)
RETURNS TABLE (
  id_deo text,
  pogon text,
  pozicija text,
  broj int,
  ids int[]
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    upper(trim(k.id_deo)) AS id_deo,
    upper(trim(k.pogon_kod)) AS pogon,
    upper(trim(coalesce(k.pozicija, k.sifra_merenja, ''))) AS pozicija,
    count(*)::int AS broj,
    array_agg(k.id ORDER BY k.id) AS ids
  FROM public.karakteristike_merljive k
  WHERE k.id_deo IS NOT NULL AND trim(k.id_deo) <> ''
    AND k.pogon_kod IS NOT NULL AND trim(k.pogon_kod) <> ''
    AND coalesce(nullif(trim(k.pozicija), ''), nullif(trim(k.sifra_merenja), '')) IS NOT NULL
  GROUP BY 1, 2, 3
  HAVING count(*) > 1
  ORDER BY count(*) DESC, 1
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500));
$$;

CREATE OR REPLACE FUNCTION public.sifrarnik_spremni_batch(
  p_limit int DEFAULT 5000,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id_deo text,
  status_sifrarnik text,
  gu_broj int,
  gr_broj int
)
LANGUAGE sql
STABLE
AS $$
  SELECT mv.id_deo, mv.status_sifrarnik, mv.gu_broj, mv.gr_broj
  FROM public.mv_delovi_sifrarnik_status mv
  JOIN public.delovi d ON d.id = mv.id
  WHERE mv.gu_broj > 0
    AND mv.gr_broj > 0
    AND coalesce(nullif(trim(d.slika_naziv), ''), '') <> ''
    AND mv.status_sifrarnik <> 'kompletan'
  ORDER BY mv.id_deo
  LIMIT greatest(1, least(coalesce(p_limit, 5000), 10000))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.sifrarnik_lista_delovi(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_pretrazi_delovi(text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_kompletnost_stat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_duplikati_dimenzija(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sifrarnik_spremni_batch(int, int) TO authenticated;

COMMENT ON FUNCTION public.sifrarnik_kompletnost_stat IS 'Agregat kompletnosti iz MV — bez JS skena 2k/20k.';
COMMENT ON FUNCTION public.sifrarnik_duplikati_dimenzija IS 'Server-side duplikati pogon+pozicija za Održavanje.';
