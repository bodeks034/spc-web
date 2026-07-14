# Uputstvo — testiranje, E2E, email alarmi i Docker

Kratak vodič za developere i IT: šta pokretati ručno, koje env varijable trebaju i kako stoji Docker u odnosu na Supabase.

---

## 1. Unit testovi (Vitest)

### Šta proveravaju

Brze provere **čiste logike** u kodu — bez browsera i bez žive baze:

- SPC statistika i alarmi (`tests/spcStats.test.js`)
- SPC email pravila (`tests/spcEmailNotif.test.js`)
- Operativni alarmi, MSA kalendar, moment PFMEA metodologija

### Da li se sami pokreću?

**Ne.** Tokom normalnog rada (`npm run dev`) testovi **ne rade u pozadini**.

| Komanda | Šta radi |
|---------|----------|
| `npm test` | Jednom pokrene sve testove i završi |
| `npm test:watch` | Ostaje uključen; ponavlja test kad sačuvaš fajl (za razvoj) |
| `npm run deploy:check` | Pre puštanja: unit + smoke + šema pilot + E2E login + email |
| `npm run deploy:check:firma` | + build + puna šema + Docker + pun E2E |
| `npm run db:verify:pilot` | Samo migracije 54–59 (moment + NCR) |
| `npm run db:verify` | Sve migracije (Admin Status šeme) |
| `npm run db:migrate` | Primeni 54–59 (zahteva DATABASE_URL) |
| `npm run build:pilot` | Production build iz `.env.production` |
| `npm run e2e:smoke` | Samo login UI (bez kredencijala) |
| `npm run e2e:full` | Svi E2E testovi (zahteva `E2E_EMAIL` / `E2E_PASSWORD`) |

### Kada pokrenuti

- Posle izmene u `src/lib/` ili `tests/`
- Pre deploy-a: `npm run deploy:check`
- Nije obavezno posle svake sitne UI izmene

### Očekivani rezultat

```
Test Files  5 passed (5)
     Tests  20 passed (20)
```

---

## 2. E2E testovi (Playwright)

### Šta proveravaju

Otvaraju **pravi browser**, pokreću dev server i testiraju login ekran:

| Test | Env potreban? |
|------|----------------|
| Prikaz login forme | Ne |
| Greška pri praznoj prijavi | Ne |
| Uspešna prijava → modul kartice | **Da** (`E2E_EMAIL`, `E2E_PASSWORD`) |

### Env varijable za E2E

Ovo **nisu** mejlovi za slanje obaveštenja. To su **nalog za prijavu** u aplikaciji — mora postojati u Supabase Auth / bazi.

**Windows (PowerShell, jedna sesija):**

```powershell
$env:E2E_EMAIL="operater@firma.rs"
$env:E2E_PASSWORD="tvoja-lozinka"
npm run e2e
```

**Windows (CMD):**

```cmd
set E2E_EMAIL=operater@firma.rs
set E2E_PASSWORD=tvoja-lozinka
npm run e2e
```

**Linux / macOS:**

```bash
export E2E_EMAIL="operater@firma.rs"
export E2E_PASSWORD="tvoja-lozinka"
npm run e2e
```

Može **bilo koji** nalog koji radi u aplikaciji (operater, kontrolor, admin). Ako env nije postavljen, login testovi bez kredencijala prolaze; ostali se preskaču.

| Fajl | Šta pokriva |
|------|-------------|
| `e2e/login.spec.js` | Login forma (bez kredencijala) + opciona prijava |
| `e2e/merenje.spec.js` | Varijabilne — polje ID delo, ručni unos |
| `e2e/moment-linija.spec.js` | Digitalni modul → tab MOMENT → wizard |
| `e2e/ncr.spec.js` | Analitika → NCR/CAPA panel, validacija, kreiranje, NCR→8D prefill |
| `e2e/ncr-alarm.spec.js` | Admin → SPC alarm → Kreiraj NCR (preskače ako nema alarma) |
| `e2e/shop-floor.spec.js` | Shop-floor traka, NCR/SPC chip navigacija, šef smena dashboard |

Pojedinačni fajl: `npm run e2e -- e2e/merenje.spec.js`

Opciono — drugi URL dev servera:

```bash
E2E_BASE_URL=http://127.0.0.1:5173 npm run e2e
```

### Prvo pokretanje (jednom po mašini)

```bash
npx playwright install chromium
npm run e2e
```

Vizuelni režim (za debug):

```bash
npm run e2e:ui
```

Playwright automatski pokreće `npm run dev` na portu 5173 (vidi `playwright.config.js`).

---

## 3. SPC email alarmi — druga stvar od E2E

E2E kredencijali i email **nisu isto**.

| | E2E (`E2E_EMAIL`) | SPC alarmi (Admin) |
|---|-------------------|---------------------|
| Svrha | Prijava u testu | Slanje maila pri SPC alarmu |
| Gde se podešava | Env u terminalu | Admin → Obaveštenja |
| Koji mejl | Nalog u bazi | Bilo koja validna adresa primaoca |

