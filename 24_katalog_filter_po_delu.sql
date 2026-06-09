-- Filter kataloga grešaka po delu / modelu vozila
-- Pokreni u Supabase SQL Editoru (jednom).

-- Delovi: opcioni ključ za katalog grešaka (pojedinačni delovi)
ALTER TABLE delovi
  ADD COLUMN IF NOT EXISTS greska_katalog_id TEXT;

COMMENT ON COLUMN delovi.greska_katalog_id IS
  'Opciono: GRUPA-5502, 5502-A… — filtrira greske_katalog. Prazno = po id_deo ili zajednički katalog.';

COMMENT ON COLUMN delovi.vozilo_katalog_id IS
  'Opciono: SUV, SEDAN, FINAL-001… — filtrira katalog_gresaka_vozilo (vozilo_id = ključ ili SUV-KAROS-001).';

-- Greške za delove: opcioni id_deo ili katalog_id (prazno = zajednički)
ALTER TABLE greske_katalog
  ADD COLUMN IF NOT EXISTS id_deo TEXT,
  ADD COLUMN IF NOT EXISTS katalog_id TEXT;

COMMENT ON COLUMN greske_katalog.id_deo IS
  'Samo za ovaj deo (npr. 5502-A). Prazno = nije vezano za jedan deo.';

COMMENT ON COLUMN greske_katalog.katalog_id IS
  'Grupa kataloga (npr. GRUPA-VAR). Povezuje se sa delovi.greska_katalog_id.';

CREATE INDEX IF NOT EXISTS idx_greske_katalog_id_deo ON greske_katalog (id_deo) WHERE id_deo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_greske_katalog_katalog_id ON greske_katalog (katalog_id) WHERE katalog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_katalog_vozilo_vozilo_id ON katalog_gresaka_vozilo (vozilo_id);
