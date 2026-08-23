-- Audit log izmena u Modulu 0 (šifrarnik)
-- Pokreni posle 79_obrisi_demo_delove_rpc.sql

CREATE TABLE IF NOT EXISTS public.sifrarnik_audit (
  id bigserial PRIMARY KEY,
  id_deo text,
  akcija text NOT NULL,
  izvor text,
  detalji jsonb,
  korisnik text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sifrarnik_audit_id_deo ON public.sifrarnik_audit (upper(trim(id_deo)));
CREATE INDEX IF NOT EXISTS idx_sifrarnik_audit_created ON public.sifrarnik_audit (created_at DESC);

COMMENT ON TABLE public.sifrarnik_audit IS 'Istorija ključnih akcija u šifrarniku (objava, brisanje, ERP).';
