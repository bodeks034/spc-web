-- ============================================================
-- SPC — šema usklađena sa docs/*.csv
-- Pokreni u Supabase SQL Editor (nakon brisanja starih tabela)
-- ============================================================

BEGIN;

-- Šifrarnici
CREATE TABLE linije (
  id         SERIAL PRIMARY KEY,
  linija     TEXT NOT NULL,
  proces     TEXT,
  operacija  TEXT,
  greske     TEXT
);

CREATE TABLE masine (
  id     SERIAL PRIMARY KEY,
  naziv  TEXT NOT NULL,
  linija TEXT
);

CREATE TABLE smene (
  id       SERIAL PRIMARY KEY,
  naziv    TEXT NOT NULL,
  pocetak  TEXT,
  kraj     TEXT
);

CREATE TABLE greske_katalog (
  id            SERIAL PRIMARY KEY,
  kategorija    TEXT NOT NULL,
  podkategorija TEXT NOT NULL,
  defekt        TEXT,
  opis          TEXT,
  UNIQUE (kategorija, podkategorija, defekt)
);

CREATE TABLE katalog_gresaka_vozilo (
  id            BIGSERIAL PRIMARY KEY,
  vozilo_id     TEXT NOT NULL,
  kategorija    TEXT NOT NULL,
  podkategorija TEXT NOT NULL,
  defekt        TEXT NOT NULL
);

CREATE TABLE kupci (
  id      SERIAL PRIMARY KEY,
  naziv   TEXT NOT NULL UNIQUE,
  aktivan BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE delovi (
  id                 SERIAL PRIMARY KEY,
  id_deo             TEXT NOT NULL UNIQUE,
  naziv_dela         TEXT NOT NULL,
  karakteristika     TEXT,
  linija_id          INT REFERENCES linije(id),
  masina_id          INT REFERENCES masine(id),
  kom_za_kontrolu    INT DEFAULT 30,
  slika_naziv        TEXT,
  aktivan            BOOLEAN NOT NULL DEFAULT TRUE,
  napomena           TEXT,
  tip_kontrole       TEXT NOT NULL DEFAULT 'deo' CHECK (tip_kontrole IN ('deo', 'vozilo')),
  vozilo_katalog_id  TEXT
);

CREATE TABLE radnici (
  id       SERIAL PRIMARY KEY,
  ime      TEXT NOT NULL,
  uloga    TEXT NOT NULL CHECK (uloga IN ('operator','kontrolor','admin')),
  email    TEXT,
  user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aktivan  BOOLEAN NOT NULL DEFAULT TRUE,
  napomena TEXT
);

CREATE TABLE radni_nalozi (
  id            SERIAL PRIMARY KEY,
  broj_naloga   TEXT NOT NULL UNIQUE,
  id_deo        TEXT REFERENCES delovi(id_deo),
  naziv_dela    TEXT,
  kolicina      INT,
  kupac         TEXT,
  datum_unosa   DATE DEFAULT CURRENT_DATE,
  rok_isporuke  DATE,
  status        TEXT DEFAULT 'aktivan',
  operater      TEXT,
  napomena      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kontrolni_log (
  id              BIGSERIAL PRIMARY KEY,
  datum           DATE NOT NULL DEFAULT CURRENT_DATE,
  smena           INT NOT NULL CHECK (smena IN (1,2,3)),
  radni_nalog     TEXT,
  id_deo          TEXT REFERENCES delovi(id_deo),
  naziv_dela      TEXT,
  linija_id       INT REFERENCES linije(id),
  masina_id       INT REFERENCES masine(id),
  kontrolor_id    INT REFERENCES radnici(id),
  operater_id     INT REFERENCES radnici(id),
  status          TEXT NOT NULL CHECK (status IN ('OK','NOK')),
  greska_naziv    TEXT,
  podkategorija   TEXT,
  defekt          TEXT,
  kom_nok         INT DEFAULT 0,
  ok_kolicina     INT DEFAULT 0,
  nok_kolicina    INT DEFAULT 0,
  ukupno_merenja  INT DEFAULT 0,
  potreban_broj   INT DEFAULT 30,
  komentar        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ciljevi (
  id         SERIAL PRIMARY KEY,
  id_deo     TEXT REFERENCES delovi(id_deo),
  naziv      TEXT,
  rty_cilj   NUMERIC(5,2),
  dpmo_cilj  INT,
  p_cilj     NUMERIC(5,2),
  vazi_od    DATE,
  napomena   TEXT
);

CREATE TABLE merila (
  id             SERIAL PRIMARY KEY,
  naziv          TEXT NOT NULL,
  serijski_broj  TEXT,
  tip            TEXT,
  lokacija       TEXT,
  opseg          TEXT,
  aktivno        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE kalibracije (
  id             BIGSERIAL PRIMARY KEY,
  merilo_id      INT NOT NULL REFERENCES merila(id) ON DELETE CASCADE,
  datum_kal      DATE,
  sledeca_kal    DATE,
  izvrsio        TEXT,
  sertifikat_br  TEXT,
  rezultat       TEXT,
  napomena       TEXT
);

CREATE TABLE eskalacije (
  id                 SERIAL PRIMARY KEY,
  id_deo             TEXT REFERENCES delovi(id_deo),
  opis               TEXT,
  prioritet          TEXT,
  status             TEXT DEFAULT 'otvoren',
  kreirao_id         INT REFERENCES radnici(id),
  dodeljen_id        INT REFERENCES radnici(id),
  rok                DATE,
  korektivna_akcija  TEXT,
  zatvoreno_at       DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE osmd_izvestaji (
  id                   SERIAL PRIMARY KEY,
  id_deo               TEXT REFERENCES delovi(id_deo),
  d1_tim               TEXT,
  d2_opis_problema     TEXT,
  d3_privremena_akcija TEXT,
  d4_uzrok             TEXT,
  d5_korektivna        TEXT,
  d6_implementacija    TEXT,
  d7_prevencija        TEXT,
  d8_zakljucak         TEXT,
  status               TEXT DEFAULT 'u_toku',
  kreirao_id           INT REFERENCES radnici(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Analitičke tabele (iz Excel izveštaja)
CREATE TABLE analiza_kontrolor (
  id         SERIAL PRIMARY KEY,
  ime        TEXT,
  uloga      TEXT,
  mereno     INT,
  ok         INT,
  nok        INT,
  dpmo       INT,
  kalibracija TEXT
);

CREATE TABLE analiza_masina (
  id               SERIAL PRIMARY KEY,
  masina           TEXT,
  period           TEXT,
  id_deo           TEXT,
  mereno           INT,
  ok               INT,
  nok              INT,
  rty_proc         NUMERIC(8,2),
  dpmo             INT,
  korelacija_greska TEXT,
  status           TEXT
);

CREATE TABLE analiza_smena (
  id         SERIAL PRIMARY KEY,
  smena      TEXT,
  datum      DATE,
  id_deo     TEXT,
  mereno     INT,
  ok         INT,
  nok        INT,
  rty_proc   NUMERIC(8,2),
  dpmo       INT,
  top_greska TEXT
);

CREATE TABLE dpmo (
  id           SERIAL PRIMARY KEY,
  id_deo       TEXT,
  period       TEXT,
  mereno_n     INT,
  nok          INT,
  dpmo         NUMERIC(12,2),
  rty_proc     NUMERIC(8,2),
  sigma_nivo   TEXT,
  cilj_dpmo    INT,
  status       TEXT,
  trend        TEXT
);

CREATE TABLE pareto (
  id                 SERIAL PRIMARY KEY,
  rang               INT,
  kategorija         TEXT,
  podkategorija      TEXT,
  broj               INT,
  procenat           NUMERIC(8,4),
  kumulativ_proc     NUMERIC(8,4),
  pareto_8020        TEXT,
  prioritet          TEXT,
  korektivna_akcija  TEXT,
  odgovorni          TEXT
);

-- Operativne tabele koje app koristi
CREATE TABLE prekidi_zahtevi (
  id           SERIAL PRIMARY KEY,
  operater_id  INT REFERENCES radnici(id),
  id_deo       TEXT REFERENCES delovi(id_deo),
  preostalo    INT,
  razlog       TEXT,
  status       TEXT DEFAULT 'ceka',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kontrolna_lista_stavke (
  id         SERIAL PRIMARY KEY,
  kategorija TEXT,
  stavka     TEXT,
  redosled   INT,
  aktivna    BOOLEAN DEFAULT TRUE
);

CREATE TABLE kontrolna_lista_log (
  id          SERIAL PRIMARY KEY,
  radnik_id   INT REFERENCES radnici(id),
  smena       INT,
  datum       DATE DEFAULT CURRENT_DATE,
  stavke_json JSONB,
  zavrsena    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (minimum; pun set u 04 + 05)
ALTER TABLE kontrolni_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE radni_nalozi ENABLE ROW LEVEL SECURITY;
ALTER TABLE delovi ENABLE ROW LEVEL SECURITY;
ALTER TABLE greske_katalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE radnici ENABLE ROW LEVEL SECURITY;
ALTER TABLE linije ENABLE ROW LEVEL SECURITY;
ALTER TABLE masine ENABLE ROW LEVEL SECURITY;
ALTER TABLE smene ENABLE ROW LEVEL SECURITY;
ALTER TABLE katalog_gresaka_vozilo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_kontrolni_log" ON kontrolni_log FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_kontrolni_log" ON kontrolni_log FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_read_radni_nalozi" ON radni_nalozi FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_delovi" ON delovi FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_greske" ON greske_katalog FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_radnici" ON radnici FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_linije" ON linije FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_masine" ON masine FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_smene" ON smene FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_katalog_vozilo" ON katalog_gresaka_vozilo FOR SELECT USING (auth.role() = 'authenticated');

COMMIT;

-- Osveži PostgREST schema cache (da import odmah vidi tabele)
NOTIFY pgrst, 'reload schema';
