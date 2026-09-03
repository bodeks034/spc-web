-- Dashboard: agregacija u bazi umesto prenosa do 10.000 redova u browser.
--
-- RPC-ovi vraćaju već sažete redove po (datum, id_deo), pa klijent zadržava
-- postojeće formule (FPY/RTY/DPMO) nad malim skupom. Time nestaju i tvrdi
-- limiti od 4000 redova koji su tiho iskrivljivali KPI.
--
-- Pokreni posle 89_sifrarnik_linija_i_mv_refresh.sql.

-- ─────────────────────────────────────────────────────────────
-- 1. Mapa deo ↔ linija (zamena za idDeloviZaLinijuFilter u JS-u)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_deo_linija AS
SELECT DISTINCT
  upper(trim(d.id_deo)) AS id_deo,
  lower(trim(l.linija)) AS linija
FROM public.delovi d
JOIN public.linije l ON l.id = d.linija_id
WHERE d.id_deo IS NOT NULL AND trim(d.id_deo) <> ''
  AND l.linija IS NOT NULL AND trim(l.linija) <> ''
  AND coalesce(d.aktivan, true)
UNION
SELECT DISTINCT
  upper(trim(k.id_deo)) AS id_deo,
  lower(trim(k.linija_faza)) AS linija
FROM public.karakteristike_merljive k
WHERE k.id_deo IS NOT NULL AND trim(k.id_deo) <> ''
  AND k.linija_faza IS NOT NULL AND trim(k.linija_faza) <> '';

