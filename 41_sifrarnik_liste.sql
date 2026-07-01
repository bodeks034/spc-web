-- Šifrarnik liste vrednosti (dropdown)
-- Pokreni u Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS sifrarnik_liste_vrednosti (
  id          BIGSERIAL PRIMARY KEY,
  lista_kljuc TEXT NOT NULL,
  vrednost    TEXT NOT NULL,
  redosled    INT NOT NULL DEFAULT 0,
  aktivna     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lista_kljuc, vrednost)
);

CREATE INDEX IF NOT EXISTS idx_sifrarnik_liste_kljuc ON sifrarnik_liste_vrednosti(lista_kljuc, redosled);

ALTER TABLE sifrarnik_liste_vrednosti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_sifrarnik_liste ON sifrarnik_liste_vrednosti;
CREATE POLICY auth_sifrarnik_liste ON sifrarnik_liste_vrednosti
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Stari pogrešni reakcioni planovi
DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = 'Zaustavi liniju — obavesti šefa smene';
DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = 'Karantin serije / lota';
DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = 'Ponovno merenje (5 uzoraka)';
DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = 'Korektivna akcija + 8D';
DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = 'Kalibracija merila pre nastavka';
DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = 'Odobrenje inženjera za nastavak proizvodnje';
DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = 'Sortiranje / selekcija NOK komada';

-- Karakteristike sa brojevima / Ø (ne u dropdown-u)
DELETE FROM sifrarnik_liste_vrednosti
WHERE lista_kljuc = 'karakteristika'
  AND (vrednost ~ '[0-9]' OR vrednost LIKE '%Ø%');

INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Zaustavi proces', 1) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Korekcija alata', 2) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Podešavanje', 3) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Odbaci deo', 4) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Stop proizvodnje', 5) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Korekcija', 6) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Dorada', 7) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Sortiranje', 8) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('reakcioni_plan', 'Čišćenje', 9) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Oznaka dela', 1) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Oštećenje površine', 2) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Oštre ivice', 3) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Paralelnost A-B', 4) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Paralelnost bocnih nosaca', 5) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Paralelnost stranica', 6) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Paralelnost ušica', 7) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Poroznost', 8) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Površinska oštećenja', 9) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Površinska zaštita', 10) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Pozicija rupa X', 11) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Pozicija rupa Y', 12) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Pozicija rupe X', 13) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Pravolinijskost', 14) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Pravougaonost', 15) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Prskanje', 16) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Pukotine', 17) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Radijalno bacanje datum A-B', 18) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Ravnost baze', 19) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Razmak rupa centar-centar', 20) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Sertifikat materijala', 21) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Simetricnost', 22) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Simetričnost rupa', 23) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Simetričnost sklopa', 24) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Srhovi uklonjeni', 25) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Ugao savijanja', 26) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Ukupna dužina', 27) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Ukupna dužina vratila', 28) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Ukupna visina', 29) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Unutrasnja sirina', 30) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Unutrašnji otvor', 31) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Utor A-A dubina', 32) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Utor A-A širina', 33) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Utor B-B dubina', 34) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Utor B-B širina', 35) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Visina nosaca', 36) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Visina savijanja', 37) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Visina vara', 38) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Vizuelna kontrola oštećenja', 39) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Vizuelni izgled', 40) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Čistoća dela', 41) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Širina B', 42) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Širina preseka', 43) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('karakteristika', 'Širina savijanja', 44) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Cigra', 1) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Cigra 0.01mm', 2) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Dokumentacija', 3) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Dubinomer', 4) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Kalibar', 5) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Komparator', 6) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Koordinatni merni sistem', 7) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Mikrometar', 8) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Mikrometar 0-25mm', 9) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Navojni prsten', 10) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Operater', 11) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Pomicno', 12) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Pomicno merilo', 13) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Pomično merilo', 14) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Radius merač', 15) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Rapavomer', 16) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Uglomer', 17) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Vaga', 18) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Vizuelna + šablonska skala', 19) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Vizuelna VT', 20) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Vizuelno', 21) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Šablon', 22) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('instrument', 'Šubler', 23) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', 'mm', 1) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', 'µm', 2) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', 'deg', 3) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', '%', 4) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', 'kom', 5) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', 'N·m', 6) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', 'kg', 7) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;
INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('jedinica', 'Ra', 8) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;

NOTIFY pgrst, 'reload schema';
