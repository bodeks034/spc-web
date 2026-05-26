-- ============================================================
-- SPC ATRIBUTIVNE KONTROLE - Supabase Schema
-- Korak 1: Kreiranje tabela
-- ============================================================

-- -------------------------------------------------------------
-- 1. LOOKUP TABELE (zamena za Sheet "Linije")
-- -------------------------------------------------------------
CREATE TABLE linije (
  id         SERIAL PRIMARY KEY,
  linija     TEXT NOT NULL,
  proces     TEXT,
  operacija  TEXT
);

CREATE TABLE greske_katalog (
  id            SERIAL PRIMARY KEY,
  kategorija    TEXT NOT NULL,   -- LOS VAR, ZAZOR, POVRSINA, DIMENZIJA...
  podkategorija TEXT NOT NULL    -- Rupa u varu, Prevelik, Udubljenje...
);

CREATE TABLE masine (
  id      SERIAL PRIMARY KEY,
  naziv   TEXT NOT NULL UNIQUE  -- Mašina: M1, M2, M3...
);

CREATE TABLE smene (
  id    SERIAL PRIMARY KEY,
  naziv TEXT NOT NULL UNIQUE    -- Smena 1, Smena 2, Smena 3
);

-- -------------------------------------------------------------
-- 2. DELOVI I SOP DEFINICIJE (zamena za "SOP" sheet)
-- -------------------------------------------------------------
CREATE TABLE delovi (
  id               SERIAL PRIMARY KEY,
  id_deo           TEXT NOT NULL UNIQUE,  -- 5501-A, 5502-B...
  naziv_dela       TEXT NOT NULL,
  karakteristika   TEXT,
  lsl              TEXT,                  -- TEXT jer može biti "44° 44' 44''"
  usl              TEXT,
  target           TEXT,
  jedinica_mere    TEXT,                  -- mm, step, °
  slika_naziv      TEXT,                  -- Deo1.jpg
  linija_id        INT REFERENCES linije(id),
  masina_id        INT REFERENCES masine(id)
);

