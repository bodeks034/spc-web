-- ============================================================
-- Dopuna tabele + RLS (pokreni POSLE 03 i 04 u SQL Editoru)
-- Omogućava aplikaciji čitanje/upis svih potrebnih tabela
-- ============================================================

-- Kolona tip_kontrole na delovima (deo | vozilo)
ALTER TABLE delovi
  ADD COLUMN IF NOT EXISTS tip_kontrole TEXT NOT NULL DEFAULT 'deo'
    CHECK (tip_kontrole IN ('deo', 'vozilo'));

ALTER TABLE delovi
  ADD COLUMN IF NOT EXISTS vozilo_katalog_id TEXT;

COMMENT ON COLUMN delovi.tip_kontrole IS 'deo = samo kat/podkat; vozilo = uključuje defekt iz katalog_gresaka_vozilo';
COMMENT ON COLUMN delovi.vozilo_katalog_id IS 'FK logički na katalog_gresaka_vozilo.vozilo_id (npr. FINAL-001)';

-- Ispravka referenci delova (linija_id / tip) ako su već uvezeni pogrešno
UPDATE delovi SET linija_id = 12, masina_id = 1, tip_kontrole = 'deo'
  WHERE id_deo = '5501-A';
UPDATE delovi SET linija_id = 1, masina_id = 2, tip_kontrole = 'deo'
  WHERE id_deo = '5502-A';
UPDATE delovi SET linija_id = 30, masina_id = 3, tip_kontrole = 'deo'
  WHERE id_deo = '5503-A';
UPDATE delovi SET linija_id = 12, masina_id = 1, tip_kontrole = 'deo'
  WHERE id_deo = '5504-B';
UPDATE delovi SET linija_id = 12, masina_id = 2, tip_kontrole = 'deo'
  WHERE id_deo = '5505-B';
UPDATE delovi SET linija_id = 48, masina_id = 1, tip_kontrole = 'vozilo', vozilo_katalog_id = 'FINAL-001'
  WHERE id_deo = 'AUTO-001';

-- Seed delova ako tabela prazna (pre CSV importa)
INSERT INTO delovi (id_deo, naziv_dela, karakteristika, linija_id, masina_id, kom_za_kontrolu, slika_naziv, aktivan, napomena, tip_kontrole, vozilo_katalog_id) VALUES
  ('5501-A', 'Nosac', 'Vizuelna kontrola vara i zazora', 12, 1, 30, 'Nosac_SOP.jpg', true, 'Karoserija linija', 'deo', NULL),
  ('5502-A', 'Osovina', 'Vizuelna kontrola povrsine i montaze', 1, 2, 20, 'Osovina_SOP.jpg', true, 'Preseraj linija', 'deo', NULL),
  ('5503-A', 'Poklopac', 'Kontrola zazora i brtvljenja', 30, 3, 25, 'Poklopac_SOP.jpg', true, 'Montaza finalna', 'deo', NULL),
  ('5504-B', 'Nosac motor', 'Vizuelna i funkcionalna kontrola', 12, 1, 30, NULL, true, NULL, 'deo', NULL),
  ('5505-B', 'Konzola', 'Kontrola vara i dimenzija', 12, 2, 20, NULL, true, NULL, 'deo', NULL),
  ('AUTO-001', 'Automobil-komplet', 'Finalna vizuelna kontrola celog vozila', 48, 1, 5, 'Auto_final_SOP.jpg', true, 'Koristiti za finalnu kontrolu', 'vozilo', 'FINAL-001')
ON CONFLICT (id_deo) DO UPDATE SET
  naziv_dela = EXCLUDED.naziv_dela,
  karakteristika = EXCLUDED.karakteristika,
  linija_id = EXCLUDED.linija_id,
  masina_id = EXCLUDED.masina_id,
  kom_za_kontrolu = EXCLUDED.kom_za_kontrolu,
  slika_naziv = EXCLUDED.slika_naziv,
  aktivan = EXCLUDED.aktivan,
  napomena = EXCLUDED.napomena,
  tip_kontrole = EXCLUDED.tip_kontrole,
  vozilo_katalog_id = EXCLUDED.vozilo_katalog_id;

-- Referentne linije za delove (pun katalog ide iz linije.csv importa)
INSERT INTO linije (id, linija, proces, operacija) VALUES
  (1,  'Preseraj', 'Priprema materijala', 'Savijanje'),
  (12, 'Karoserija', 'Podsklopovi sklapanje', 'Lucno zavarivanje'),
  (30, 'Montaza', 'Kompletiranje vozila finalno', 'Ugradnja motora'),
  (48, 'Zavrsna kontrola', 'Potvrda kvaliteta proizvoda', 'Vizuelni pregled')
ON CONFLICT (id) DO UPDATE SET linija = EXCLUDED.linija;

-- Mašine (minimum za FK delova)
INSERT INTO masine (id, naziv, linija) VALUES
  (1, 'Masina M1', 'Karoserija'),
  (2, 'Masina M2', 'Preseraj'),
  (3, 'Masina M3', 'Montaza')
ON CONFLICT (id) DO UPDATE SET
  naziv = EXCLUDED.naziv,
  linija = EXCLUDED.linija;

-- Smene
INSERT INTO smene (id, naziv, pocetak, kraj) VALUES
  (1, 'Smena 1', '06:00', '14:00'),
  (2, 'Smena 2', '14:00', '22:00'),
  (3, 'Smena 3', '22:00', '06:00')
ON CONFLICT (id) DO UPDATE SET
  naziv = EXCLUDED.naziv,
  pocetak = EXCLUDED.pocetak,
  kraj = EXCLUDED.kraj;

-- ─── RLS: omotnice za authenticated ─────────────────────────

