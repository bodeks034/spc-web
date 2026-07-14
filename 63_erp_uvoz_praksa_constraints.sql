-- ERP uvoz — dodatni UNIQUE indeksi za praktične entitete
-- Pokreni posle 62_erp_uvoz_constraints.sql

-- Merila: lookup po serijskom broju (EQUI / inventarski)
CREATE UNIQUE INDEX IF NOT EXISTS idx_merila_serijski_unique
  ON merila (serijski_broj)
  WHERE serijski_broj IS NOT NULL AND TRIM(serijski_broj) <> '';

NOTIFY pgrst, 'reload schema';
