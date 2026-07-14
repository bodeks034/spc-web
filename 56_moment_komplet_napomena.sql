-- Kompletan šifrarnik momentnog ključa (7 sklopova) — alternativa dugmetu u aplikaciji
-- Pokreni posle 54_crtez_assets_moment.sql
-- Napomena: puni podaci su u src/data/momentKljucKomplet.json — preporuka: Modul 0 → Moment ključ → Učitaj kompletan šifrarnik

DO $$
BEGIN
  RAISE NOTICE 'Za kompletan uvoz koristite UI: Šifrarnik → Moment ključ → Učitaj kompletan šifrarnik';
  RAISE NOTICE 'ili npm run seed:moment-kljuc (ako je skripta dostupna)';
END $$;
