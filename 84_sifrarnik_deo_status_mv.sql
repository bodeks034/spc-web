-- Materialized view statusa delova u šifrarniku (posle 82_sifrarnik_filter_rpc.sql)

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_delovi_sifrarnik_status AS
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
)
SELECT
  d.id,
  d.id_deo,
  d.naziv_dela,
  d.tip_kontrole,
  d.slika_naziv,
  d.aktivan,
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
WHERE coalesce(d.aktivan, true) = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_delovi_status_id_deo
  ON public.mv_delovi_sifrarnik_status (upper(trim(id_deo)));

CREATE OR REPLACE FUNCTION public.refresh_sifrarnik_deo_status_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_delovi_sifrarnik_status;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_delovi_sifrarnik_status;
END;
$$;

GRANT SELECT ON public.mv_delovi_sifrarnik_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sifrarnik_deo_status_mv() TO authenticated;