GRANT SELECT ON public.v_deo_linija TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_delovi_za_liniju(p_linija text)
RETURNS TABLE (id_deo text)
LANGUAGE sql
STABLE
AS $$
  SELECT v.id_deo
  FROM public.v_deo_linija v
  WHERE p_linija IS NOT NULL AND trim(p_linija) <> ''
    AND v.linija = lower(trim(p_linija));
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_delovi_za_liniju(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. Atributivni agregat po (datum, id_deo)
--    NOK se broji po inspekciji (max po batch ključu), isto kao
--    agregirajAtributivneJedinice u src/lib/atributivneAgregacija.js.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dashboard_agregat_attr(
  p_od date,
  p_id_deo text DEFAULT NULL,
  p_linija text DEFAULT NULL,
  p_smena int DEFAULT NULL
)
RETURNS TABLE (
  datum date,
  id_deo text,
  ok int,
  nok int,
  kom_nok int
)
LANGUAGE sql
STABLE
AS $$
  WITH osnov AS (
    SELECT
      kl.datum::date AS datum,
      upper(trim(coalesce(kl.id_deo, '?'))) AS id_deo,
      CASE
        WHEN coalesce(kl.ok_kolicina, 0) + coalesce(kl.nok_kolicina, 0) > 0
          THEN coalesce(kl.ok_kolicina, 0)
        WHEN coalesce(kl.ukupno_merenja, 0) > 0
          AND NOT (upper(coalesce(kl.status, '')) = 'NOK'
                   OR (kl.greska_naziv IS NOT NULL AND kl.greska_naziv <> 'OK'))
          THEN kl.ukupno_merenja
        ELSE 0
      END AS ok_kom,
      -- Namerno samo nok_kolicina: atributivniNokBatchKey u JS-u odbacuje
      -- redove bez nok_kolicina, pa bi svako šire brojanje pomerilo KPI.
      coalesce(kl.nok_kolicina, 0) AS nok_kom,
      coalesce(kl.kom_nok, 0) AS kom_nok,
      coalesce(
        'insp|' || kl.inspekcija_id::text,
        CASE WHEN kl.sesija_id IS NOT NULL AND kl.created_at IS NOT NULL
          THEN 'ses|' || kl.sesija_id::text || '|'
               || to_char(kl.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
        END,
        'id|' || kl.id::text
      ) AS batch_kljuc
    FROM public.kontrolni_log kl
    WHERE kl.datum >= p_od
      AND (p_id_deo IS NULL OR upper(trim(kl.id_deo)) = upper(trim(p_id_deo)))
      AND (p_smena IS NULL OR kl.smena = p_smena)
      AND (
        p_linija IS NULL OR trim(p_linija) = ''
        OR upper(trim(kl.id_deo)) IN (SELECT id_deo FROM public.dashboard_delovi_za_liniju(p_linija))
      )
  ),
  ok_zbir AS (
    SELECT datum, id_deo, sum(ok_kom)::int AS ok, sum(kom_nok)::int AS kom_nok
    FROM osnov GROUP BY 1, 2
  ),
  nok_batch AS (
    SELECT datum, id_deo, batch_kljuc, max(nok_kom) AS nok
    FROM osnov WHERE nok_kom > 0 AND batch_kljuc IS NOT NULL
    GROUP BY 1, 2, 3
  ),
  nok_zbir AS (
    SELECT datum, id_deo, sum(nok)::int AS nok FROM nok_batch GROUP BY 1, 2
  )
  SELECT
    coalesce(o.datum, n.datum) AS datum,
    coalesce(o.id_deo, n.id_deo) AS id_deo,
    coalesce(o.ok, 0) AS ok,
    coalesce(n.nok, 0) AS nok,
    coalesce(o.kom_nok, 0) AS kom_nok
  FROM ok_zbir o
  FULL OUTER JOIN nok_zbir n ON n.datum = o.datum AND n.id_deo = o.id_deo
  ORDER BY 1, 2;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Merljivi agregat po (datum, id_deo)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dashboard_agregat_mer(
  p_od date,
  p_id_deo text DEFAULT NULL,
  p_linija text DEFAULT NULL,
  p_smena int DEFAULT NULL
)
RETURNS TABLE (
  datum date,
  id_deo text,
  n int,
  nok int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.datum::date AS datum,
    upper(trim(coalesce(m.id_deo, '?'))) AS id_deo,
    count(*)::int AS n,
    count(*) FILTER (WHERE upper(coalesce(m.status, '')) = 'NOK')::int AS nok
  FROM public.merenja_varijabilna m
  WHERE m.datum >= p_od
    AND (p_id_deo IS NULL OR upper(trim(m.id_deo)) = upper(trim(p_id_deo)))
    AND (p_smena IS NULL OR m.smena = p_smena)
    AND (
      p_linija IS NULL OR trim(p_linija) = ''
      OR lower(trim(coalesce(m.linija, ''))) = lower(trim(p_linija))
      OR upper(trim(m.id_deo)) IN (SELECT id_deo FROM public.dashboard_delovi_za_liniju(p_linija))
    )
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Pareto (TOP NOK) za oba modula
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dashboard_pareto(
  p_od date,
  p_id_deo text DEFAULT NULL,
  p_linija text DEFAULT NULL,
  p_smena int DEFAULT NULL,
  p_limit int DEFAULT 8
)
RETURNS TABLE (
  izvor text,
  naziv text,
  broj int
)
LANGUAGE sql
STABLE
AS $$
  (
    SELECT 'atributivne'::text AS izvor,
           coalesce(nullif(trim(kl.greska_naziv), ''), '?') AS naziv,
           count(*)::int AS broj
    FROM public.kontrolni_log kl
    WHERE kl.datum >= p_od
      AND kl.greska_naziv IS NOT NULL AND kl.greska_naziv <> 'OK'
      AND (p_id_deo IS NULL OR upper(trim(kl.id_deo)) = upper(trim(p_id_deo)))
      AND (p_smena IS NULL OR kl.smena = p_smena)
      AND (
        p_linija IS NULL OR trim(p_linija) = ''
        OR upper(trim(kl.id_deo)) IN (SELECT id_deo FROM public.dashboard_delovi_za_liniju(p_linija))
      )
    GROUP BY 1, 2
    ORDER BY 3 DESC
    LIMIT greatest(1, least(coalesce(p_limit, 8), 50))
  )
  UNION ALL
  (
    SELECT 'merljive'::text AS izvor,
           coalesce(nullif(trim(m.pozicija), ''), '?') AS naziv,
           count(*)::int AS broj
    FROM public.merenja_varijabilna m
    WHERE m.datum >= p_od
      AND upper(coalesce(m.status, '')) = 'NOK'
      AND (p_id_deo IS NULL OR upper(trim(m.id_deo)) = upper(trim(p_id_deo)))
      AND (p_smena IS NULL OR m.smena = p_smena)
      AND (
        p_linija IS NULL OR trim(p_linija) = ''
        OR lower(trim(coalesce(m.linija, ''))) = lower(trim(p_linija))
        OR upper(trim(m.id_deo)) IN (SELECT id_deo FROM public.dashboard_delovi_za_liniju(p_linija))
      )
    GROUP BY 1, 2
    ORDER BY 3 DESC
    LIMIT greatest(1, least(coalesce(p_limit, 8), 50))
  );
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_agregat_attr(date, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_agregat_mer(date, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_pareto(date, text, text, int, int) TO authenticated;

COMMENT ON FUNCTION public.dashboard_agregat_attr IS 'Atributivni OK/NOK po danu i delu — NOK po inspekciji, bez limita od 4000 redova.';
COMMENT ON FUNCTION public.dashboard_agregat_mer IS 'Merljiva merenja po danu i delu.';
COMMENT ON VIEW public.v_deo_linija IS 'Mapa deo ↔ linija; zamenjuje klijentski idDeloviZaLinijuFilter.';

NOTIFY pgrst, 'reload schema';
