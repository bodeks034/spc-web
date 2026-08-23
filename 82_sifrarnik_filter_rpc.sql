-- Server-side filter delova po statusu šifrarnika (Modul 0 → Delovi)
-- Posle 81_sifrarnik_audit_rls.sql

DROP FUNCTION IF EXISTS public.sifrarnik_filter_delovi(text, boolean, boolean, text, int, int);

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
  status_sifrarnik text
)
LANGUAGE sql
STABLE
AS $$
  WITH gu AS (
    SELECT upper(trim(id_deo)) AS id_deo, count(*)::int AS broj
    FROM glavni_unos_redovi
    WHERE id_deo IS NOT NULL AND trim(id_deo) <> ''
    GROUP BY 1
  ),
  gr AS (
    SELECT upper(trim(id_deo)) AS id_deo, count(*)::int AS broj
    FROM greske_katalog
    WHERE id_deo IS NOT NULL AND trim(id_deo) <> ''
    GROUP BY 1
  ),
  bk AS (
    SELECT DISTINCT upper(trim(id_deo)) AS id_deo
    FROM barkod_profili
    WHERE id_deo IS NOT NULL AND trim(id_deo) <> ''
  ),
  enriched AS (
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
      coalesce(gu.broj, 0) AS gu_broj,
      coalesce(gr.broj, 0) AS gr_broj,
      (bk.id_deo IS NOT NULL) AS ima_barkod,
      CASE
        WHEN coalesce(gr.broj, 0) > 0
          AND coalesce(nullif(trim(d.slika_naziv), ''), '') <> ''
          AND (coalesce(gu.broj, 0) > 0 OR bk.id_deo IS NOT NULL)
          THEN 'kompletan'
        WHEN coalesce(gu.broj, 0) > 0
          OR coalesce(gr.broj, 0) > 0
          OR coalesce(nullif(trim(d.slika_naziv), ''), '') <> ''
          THEN 'delimicno'
        ELSE 'samo_master'
      END AS status_sifrarnik
    FROM delovi d
    LEFT JOIN gu ON gu.id_deo = upper(trim(d.id_deo))
    LEFT JOIN gr ON gr.id_deo = upper(trim(d.id_deo))
    LEFT JOIN bk ON bk.id_deo = upper(trim(d.id_deo))
    WHERE coalesce(d.aktivan, true) = true
      AND (p_tip_kontrole IS NULL OR d.tip_kontrole = p_tip_kontrole)
  ),
  filtered AS (
    SELECT e.*
    FROM enriched e
    WHERE
      (NOT coalesce(p_samo_demo, false)
        OR upper(e.id_deo) ~ '^(DEMO|TEST|SAMPLE|XXX)[-_]')
      AND (NOT coalesce(p_samo_delimicni, false)
        OR e.status_sifrarnik IN ('delimicno', 'samo_master'))
      AND (
        p_nedostaje IS NULL OR trim(p_nedostaje) = ''
        OR (p_nedostaje = 'gu' AND e.gu_broj = 0)
        OR (p_nedostaje = 'greske' AND e.gr_broj = 0)
        OR (p_nedostaje = 'crtez' AND coalesce(nullif(trim(e.slika_naziv), ''), '') = '')
        OR (p_nedostaje = 'barkod' AND NOT e.ima_barkod AND e.gu_broj > 0)
      )
  )
  SELECT
    f.id,
    f.id_deo,
    f.naziv_dela,
    f.karakteristika,
    f.tip_kontrole,
    f.vozilo_katalog_id,
    f.sifra_vozila,
    f.broj_crteza,
    f.revizija,
    f.slika_naziv,
    f.aktivan,
    f.napomena,
    f.kom_za_kontrolu,
    f.greska_katalog_id,
    f.linija_id,
    f.masina_id,
    f.status_sifrarnik
  FROM filtered f
  ORDER BY f.id_deo
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
  OFFSET greatest(0, coalesce(p_offset, 0));
$$;

GRANT EXECUTE ON FUNCTION public.sifrarnik_filter_delovi(text, boolean, boolean, text, int, int) TO authenticated;

COMMENT ON FUNCTION public.sifrarnik_filter_delovi IS
  'Paginirani filter delova po statusu šifrarnika (nedostaje GU/greške/crtež/barkod, demo, delimični).';
