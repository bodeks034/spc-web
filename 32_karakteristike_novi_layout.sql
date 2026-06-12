-- karakteristike_merljive — puni layout (jedan Excel tab, bez Definicija_Karakteristika)

ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS radni_nalog TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS naziv_dela TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS slika TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS linija_id INT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS masina_id INT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS ukupno_kom INT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS kom_za_kontrolu_n INT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS nivo_kontrole TEXT;

COMMENT ON COLUMN karakteristike_merljive.ukupno_kom IS 'Ukupna količina na RN (iz Excel kolone ukupno_kom)';
COMMENT ON COLUMN karakteristike_merljive.nivo_kontrole IS 'Nivo kontrole (DA/NE ili opis faze)';
COMMENT ON COLUMN karakteristike_merljive.kom_za_kontrolu_n IS 'Broj uzoraka u seriji / komada za kontrolu';
