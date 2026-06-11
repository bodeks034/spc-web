-- Pogon A-H + kolone serija/faza (ukljucuje 28_karakteristike_serija_merljive.sql)
-- Pokreni CELOM u Supabase SQL Editoru (Run), posle 11_varijabilne_schema.sql

-- karakteristike_merljive
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS broj_merenja INT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS faza_naziv TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS linija_faza TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS pogon_kod TEXT;

-- radni_nalozi, merenja, kontrolni_log
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS pogon_kod TEXT;
ALTER TABLE merenja_varijabilna ADD COLUMN IF NOT EXISTS pogon_kod TEXT;
ALTER TABLE kontrolni_log ADD COLUMN IF NOT EXISTS pogon_kod TEXT;

-- SOP: vise redova po delu
ALTER TABLE sop_deo_varijabilni ADD COLUMN IF NOT EXISTS pogon_kod TEXT;

UPDATE sop_deo_varijabilni SET pogon_kod = 'A' WHERE pogon_kod IS NULL OR pogon_kod = '';

ALTER TABLE sop_deo_varijabilni ALTER COLUMN pogon_kod SET DEFAULT 'A';
ALTER TABLE sop_deo_varijabilni ALTER COLUMN pogon_kod SET NOT NULL;

ALTER TABLE sop_deo_varijabilni DROP CONSTRAINT IF EXISTS sop_deo_varijabilni_pkey;
ALTER TABLE sop_deo_varijabilni ADD PRIMARY KEY (id_deo, pogon_kod);

CREATE INDEX IF NOT EXISTS idx_kar_pogon ON karakteristike_merljive (id_deo, pogon_kod);
CREATE INDEX IF NOT EXISTS idx_rn_pogon ON radni_nalozi (id_deo, pogon_kod);
CREATE INDEX IF NOT EXISTS idx_mer_pogon ON merenja_varijabilna (id_deo, pogon_kod);
CREATE INDEX IF NOT EXISTS idx_log_pogon ON kontrolni_log (id_deo, pogon_kod);

NOTIFY pgrst, 'reload schema';
