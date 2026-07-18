-- ERP master podaci v2 — praktičan proizvodni/QMS obim.
-- Pokrenuti posle 66_linija_pouzdanost.sql.

BEGIN;

-- Stabilne ERP šifre i poslovna polja na postojećim tabelama.
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS sifra_kupca TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS skraceni_naziv TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS drzava TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS grad TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS adresa TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS pib TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS kontakt TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS telefon TEXT;
ALTER TABLE kupci ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_kupci_sifra_erp
  ON kupci (sifra_kupca) WHERE NULLIF(TRIM(sifra_kupca), '') IS NOT NULL;

ALTER TABLE tipovi_vozila ADD COLUMN IF NOT EXISTS platforma TEXT;
ALTER TABLE tipovi_vozila ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE tipovi_vozila ADD COLUMN IF NOT EXISTS godiste INT;
ALTER TABLE tipovi_vozila ADD COLUMN IF NOT EXISTS sifra_kupca TEXT;

ALTER TABLE delovi ADD COLUMN IF NOT EXISTS sifra_vozila TEXT;
ALTER TABLE delovi ADD COLUMN IF NOT EXISTS broj_crteza TEXT;
ALTER TABLE delovi ADD COLUMN IF NOT EXISTS revizija TEXT;
ALTER TABLE delovi ADD COLUMN IF NOT EXISTS sifra_materijala TEXT;
ALTER TABLE delovi ADD COLUMN IF NOT EXISTS masa NUMERIC;
ALTER TABLE delovi ADD COLUMN IF NOT EXISTS jedinica_mere TEXT;

ALTER TABLE linije ADD COLUMN IF NOT EXISTS sifra_linije TEXT;
ALTER TABLE linije ADD COLUMN IF NOT EXISTS pogon_kod TEXT;
ALTER TABLE linije ADD COLUMN IF NOT EXISTS opis TEXT;
ALTER TABLE linije ADD COLUMN IF NOT EXISTS aktivna BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_linije_sifra_erp
  ON linije (sifra_linije) WHERE NULLIF(TRIM(sifra_linije), '') IS NOT NULL;

ALTER TABLE masine ADD COLUMN IF NOT EXISTS sifra_masine TEXT;
ALTER TABLE masine ADD COLUMN IF NOT EXISTS sifra_radnog_centra TEXT;
ALTER TABLE masine ADD COLUMN IF NOT EXISTS proizvodjac TEXT;
ALTER TABLE masine ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE masine ADD COLUMN IF NOT EXISTS serijski_broj TEXT;
ALTER TABLE masine ADD COLUMN IF NOT EXISTS godina INT;
ALTER TABLE masine ADD COLUMN IF NOT EXISTS aktivna BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_masine_sifra_erp
  ON masine (sifra_masine) WHERE NULLIF(TRIM(sifra_masine), '') IS NOT NULL;

ALTER TABLE smene ADD COLUMN IF NOT EXISTS sifra_smene TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_smene_sifra_erp
  ON smene (sifra_smene) WHERE NULLIF(TRIM(sifra_smene), '') IS NOT NULL;

ALTER TABLE radnici ADD COLUMN IF NOT EXISTS broj_zaposlenog TEXT;
ALTER TABLE radnici ADD COLUMN IF NOT EXISTS prezime TEXT;
ALTER TABLE radnici ADD COLUMN IF NOT EXISTS odeljenje TEXT;
ALTER TABLE radnici ADD COLUMN IF NOT EXISTS kvalifikacija TEXT;
ALTER TABLE radnici ADD COLUMN IF NOT EXISTS sifra_smene TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_radnici_broj_zaposlenog
  ON radnici (broj_zaposlenog) WHERE NULLIF(TRIM(broj_zaposlenog), '') IS NOT NULL;

ALTER TABLE merila ADD COLUMN IF NOT EXISTS sifra_merila TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS proizvodjac TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS tacnost TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS jedinica_mere TEXT;
ALTER TABLE merila ADD COLUMN IF NOT EXISTS period_kalibracije_meseci INT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_merila_sifra_erp
  ON merila (sifra_merila) WHERE NULLIF(TRIM(sifra_merila), '') IS NOT NULL;

ALTER TABLE kalibracije ADD COLUMN IF NOT EXISTS laboratorija TEXT;

ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS revizija TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS sifra_linije TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS sifra_masine TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS sifra_smene TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS broj_zaposlenog TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS broj_serije TEXT;
ALTER TABLE radni_nalozi ADD COLUMN IF NOT EXISTS datum_proizvodnje DATE;

ALTER TABLE crtez_assets ADD COLUMN IF NOT EXISTS broj_crteza TEXT;
ALTER TABLE crtez_assets ADD COLUMN IF NOT EXISTS datum_revizije DATE;
ALTER TABLE crtez_assets ADD COLUMN IF NOT EXISTS odobrio TEXT;
ALTER TABLE crtez_assets ADD COLUMN IF NOT EXISTS naziv_fajla TEXT;

ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS sifra_karakteristike TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS revizija TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS sifra_operacije TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS tip_karakteristike TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS sifra_merila TEXT;
ALTER TABLE karakteristike_merljive ADD COLUMN IF NOT EXISTS kriticna_karakteristika BOOLEAN DEFAULT FALSE;