-- -------------------------------------------------------------
-- 3. KORISNICI / OPERATERI / KONTROLORI
-- -------------------------------------------------------------
CREATE TABLE radnici (
  id       SERIAL PRIMARY KEY,
  ime      TEXT NOT NULL,
  uloga    TEXT NOT NULL CHECK (uloga IN ('operator','kontrolor','admin')),
  -- Supabase Auth user_id (NULL dok se ne poveže sa auth.users)
  user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- -------------------------------------------------------------
-- 4. AKTIVNI RADNI NALOZI (zamena za "DATA" sheet)
-- -------------------------------------------------------------
CREATE TABLE radni_nalozi (
  id                  SERIAL PRIMARY KEY,
  radni_nalog         TEXT NOT NULL,           -- RN-1, RN-2...
  datum               DATE NOT NULL DEFAULT CURRENT_DATE,
  smena               INT NOT NULL CHECK (smena IN (1,2,3)),
  id_deo              TEXT REFERENCES delovi(id_deo),
  naziv_dela          TEXT,
  linija_id           INT REFERENCES linije(id),
  masina_id           INT REFERENCES masine(id),
  operater_id         INT REFERENCES radnici(id),
  kontrolor_id        INT REFERENCES radnici(id),
  merni_instrument    TEXT,
  kom_za_kontrolu     INT DEFAULT 30,          -- ciljna količina
  kom_ukupno          INT DEFAULT 100,
  status              TEXT DEFAULT 'aktivan',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 5. KONTROLNI LOG (glavna transakciona tabela)
--    Zamena za "Log_Kontrola" + "GLAVNI_SPC" sheet
-- -------------------------------------------------------------
CREATE TABLE kontrolni_log (
  id                  BIGSERIAL PRIMARY KEY,
  datum               DATE NOT NULL DEFAULT CURRENT_DATE,
  smena               INT NOT NULL CHECK (smena IN (1,2,3)),
  radni_nalog         TEXT,
  id_deo              TEXT REFERENCES delovi(id_deo),
  naziv_dela          TEXT,
  linija_id           INT REFERENCES linije(id),
  masina_id           INT REFERENCES masine(id),
  kontrolor_id        INT REFERENCES radnici(id),
  operater_id         INT REFERENCES radnici(id),
  greska_id           INT REFERENCES greske_katalog(id),
  greska_naziv        TEXT,                    -- denormalizovano za brzinu
  podkategorija       TEXT,                    -- denormalizovano za brzinu
  status              TEXT NOT NULL CHECK (status IN ('OK','NOK')),
  kom_nok             INT DEFAULT 0,
  potreban_broj       INT DEFAULT 30,          -- n za SPC karte
  ok_kolicina         INT DEFAULT 0,
  nok_kolicina        INT DEFAULT 0,
  ukupno_merenja      INT DEFAULT 0,
  ispravno_iz_prve    INT DEFAULT 0,
  neusaglaseno        INT DEFAULT 0,
  skart               INT DEFAULT 0,
  dorada              INT DEFAULT 0,
  ok_nakon_dorade     INT DEFAULT 0,
  napomena            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 6. SOP PO DEPARTMANIMA (zamena za KOMERCIJALA/TEHNOL./FIN. SOP)
-- -------------------------------------------------------------
CREATE TABLE sop_unosi (
  id                  BIGSERIAL PRIMARY KEY,
  departman           TEXT NOT NULL CHECK (departman IN ('KOMERCIJALA','TEHNOLOGIJA','FINANSIJE')),
  datum               DATE NOT NULL DEFAULT CURRENT_DATE,
  smena               INT,
  radni_nalog         TEXT,
  id_deo              TEXT REFERENCES delovi(id_deo),
  naziv_dela          TEXT,
  karakteristika      TEXT,
  lsl                 TEXT,
  usl                 TEXT,
  target              TEXT,
  jedinica_mere       TEXT,
  masina_naziv        TEXT,
  operater_ime        TEXT,
  kontrolor_ime       TEXT,
  merni_instrument    TEXT,
  linija              TEXT,
  proces              TEXT,
  operacija           TEXT,
  greska              TEXT,
  ukupno_kom          INT,
  kontrolisano_kom    INT,
  ispravno_iz_prve    INT,
  neusaglaseno        INT,
  dorada              INT,
  skart               INT,
  ok_nakon_dorade     INT,
  napomena            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIEWS za SPC kalkulacije (zamena za "Kalkulacije_Karte")
-- ============================================================

-- C-karta: prosečan broj grešaka po podgrupi
CREATE OR REPLACE VIEW view_c_karta AS
SELECT
  datum,
  id_deo,
  linija_id,
  smena,
  greska_naziv,
  SUM(kom_nok)                                   AS c,           -- ukupno grešaka
  COUNT(*)                                        AS n_podgrupa,
  AVG(SUM(kom_nok)) OVER (PARTITION BY id_deo)   AS c_bar,       -- CL
  AVG(SUM(kom_nok)) OVER (PARTITION BY id_deo)
    + 3 * SQRT(AVG(SUM(kom_nok)) OVER (PARTITION BY id_deo))     AS ucl,
  GREATEST(0,
    AVG(SUM(kom_nok)) OVER (PARTITION BY id_deo)
    - 3 * SQRT(AVG(SUM(kom_nok)) OVER (PARTITION BY id_deo))
  )                                               AS lcl
FROM kontrolni_log
GROUP BY datum, id_deo, linija_id, smena, greska_naziv;

-- p-karta: proporcija neispravnih
CREATE OR REPLACE VIEW view_p_karta AS
SELECT
  datum,
  id_deo,
  linija_id,
  smena,
  SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0)  AS p,
  SUM(nok_kolicina)                                           AS nok_total,
  SUM(ukupno_merenja)                                         AS n_total,
  AVG(SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
    OVER (PARTITION BY id_deo)                                AS p_bar,    -- CL
  AVG(SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
    OVER (PARTITION BY id_deo)
    + 3 * SQRT(
        AVG(SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
          OVER (PARTITION BY id_deo)
        * (1 - AVG(SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
               OVER (PARTITION BY id_deo))
        / NULLIF(AVG(SUM(ukupno_merenja)) OVER (PARTITION BY id_deo), 0)
      )                                                       AS ucl,
  GREATEST(0,
    AVG(SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
      OVER (PARTITION BY id_deo)
    - 3 * SQRT(
        AVG(SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
          OVER (PARTITION BY id_deo)
        * (1 - AVG(SUM(nok_kolicina)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
               OVER (PARTITION BY id_deo))
        / NULLIF(AVG(SUM(ukupno_merenja)) OVER (PARTITION BY id_deo), 0)
      )
  )                                                           AS lcl
FROM kontrolni_log
GROUP BY datum, id_deo, linija_id, smena;

-- u-karta: grešaka po komadu (za promenljiv n)
CREATE OR REPLACE VIEW view_u_karta AS
SELECT
  datum,
  id_deo,
  linija_id,
  smena,
  SUM(kom_nok)::FLOAT / NULLIF(SUM(ukupno_merenja), 0)  AS u,
  SUM(ukupno_merenja)                                    AS n,
  AVG(SUM(kom_nok)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
    OVER (PARTITION BY id_deo)                           AS u_bar,
  AVG(SUM(kom_nok)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
    OVER (PARTITION BY id_deo)
    + 3 * SQRT(
        AVG(SUM(kom_nok)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
          OVER (PARTITION BY id_deo)
        / NULLIF(AVG(SUM(ukupno_merenja)) OVER (PARTITION BY id_deo), 0)
      )                                                  AS ucl,
  GREATEST(0,
    AVG(SUM(kom_nok)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
      OVER (PARTITION BY id_deo)
    - 3 * SQRT(
        AVG(SUM(kom_nok)::FLOAT / NULLIF(SUM(ukupno_merenja), 0))
          OVER (PARTITION BY id_deo)
        / NULLIF(AVG(SUM(ukupno_merenja)) OVER (PARTITION BY id_deo), 0)
      )
  )                                                      AS lcl
FROM kontrolni_log
GROUP BY datum, id_deo, linija_id, smena;

-- DPMO view
CREATE OR REPLACE VIEW view_dpmo AS
SELECT
  id_deo,
  datum,
  linija_id,
  SUM(nok_kolicina)                                                    AS ukupno_defekata,
  SUM(ukupno_merenja)                                                  AS ukupno_prilike,
  COUNT(DISTINCT greska_id)                                            AS broj_greska_tipova,
  ROUND(
    (SUM(nok_kolicina)::FLOAT
      / NULLIF(SUM(ukupno_merenja)::FLOAT * COUNT(DISTINCT greska_id), 0)
    ) * 1000000
  )::INT                                                               AS dpmo,
  ROUND(
    (1 - (SUM(nok_kolicina)::FLOAT
           / NULLIF(SUM(ukupno_merenja), 0))
    )::numeric * 100, 2
  )                                                                    AS rtfy_procenat
FROM kontrolni_log
GROUP BY id_deo, datum, linija_id;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE kontrolni_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE radni_nalozi   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_unosi      ENABLE ROW LEVEL SECURITY;

-- Svako ulogovano lice može da čita
CREATE POLICY "Citanje za sve" ON kontrolni_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Citanje za sve" ON radni_nalozi
  FOR SELECT USING (auth.role() = 'authenticated');

-- Unos samo za autentifikovane
CREATE POLICY "Unos za autentifikovane" ON kontrolni_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Unos za autentifikovane" ON sop_unosi
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- SEED PODACI (iz Excel "Linije" i "Linije" kataloga grešaka)
-- ============================================================
INSERT INTO masine (naziv) VALUES
  ('Mašina: M1'), ('Mašina: M2'), ('Mašina: M3');

INSERT INTO smene (naziv) VALUES
  ('Smena 1'), ('Smena 2'), ('Smena 3');

INSERT INTO linije (linija, proces, operacija) VALUES
  ('Preseraj',   'Priprema materijala',   'Savijanje'),
  ('Preseraj',   'Podesavanje alata',     'Probijanje'),
  ('Preseraj',   'Hranjenje prese',       'Busenje'),
  ('Preseraj',   'Oblikovanje',           'Rezanje'),
  ('Preseraj',   'Zavrsna obrada',        'Izvlacenje'),
  ('Preseraj',   'Kontrola kvaliteta',    'Razdvajanje'),
  ('Karoserija', 'Podsklopovi sklapanje', 'Lucno zavarivanje'),
  ('Karoserija', 'Glavni sklopovi',       'Tackasto zavarivanje'),
  ('Karoserija', 'Zavarivanje i spajanje','Lasersko zavarivanje'),
  ('Karoserija', 'Kontrola kvaliteta',    'Merenje kordinata (CMM)'),
  ('Montaza',    'Kompletiranje vozila',  'Ugradnja tockova'),
  ('Montaza',    'Kompletiranje vozila',  'Ugradnja motora'),
  ('Montaza',    'Kompletiranje vozila',  'Ugradnja transmisije');

INSERT INTO greske_katalog (kategorija, podkategorija) VALUES
  ('LOS VAR',   'Rupa u varu'),
  ('LOS VAR',   'Nema vara'),
  ('LOS VAR',   'Slab var'),
  ('LOS VAR',   'Prskanje'),
  ('LOS VAR',   'Rasipanje'),
  ('ZAZOR',     'Prevelik'),
  ('ZAZOR',     'Premali'),
  ('ZAZOR',     'Nejednak'),
  ('ZAZOR',     'Van tolerancije'),
  ('POVRSINA',  'Ogrebotina'),
  ('POVRSINA',  'Udubljenje'),
  ('POVRSINA',  'Rdja'),
  ('POVRSINA',  'Boja'),
  ('POVRSINA',  'Prevelika'),
  ('POVRSINA',  'Premala'),
  ('POVRSINA',  'Ovalnost'),
  ('POVRSINA',  'Konusnost'),
  ('POVRSINA',  'Deformacija'),
  ('DIMENZIJA', 'Sirina'),
  ('DIMENZIJA', 'Duzina'),
  ('DIMENZIJA', 'Visina'),
  ('VIZUELNO',  'Ostra ivica'),
  ('VIZUELNO',  'Boja'),
  ('VIZUELNO',  'Krivo'),
  ('FUNKCIJA',  'Blokira'),
  ('MONTAZA',   'Los polozaj'),
  ('MONTAZA',   'Pogresan deo'),
  ('MATERIJAL', 'Mekano'),
  ('MATERIJAL', 'Tvrdo'),
  ('PAKOVANJE', 'Osteceno'),
  ('OZNAKE',    'Nedostaje deo');

INSERT INTO radnici (ime, uloga) VALUES
  ('PETROVIC DRAGOMIR', 'kontrolor'),
  ('KIKA KON',          'kontrolor'),
  ('MIKA KON',          'kontrolor'),
  ('PERA',              'operator'),
  ('LAZA',              'operator'),
  ('Admin',             'admin');

INSERT INTO delovi (id_deo, naziv_dela, karakteristika, lsl, usl, target, jedinica_mere, slika_naziv) VALUES
  ('5501-A', 'Nosac',   'Ugao savijanja', '44° 44'' 44''''', '48° 40'' 00''''', '46° 00'' 00'''''  , 'step', 'Deo1.jpg'),
  ('5502-A', 'Osovina', 'Precnik',        '9.8',             '10.2',             '10',                'mm',   'Deo2.jpg'),
  ('5503-A', 'Osovina', 'Precnik',        '32° 90'' 00''''', '33° 10'' 00''''', '33° 00'' 00'''''  , 'step', 'Deo3.jpg');
