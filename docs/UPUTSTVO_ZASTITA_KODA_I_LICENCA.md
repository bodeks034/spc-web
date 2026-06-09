# Zaštita koda i kontrola rada programa na firminskom serveru

Ovaj dokument objašnjava:

1. **Kako zaštititi kod** da ga na serveru firme ne može lako čitati / kopirati.
2. **Kako ostaviti sebi mogućnost** da program **uključite ili isključite** posle određenog datuma (ili odmah).

Projekat već sadrži tehničku osnovu licence — ovaj vodič je kompletan (teorija + praksa).

---

## Važna istina (bez obmane)

SPC je **web aplikacija** — browser mora da preuzme JavaScript da bi radio. **100% skrivanje koda nije moguće** ako neko ozbiljno pokuša (DevTools, dekompajliranje). Cilj je:

- da **prosečan korisnik / IT** ne vidi čitljiv izvorni kod;
- da na serveru **nema** foldera `src/` sa TypeScript/React izvorom;
- da **produženje rada** ne mogu sami da urade bez tvog ključa / tvoje intervencije.

**Prava zaštita = tehnička + ugovorna** (ugovor o licenci, zabrana reverse engineering-a).

---

# DEO 1 — Zaštita koda

## 1.1 Šta NE sme na firminski server

| Na server | Ne na server |
|-----------|--------------|
| `dist/` (build) | `src/` |
| `public/license.json` (potpisana licenca) | `.git/` |
| `deploy/nginx-spc.conf` | `node_modules/` (osim build mašine) |
| SQL migracije (za admina) | `.env` sa tvojim tajnim ključevima |
| | `license-keys/private.pem` **nikad** |

**Pravilo:** na produkcioni server ide samo **`npm run build` rezultat** (`dist/`) + licenca + nginx config. **Ne kopiraj ceo projekat** sa `pakuj:server` ako IT ne treba source — bolje ručno samo `dist/`.

## 1.2 Produkcioni build (otežano čitanje)

U `vite.config.js` je uključeno:

- `sourcemap: false` — nema `.map` fajlova koji otkrivaju originalni kod
- minifikacija (esbuild) — jedna dugačka linija po fajlu

Build:

```powershell
cd C:\mix\spc-web
copy deploy\env.production.example .env.production
# popuni VITE_SUPABASE_URL i ANON_KEY za firmu
npm run build
```

Na server kopiraš **samo** `dist/*` u npr. `/opt/spc-web/dist/`.

## 1.3 Opciona dodatna zatezanja (obfuskacija)

Ako želiš još teže čitljiv JS (sporije, veći fajlovi):

```powershell
npm install -D vite-plugin-javascript-obfuscator
```

Detalji u komentaru u `vite.config.js` (sekcija obfuskacija — uključi po potrebi). Ovo **nije magija** — samo usporava reverse engineering.

## 1.4 Dozvole na Linux serveru

```bash
# Samo root/deploy user vidi fajlove
chown -R root:www-data /opt/spc-web/dist
chmod -R 750 /opt/spc-web/dist
chmod 640 /opt/spc-web/dist/assets/*

# Nginx čita kao www-data — dovoljno execute na parent dir
```

- **SSH** samo za IT; tvoj deploy nalog bez deljenja lozinke.
- **Ne instaliraj** VS Code / git na produkciji ako nije neophodno.

## 1.5 Šta IT ipak može

| Akcija | Mogućnost |
|--------|-----------|
| Čitanje minifikovanog JS u browseru | Da (ograničeno) |
| Kopiranje `dist/` | Da |
| Čitanje PostgreSQL na serveru | Da (njihova baza) |
| Forge potpisane licence | **Ne** (bez `private.pem`) |
| Produženje licence u bazi | Samo sa **service_role** koji **ti zadržiš** |

## 1.6 Ugovorna zaštita (preporučeno)

U ugovoru sa firmom:

- licenca je **vremenski ograničena**;
- zabranjen je reverse engineering i redistribucija;
- source code ostaje tvoja intelektualna svojina;
- produženje samo uz tvoju potpisnu licencu.

---

# DEO 2 — Uključivanje / isključivanje programa

## 2.1 Dva nezavisna mehanizma (preporučeno oba)

```
┌─────────────────────────────────────────────────────────┐
│  SLOJ A — Potpisani fajl license.json (tvoj private.pem) │
│  → stoji u dist/, proverava se u browseru pri startu    │
│  → IT ne može da produži bez tvog potpisa                │
└─────────────────────────────────────────────────────────┘
                          +
┌─────────────────────────────────────────────────────────┐
│  SLOJ B — Tabela app_licenca + RPC proveri_licencu()     │
│  → provera u bazi na serveru                             │
│  → menjaš sa service_role (skripta koju samo ti imaš)    │
└─────────────────────────────────────────────────────────┘
```

Aplikacija **blokira rad** ako bilo koji sloj kaže „ne“.

## 2.2 Jednokratna priprema (na tvom računaru)

### Korak 1 — SQL migracija na serveru

U Supabase SQL Editoru (firminski server) pokreni:

```
21_licenca_gate.sql
```

### Korak 2 — Par ključeva (jednom)

```powershell
cd C:\mix\spc-web
node scripts/generisi-par-licence.mjs
```

Nastaje:

- `license-keys/private.pem` — **čuvaj offline, nikad na server firme, nikad u git**
- `license-keys/public.pem` — javni ključ (već ubačen u aplikaciju)

### Korak 3 — Postavi licencu u bazi (Sloj B)