-- Novi ERP šifrarnici. Ključevi ostaju SAP/ERP tekstualne šifre radi stabilnog upserta.
CREATE TABLE IF NOT EXISTS dobavljaci (
  sifra_dobavljaca TEXT PRIMARY KEY,
  naziv_dobavljaca TEXT NOT NULL,
  drzava TEXT,
  grad TEXT,
  pib TEXT,
  kontakt TEXT,
  telefon TEXT,
  email TEXT,
  aktivan BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radni_centri (
  sifra_radnog_centra TEXT PRIMARY KEY,
  sifra_linije TEXT,
  naziv_radnog_centra TEXT NOT NULL,
  aktivan BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operacije (
  sifra_operacije TEXT NOT NULL,
  id_deo TEXT NOT NULL,
  broj_operacije TEXT,
  naziv_operacije TEXT NOT NULL,
  sifra_radnog_centra TEXT,
  sifra_masine TEXT,
  vreme_ciklusa_min NUMERIC,
  vreme_pripreme_min NUMERIC,
  aktivna BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_deo, sifra_operacije)
);

CREATE TABLE IF NOT EXISTS materijali (
  sifra_materijala TEXT PRIMARY KEY,
  naziv_materijala TEXT NOT NULL,
  standard TEXT,
  debljina NUMERIC,
  jedinica_mere TEXT,
  sifra_dobavljaca TEXT,
  aktivan BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sastavnica (
  nadredjeni_deo TEXT NOT NULL,
  podredjeni_deo TEXT NOT NULL,
  kolicina NUMERIC NOT NULL DEFAULT 1,
  jedinica_mere TEXT,
  revizija TEXT NOT NULL DEFAULT 'A',
  aktivna BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (nadredjeni_deo, podredjeni_deo, revizija)
);

CREATE TABLE IF NOT EXISTS skladista (
  sifra_skladista TEXT PRIMARY KEY,
  naziv_skladista TEXT NOT NULL,
  opis TEXT,
  aktivno BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lokacije (
  sifra_lokacije TEXT NOT NULL,
  sifra_skladista TEXT NOT NULL,
  regal TEXT,
  polica TEXT,
  pozicija TEXT,
  aktivna BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sifra_skladista, sifra_lokacije)
);

CREATE TABLE IF NOT EXISTS serije (
  broj_serije TEXT NOT NULL,
  id_deo TEXT NOT NULL,
  datum_proizvodnje DATE,
  kolicina NUMERIC,
  status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_deo, broj_serije)
);

CREATE TABLE IF NOT EXISTS serijski_brojevi (
  serijski_broj TEXT PRIMARY KEY,
  broj_serije TEXT,
  id_deo TEXT NOT NULL,
  datum_proizvodnje DATE,
  status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotentni ERP ključevi za dokumentacione stavke.
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS erp_kljuc TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS sifra_operacije TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS preventivna_kontrola TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS detekciona_kontrola TEXT;
ALTER TABLE pfmea_stavke ADD COLUMN IF NOT EXISTS ap TEXT;
ALTER TABLE control_plan_stavke ADD COLUMN IF NOT EXISTS erp_kljuc TEXT;
ALTER TABLE control_plan_stavke ADD COLUMN IF NOT EXISTS sifra_operacije TEXT;
ALTER TABLE control_plan_stavke ADD COLUMN IF NOT EXISTS sifra_karakteristike TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pfmea_stavke_erp_kljuc
  ON pfmea_stavke (erp_kljuc) WHERE NULLIF(TRIM(erp_kljuc), '') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_control_plan_stavke_erp_kljuc
  ON control_plan_stavke (erp_kljuc) WHERE NULLIF(TRIM(erp_kljuc), '') IS NOT NULL;

-- Audit paketa i odbačenih redova.
CREATE TABLE IF NOT EXISTS erp_uvoz_batch (
  id UUID PRIMARY KEY,
  izvor TEXT NOT NULL,
  preset TEXT,
  status TEXT NOT NULL CHECK (status IN ('pokrenut','uspeh','greska','dry-run')),
  ukupno_redova INT NOT NULL DEFAULT 0,
  validnih INT NOT NULL DEFAULT 0,
  upsertovano INT NOT NULL DEFAULT 0,
  upozorenja INT NOT NULL DEFAULT 0,
  detalj JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS erp_uvoz_reject (
  id BIGSERIAL PRIMARY KEY,
  batch_id UUID REFERENCES erp_uvoz_batch(id) ON DELETE CASCADE,
  entitet TEXT NOT NULL,
  fajl TEXT,
  poruka TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kompatibilno sa postojećim Admin uploadom (authenticated) i server importom.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'dobavljaci','radni_centri','operacije','materijali','sastavnica',
    'skladista','lokacije','serije','serijski_brojevi','erp_uvoz_batch','erp_uvoz_reject'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_read_%I ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all_%I ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY auth_all_%I ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated, service_role', t);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON SEQUENCE erp_uvoz_reject_id_seq TO authenticated, service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
