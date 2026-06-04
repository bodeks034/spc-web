-- Foto greške i komentar na NOK merenjima (merljive)
-- Pokreni u Supabase SQL Editoru posle 11_varijabilne_schema.sql

ALTER TABLE merenja_varijabilna
  ADD COLUMN IF NOT EXISTS foto TEXT,
  ADD COLUMN IF NOT EXISTS komentar TEXT;

COMMENT ON COLUMN merenja_varijabilna.foto IS 'Base64 data URL (JPEG), opciono za NOK';
COMMENT ON COLUMN merenja_varijabilna.komentar IS 'Kratka napomena uz NOK merenje';

NOTIFY pgrst, 'reload schema';
