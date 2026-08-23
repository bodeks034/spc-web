-- Arhiva audit loga starijeg od N meseci (posle 84_sifrarnik_deo_status_mv.sql)

CREATE TABLE IF NOT EXISTS public.sifrarnik_audit_arhiva (
  LIKE public.sifrarnik_audit INCLUDING ALL
);

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

GRANT EXECUTE ON FUNCTION public.sifrarnik_audit_arhiviraj(int) TO authenticated;

COMMENT ON FUNCTION public.sifrarnik_audit_arhiviraj IS
  'Premesti audit zapise starije od p_meseci u sifrarnik_audit_arhiva.';