```powershell
$env:SUPABASE_URL="https://spc.firma.local"   # ili http://127.0.0.1:8000
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role — držiš TI, ne daj IT>"
node scripts/postavi-licencu.mjs --do 2026-12-31 --enable --napomena "Fabrika XY"
```

### Korak 4 — Generiši license.json (Sloj A)

```powershell
node scripts/generisi-licencu.mjs --do 2026-12-31 --enable
npm run build
```

`public/license.json` ulazi u `dist/license.json` posle build-a.

### Korak 5 — Deploy

Kopiraj `dist/` na server. Gotovo.

---

## 2.3 Šta vidi korisnik kad licenca ne važi

Pun ekran poruke (bez logina, bez unosa):

> **Program je privremeno onemogućen**  
> Licenca je istekla / program je deaktiviran. Kontaktirajte dobavljača.

Provera se ponavlja **svakih 15 minuta** i pri svakom učitavanju stranice.

---

## 2.4 Kako da ISKLJUČIŠ program (odmah)

**Sloj B (baza)** — najbrže, sa tvog računara:

```powershell
$env:SUPABASE_URL="https://spc.firma.local"
$env:SUPABASE_SERVICE_ROLE_KEY="<tvoj service_role>"
node scripts/postavi-licencu.mjs --disable --napomena "Privremeno iskljuceno"
```

**Sloj A (fajl)** — ako žele da i offline cache ne pomogne:

```powershell
node scripts/generisi-licencu.mjs --disable
npm run build
# prebaci novi dist/ na server
```

Korisnici koji već imaju otvoren tab vide blokadu posle najviše 15 min.

---

## 2.5 Kako da PRODUŽIŠ rad (npr. za godinu dana)

```powershell
# 1. Baza
node scripts/postavi-licencu.mjs --do 2027-12-31 --enable --napomena "Produzenje 2027"

# 2. Potpisani fajl + novi build
node scripts/generisi-licencu.mjs --do 2027-12-31 --enable
npm run build

# 3. Samo zameni dist/ na serveru (ili samo license.json ako je ostalo isto)
```

Možeš produžiti **samo Sloj B** ako ne želiš novi build — ali **oba sloja** su sigurniji.

---

## 2.6 service_role — ko ga drži?

| Scenario | Preporuka |
|----------|-----------|
| Ti održavaš sistem | **Ti** imaš service_role; IT ima samo operativni pristup serveru |
| IT mora imati service_role za backup | Nakon instalacije **rotiraj** JWT secret u Supabase docker `.env` i **novi** service_role daj samo sebi za licencu |
| Maksimalna kontrola | Licenca samo preko **Sloja A** (potpisani fajl); ti šalješ novi `license.json` emailom/USB |

U `deploy/IT_CHECKLIST.md` dodaj: *„Service role za licenciranje nije u opsegu IT admina.“*

---

## 2.7 Napredno — potpuno isključenje na serveru (Sloj C)

Ako firma ne plati / ugovor istekne, IT na tvoj zahtev (ili ti preko SSH):

```bash
# Zaustavi web
systemctl stop nginx

# Zaustavi bazu
cd /opt/supabase/docker && docker compose stop
```

Ovo je **infrastrukturno** gašenje — dokumentuj u ugovoru da je pod tvojom kontrolom do predaje.

---

# DEO 3 — Operativni checklist

## Pre predaje firmi

- [ ] Build bez source map (`npm run build`)
- [ ] Na serveru samo `dist/`, ne `src/`
- [ ] `21_licenca_gate.sql` pokrenut
- [ ] Licenca postavljena (baza + `license.json`)
- [ ] `private.pem` samo kod tebe
- [ ] `service_role` za licencu samo kod tebe
- [ ] Ugovor o licenci potpisan
- [ ] Datum isteka dokumentovan

## Periodično

- [ ] 30 dana pre isteka: ponudi produženje
- [ ] Backup licence (zapisi `--do` datum u kalendar)
- [ ] Posle produženja: oba sloja ažurirana

## Hitno isključivanje

1. `postavi-licencu.mjs --disable`
2. Ako ne pomaže (nema mreže do servera): IT gasi nginx / Docker (Sloj C)

---

# DEO 4 — Rešavanje problema

| Problem | Rešenje |
|---------|---------|
| „Licenca nije konfigurisana“ | Pokreni `21_licenca_gate.sql` + `postavi-licencu.mjs` |
| „Potpis licence nije ispravan“ | Ponovo `generisi-licencu.mjs` + build; proveri da je isti par ključeva |
| Program radi i posle isteka | Proveri da li je deployovan stari `dist/`; proveri RPC u Studio |
| Admin firme zaobišao | Rotiraj service_role; oslanjaj se na Sloj A + ugovor |
| Želim jaču zaštitu | Ugovor + obfuskacija + pravni korak |

---

# DEO 5 — Povezani fajlovi

| Fajl | Namena |
|------|--------|
| `21_licenca_gate.sql` | Tabela + RPC `proveri_licencu()` |
| `scripts/generisi-par-licence.mjs` | Jednokratno: Ed25519 par |
| `scripts/generisi-licencu.mjs` | Potpisani `public/license.json` |
| `scripts/postavi-licencu.mjs` | Sloj B u bazi (service_role) |
| `src/lib/licenca.js` | Provera u aplikaciji |
| `src/components/LicencaBlokada.jsx` | Ekran blokade |
| `deploy/env.production.example` | Build za firmu |

---

# DEO 6 — Povezano

- `docs/UPUTSTVO_FIRMINSKI_SERVER.md` — deploy na server
- `deploy/IT_CHECKLIST.md` — za IT odeljenje