### Podešavanje u aplikaciji (Resend — preporučeno)

1. **Admin** → **Obaveštenja**
2. Uključi **Email**
3. Email provider: **Auto** ili **Resend**
4. Unesi primalce (`smtp_to`, `smtp_to_spc`)
5. **Test SPC email**

### Deploy Resend (alarmi u browseru)

```bash
# .env.local: RESEND_API_KEY=re_..., RESEND_FROM=SPC <onboarding@resend.dev>
npm run deploy:resend
npm run deploy:resend -- --test-email tvoj@email.rs
```

**Produkcija (fabrika):** verifikuj domen u Resend → `docs/RESEND_PRODUKCIJA.md`

### SMTP (van aplikacije — cron, Gmail)

```bash
# .env.local: SMTP_HOST, SMTP_USER, SMTP_PASS (Gmail = App Password)
npm run email:send -- --to primalac@firma.rs --subject Test --text Poruka
npm run deploy:smtp -- --test-email primalac@firma.rs
```

Detalji: `docs/SUPABASE_EDGE_WEBHOOK.md`.

---

## 4. Docker — šta je i zašto

### Jednostavno objašnjenje

**Docker** pakuje aplikaciju u „kontejner“ — izolovano okruženje koje radi isto na svakom serveru. Ne moraš ručno da instaliraš Node i podešavaš nginx na hostu za svaki deploy.

### Šta Docker radi u ovom projektu

```
[Operater u browseru]
        ↓
  Docker kontejner (port 8080)
  → nginx servira React build (dist/)
        ↓ proxy ka API-ju
  Supabase na hostu (port 8000) — baza, auth, edge funkcije
```

**Važno:** `docker-compose.spc.yml` pokreće **samo frontend** (React + nginx). Supabase i PostgreSQL ostaju u zasebnom Supabase Docker stacku na serveru.

### Kada koristiti Docker

| Scenario | Preporuka |
|----------|-----------|
| Brz razvoj na PC | `npm run dev` — **bez** Dockera |
| Firminski Linux server, jednostavan deploy | Docker frontend |
| Već imaš nginx + `dist/` | Klasičan put (bez Dockera) |

### Docker — korak po korak

**1. Kopiraj env fajl**

```bash
cp deploy/.env.docker.example deploy/.env.docker
```

**2. Uredi `deploy/.env.docker`**

```env
# URL koji browser vidi (isti domen/port kao kontejner)
VITE_SUPABASE_URL=http://spc.firma.local:8080
VITE_SUPABASE_ANON_KEY=<anon_key_iz_supabase_docker_env>
SPC_HTTP_PORT=8080
```

`VITE_SUPABASE_ANON_KEY` uzmi sa Supabase servera (isti kao u `.env.production`).

**3. Build i pokretanje**

```bash
cd deploy
docker compose -f docker-compose.spc.yml --env-file .env.docker up -d --build
```

**4. Provera**

Otvori `http://<server>:8080` — treba da vidiš login ekran.

**Korisne komande:**

```bash
docker compose -f docker-compose.spc.yml ps          # status
docker compose -f docker-compose.spc.yml logs -f   # logovi
docker compose -f docker-compose.spc.yml restart   # restart
docker compose -f docker-compose.spc.yml down      # zaustavi
```

### Alternativa bez Dockera

Klasičan put — detaljno u `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md`:

1. `.env.production` u koren projekta
2. `npm run build`
3. Kopiraj `dist/` na server
4. Nginx po `deploy/nginx-spc.conf.example`

IT lista za fabriku: `deploy/IT_A4_POKRETANJE.md`.

---

## 5. Checklist pre puštanja u produkciju

```bash
npm run deploy:check    # unit + smoke + E2E login + check:smtp
npm run build           # production build
npm run e2e             # opciono, sa E2E kredencijalima
```

U aplikaciji:

- [ ] Admin → Status servera → ping OK
- [ ] Admin → Status šeme → sve zeleno
- [ ] Test login operater + jedan unos
- [ ] (Opciono) Admin → Obaveštenja → Test SPC email

---

## 6. Brza referenca komandi

| Cilj | Komanda |
|------|---------|
| Unit testovi jednom | `npm test` |
| Unit testovi u petlji | `npm test:watch` |
| Pre deploy-a | `npm run deploy:check` |
| Firma gate (build + docker) | `npm run deploy:check:firma` |
| Docker image provera | `npm run deploy:docker:build` |
| E2E (login forma) | `npm run e2e` |
| E2E + prijava | postavi `E2E_EMAIL` / `E2E_PASSWORD`, pa `npm run e2e` |
| Production build | `npm run build` |
| Docker frontend | `cd deploy && docker compose -f docker-compose.spc.yml --env-file .env.docker up -d --build` |

---

## Povezana dokumentacija

- `deploy/FAZA_E_ONPREM.md` — kratak pregled faze E
- `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md` — deploy bez Dockera
- `deploy/IT_A4_POKRETANJE.md` — IT lista za fabriku
- `docs/SUPABASE_EDGE_WEBHOOK.md` — edge funkcije za obaveštenja