ALTER TABLE linije ENABLE ROW LEVEL SECURITY;
ALTER TABLE masine ENABLE ROW LEVEL SECURITY;
ALTER TABLE smene ENABLE ROW LEVEL SECURITY;
ALTER TABLE katalog_gresaka_vozilo ENABLE ROW LEVEL SECURITY;
ALTER TABLE kupci ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciljevi ENABLE ROW LEVEL SECURITY;
ALTER TABLE merila ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalibracije ENABLE ROW LEVEL SECURITY;
ALTER TABLE eskalacije ENABLE ROW LEVEL SECURITY;
ALTER TABLE osmd_izvestaji ENABLE ROW LEVEL SECURITY;
ALTER TABLE prekidi_zahtevi ENABLE ROW LEVEL SECURITY;
ALTER TABLE analiza_kontrolor ENABLE ROW LEVEL SECURITY;
ALTER TABLE analiza_masina ENABLE ROW LEVEL SECURITY;
ALTER TABLE analiza_smena ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpmo ENABLE ROW LEVEL SECURITY;
ALTER TABLE pareto ENABLE ROW LEVEL SECURITY;

-- Linije / mašine / smene / katalog vozila
DROP POLICY IF EXISTS "auth_read_linije" ON linije;
CREATE POLICY "auth_read_linije" ON linije FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_masine" ON masine;
CREATE POLICY "auth_read_masine" ON masine FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_smene" ON smene;
CREATE POLICY "auth_read_smene" ON smene FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_katalog_vozilo" ON katalog_gresaka_vozilo;
CREATE POLICY "auth_read_katalog_vozilo" ON katalog_gresaka_vozilo FOR SELECT USING (auth.role() = 'authenticated');

-- Delovi: read + update (upload slike)
DROP POLICY IF EXISTS "auth_update_delovi" ON delovi;
CREATE POLICY "auth_update_delovi" ON delovi FOR UPDATE USING (auth.role() = 'authenticated');

-- Radni nalozi: insert (modul NALOZI)
DROP POLICY IF EXISTS "auth_insert_radni_nalozi" ON radni_nalozi;
CREATE POLICY "auth_insert_radni_nalozi" ON radni_nalozi FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Kupci
DROP POLICY IF EXISTS "auth_read_kupci" ON kupci;
CREATE POLICY "auth_read_kupci" ON kupci FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_kupci" ON kupci;
CREATE POLICY "auth_insert_kupci" ON kupci FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Ciljevi
DROP POLICY IF EXISTS "auth_read_ciljevi" ON ciljevi;
CREATE POLICY "auth_read_ciljevi" ON ciljevi FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_ciljevi" ON ciljevi;
CREATE POLICY "auth_insert_ciljevi" ON ciljevi FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Merila + kalibracije
DROP POLICY IF EXISTS "auth_read_merila" ON merila;
CREATE POLICY "auth_read_merila" ON merila FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_merila" ON merila;
CREATE POLICY "auth_insert_merila" ON merila FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_kalibracije" ON kalibracije;
CREATE POLICY "auth_read_kalibracije" ON kalibracije FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_kalibracije" ON kalibracije;
CREATE POLICY "auth_insert_kalibracije" ON kalibracije FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Eskalacije
DROP POLICY IF EXISTS "auth_read_eskalacije" ON eskalacije;
CREATE POLICY "auth_read_eskalacije" ON eskalacije FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_eskalacije" ON eskalacije;
CREATE POLICY "auth_insert_eskalacije" ON eskalacije FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_eskalacije" ON eskalacije;
CREATE POLICY "auth_update_eskalacije" ON eskalacije FOR UPDATE USING (auth.role() = 'authenticated');

-- 8D izveštaji
DROP POLICY IF EXISTS "auth_read_osmd" ON osmd_izvestaji;
CREATE POLICY "auth_read_osmd" ON osmd_izvestaji FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_osmd" ON osmd_izvestaji;
CREATE POLICY "auth_insert_osmd" ON osmd_izvestaji FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_osmd" ON osmd_izvestaji;
CREATE POLICY "auth_update_osmd" ON osmd_izvestaji FOR UPDATE USING (auth.role() = 'authenticated');

-- Prekidi serije
DROP POLICY IF EXISTS "auth_read_prekidi" ON prekidi_zahtevi;
CREATE POLICY "auth_read_prekidi" ON prekidi_zahtevi FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_insert_prekidi" ON prekidi_zahtevi;
CREATE POLICY "auth_insert_prekidi" ON prekidi_zahtevi FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_update_prekidi" ON prekidi_zahtevi;
CREATE POLICY "auth_update_prekidi" ON prekidi_zahtevi FOR UPDATE USING (auth.role() = 'authenticated');

-- Radnici: update uloge (admin panel)
DROP POLICY IF EXISTS "auth_update_radnici" ON radnici;
CREATE POLICY "auth_update_radnici" ON radnici FOR UPDATE USING (auth.role() = 'authenticated');

-- Analitičke tabele (dashboard)
DROP POLICY IF EXISTS "auth_read_analiza_kontrolor" ON analiza_kontrolor;
CREATE POLICY "auth_read_analiza_kontrolor" ON analiza_kontrolor FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_read_analiza_masina" ON analiza_masina;
CREATE POLICY "auth_read_analiza_masina" ON analiza_masina FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_read_analiza_smena" ON analiza_smena;
CREATE POLICY "auth_read_analiza_smena" ON analiza_smena FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_read_dpmo" ON dpmo;
CREATE POLICY "auth_read_dpmo" ON dpmo FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_read_pareto" ON pareto;
CREATE POLICY "auth_read_pareto" ON pareto FOR SELECT USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
