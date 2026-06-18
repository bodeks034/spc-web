-- Jedinstvenost karakteristike po pogonu (posle 29_sop_pogon_kod.sql)
-- Stari UNIQUE (id_deo, sifra_merenja, pozicija) ne dozvoljava istu dimenziju na pogons A i B.

UPDATE karakteristike_merljive
SET pogon_kod = 'A'
WHERE pogon_kod IS NULL OR TRIM(pogon_kod) = '';

ALTER TABLE karakteristike_merljive
  DROP CONSTRAINT IF EXISTS karakteristike_merljive_id_deo_sifra_merenja_pozicija_key;

ALTER TABLE karakteristike_merljive
  ADD CONSTRAINT karakteristike_merljive_id_deo_pogon_sifra_pozicija_key
  UNIQUE (id_deo, pogon_kod, sifra_merenja, pozicija);

ALTER TABLE karakteristike_merljive ALTER COLUMN pogon_kod SET DEFAULT 'A';

COMMENT ON CONSTRAINT karakteristike_merljive_id_deo_pogon_sifra_pozicija_key
  ON karakteristike_merljive IS
  'Jedna dimenzija po seriji (sifra_merenja) unutar dela i pogona.';

NOTIFY pgrst, 'reload schema';
