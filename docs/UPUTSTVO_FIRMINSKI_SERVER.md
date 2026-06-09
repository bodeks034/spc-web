# Prebacivanje SPC aplikacije na server firme (on‑premise)

Firma ne dozvoljava podatke na serverima van mreže — ovaj vodič pokriva **ceo put** od tvog računara do **internog servera** i svakodnevnog rada operatera na tabletima/PC-jevima u fabrici.

---

## Šta se prebacuje

| Komponenta | Gde danas | Gde na serveru firme |
|------------|-----------|----------------------|
| **Baza (PostgreSQL)** | Supabase cloud | Self-hosted Supabase (Docker) |
| **Prijava (Auth)** | Supabase cloud | Isti stack na serveru |
| **Crteži, Excel** | Supabase Storage | Storage na serveru |
| **Realtime** (kalibracija, prekid) | Supabase cloud | Lokalni Realtime |
| **React aplikacija** | `npm run dev` / build | Nginx ili IIS → `dist/` |
| **Edge funkcija** (Teams) | Supabase cloud | Opciono na serveru ili isključeno |

**Podaci ne idu na internet** — sve ostaje u LAN-u fabrike (osim ako IT eksplicitno dozvoli Teams webhook ka Microsoftu).

---

## Arhitektura (pregled)

```
  Tableti / PC u fabrici (Wi‑Fi / LAN)
           │
           │  https://spc.firma.local   (ili http://192.168.x.x)
           ▼
  ┌─────────────────────────────────────┐
  │  Firmini server (Windows ili Linux) │
  │  ┌─────────────┐  ┌──────────────┐  │
  │  │ Nginx / IIS │  │ Docker       │  │
  │  │  dist/ SPA  │  │  Supabase    │  │
  │  │  (React)    │──│  Postgres    │  │
  │  └─────────────┘  │  Auth        │  │
  │                   │  Storage     │  │
  │                   │  Realtime    │  │
  │                   └──────────────┘  │
  │  backup/ (SQL + fajlovi)            │
  └─────────────────────────────────────┘
```

---

## Sve na firminskom serveru — pojasnjenje

Kod vas **program i baza moraju da rade samo na serveru firme**. Nema cloud-a posle migracije.

### Šta gde živi (posle instalacije)

| Šta | Gde fizički | Pokreće se kako |
|-----|-------------|-----------------|
| **PostgreSQL (podaci)** | Disk servera firme (Docker volumen) | `docker compose up` u `/opt/supabase/docker` |
| **Auth, API, Storage, Realtime** | Isti server (Supabase u Dockeru) | Isto — jedan `docker compose up -d` |
| **Web program (React)** | Folder npr. `/opt/spc-web/dist` | **Nginx** ili IIS servira statičke fajlove |
| **Cloud Supabase** | **Ne koristi se** | Isključen / obrisan posle migracije |

Tvoj računar posle instalacije služi samo za: razvoj, novi build, produženje licence, backup — **ne za svakodnevni rad operatera**.

### Šta operater vidi

Tableti i PC u fabrici otvaraju **jednu adresu**, npr.:

`https://spc.firma.local`

ili `https://192.168.10.50`

Ni browser ni aplikacija **ne zovu** `supabase.co` niti internet za podatke.

### Dve stvari koje moraju da rade na serveru

Posle restarta servera ili nestanka struje IT (ili ti) pokrene:

```bash
# 1) Baza + Supabase API (Docker)
cd /opt/supabase/docker
docker compose up -d

# 2) Web server (Nginx)
systemctl start nginx
```

Bez **(1)** — nema prijave, nema podataka.  
Bez **(2)** — niko ne otvara stranicu.

*(Na Windows Serveru: Docker Desktop start + IIS/Nginx sajt.)*

### `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` — samo za firmu

Ovo **nije** za cloud. Koristi se **isključivo** kad builduješ program koji će raditi protiv **firminskog** Supabase-a.

| Pitanje | Odgovor |
|---------|---------|
| Gde se popunjava? | U `.env.production` **na serveru** (ili na tvom PC pre build-a, ali sa **firminskim** URL-om) |
| Kada? | **Pre** `npm run build` |
| Šta upisati u URL? | Adresu koju tableti koriste, npr. `https://spc.firma.local` (ne `wzxkcomeurogvfisticq.supabase.co`) |
| Odakle anon key? | Sa **firminskog** servera: `grep ANON_KEY /opt/supabase/docker/.env` ili `supabase status` |
| Gde završava? | Ugrađen u `dist/assets/*.js` posle build-a — zato mora biti tačan **pre** build-a |

Primer `.env.production` na serveru firme:

```env
VITE_SUPABASE_URL=https://spc.firma.local
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....   # sa firminskog Supabase .env
```

Zatim:

```bash
cd /opt/spc-web
npm ci
npm run build
# dist/ servira Nginx
```

**Nikad** ne ostavljaj cloud URL u produkcijskom build-u za firmu.

### Tok podataka (pojednostavljeno)

```
Tablet → https://spc.firma.local
           ├─ Nginx → dist/index.html, JS (program)
           └─ Nginx → proxy → Docker Supabase :8000
                              └─ PostgreSQL (baza na disku servera)
```

Svi podaci (merenja, logovi, crteži) ostaju **na tom serveru**.

### Šta prebacuješ sa svog računara (jednom)

1. SQL backup (ako imaš stare podatke u cloud-u)  
2. Storage backup (crteži, Excel)  
3. Kod / `deploy-paket`  
4. Na serveru: migracije + restore + build sa **firminskim** `.env.production`

Posle toga cloud može da se ugasi — firma radi **offline u LAN-u**.

### Ko šta radi svakodnevno

| Uloga | Rad |
|-------|-----|
| **Operater** | Otvara `https://spc.firma.local`, unosi podatke |
| **IT firme** | Server uključen, Docker + Nginx rade, backup noću |
| **Ti (razvoj)** | Povremeno novi `dist/` ili SQL migracija; produženje licence |

---

## Faza 0 — Dogovor sa IT odeljenjem

Pre instalacije traži od IT-a:

| Stavka | Preporuka |
|--------|-----------|
| **IP ili DNS** | npr. `spc.firma.local` → `192.168.10.50` |
| **HTTPS** | Obavezno za kameru/barkod na tabletima (interni sertifikat ili Let's Encrypt samo ako imaju interni DNS) |
| **Portovi** | 443 (web), 8000 (Supabase API) — ili sve kroz 443 reverse proxy |
| **RAM** | minimum **8 GB**, preporuka **16 GB** |
| **Disk** | **50 GB+** (baza + crteži + backup) |
| **OS** | **Linux (Ubuntu 22.04)** + Docker — najstabilnije; ili **Windows Server** + Docker Desktop |
| **Izlaz na internet** | Da li tabletima treba samo LAN? Da li Teams webhook sme ka `*.office.com`? |
| **Firewall** | Pristup samo iz fabričke mreže |

Daj IT-u ovaj dokument i `deploy/IT_CHECKLIST.md`.  
**Pre odlaska u firmu** popuni: `docs/CHECKLIST_PRE_INSTALACIJA_FIRMA.md` (šta tačno tražiš od IT-a + šta ti moraju vratiti).

---

## Faza 1 — Priprema na tvom računaru (pre migracije)

### 1.1 Backup kompletne cloud baze

Ako još uvek imaš pristup cloud Supabase projektu:

```powershell
cd C:\mix\spc-web
supabase login
supabase link --project-ref wzxkcomeurogvfisticq
npm run backup:db
```

```powershell
$env:SUPABASE_URL="https://wzxkcomeurogvfisticq.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
npm run backup:storage
```

Detalji: `docs/UPUTSTVO_LOKALNA_BAZA.md`.

### 1.2 Pakovanje za prenos na server

```powershell
cd C:\mix\spc-web
powershell -ExecutionPolicy Bypass -File scripts\pakuj-za-firminski-server.ps1
```

Nastaje folder **`deploy-paket\`** sa:

- izvornim kodom (bez `node_modules`)
- SQL migracijama (`01_…` do `20_…`)
- `backup\` (ako postoji)
- `deploy\` (nginx, env primeri)
- `excel-rad\`, `docs\`

Prebaci **`deploy-paket`** na server:

- USB disk (ako nema mrežnog kopiranja),
- ili interni file server `\\server\share\spc-web`,
- **nikad** javni cloud (Dropbox, Gmail…) ako politika to zabranjuje.

### 1.3 Test lokalno (preporučeno)

Na svom PC-u jednom prođi ceo tok iz `UPUTSTVO_LOKALNA_BAZA.md` (Pristup B) — restore dump-a, `npm run dev` na `127.0.0.1:54321`. Tako znaš da paket radi pre nego što odeš u firmu.

---

## Faza 2 — Instalacija na Linux serveru (preporučeno)

### 2.1 Preduslovi

```bash
# Ubuntu 22.04 — kao root ili sudo
apt update && apt install -y docker.io docker-compose-plugin git nginx certbot

systemctl enable docker
systemctl start docker
```

### 2.2 Self-hosted Supabase

```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

Uredi **`/opt/supabase/docker/.env`** — ključne vrednosti:

```env
# Javni URL API-ja (kako ga vide browseri u fabrici)
SITE_URL=https://spc.firma.local
API_EXTERNAL_URL=https://spc.firma.local:8000
SUPABASE_PUBLIC_URL=https://spc.firma.local:8000

# Jačina — promeni sve SECRET vrednosti (openssl rand -base64 32)
JWT_SECRET=<generiši_novi>
ANON_KEY=<generiše_se_posle_starta_ili_koristi_supabase_status>
SERVICE_ROLE_KEY=<čuvaj_tajno>

# Postgres lozinka
POSTGRES_PASSWORD=<jaka_lozinka>
```

Pokretanje:

```bash
cd /opt/supabase/docker
docker compose pull
docker compose up -d
```

Provera (čekaj 2–5 min):

```bash
docker compose ps
```

Anon ključ za aplikaciju:

```bash
grep ANON_KEY /opt/supabase/docker/.env
# ili pogledaj Kong / Studio konfiguraciju u .env
```

Studio (admin baze): `http://<server-ip>:8000` ili port iz `.env` (`STUDIO_PORT`).

### 2.3 Kreiranje šeme (migracije)

Kopiraj SQL fajlove na server (iz paketa):

```bash
mkdir -p /opt/spc-web/sql
cp /path/to/deploy-paket/*.sql /opt/spc-web/sql/
```

Pokreni **redom** (isti red kao `docs/MIGRACIJE.md` + `09_kalibracija_zahtevi.sql` + `20_radnici_uloge_kvalitet_sef.sql`):

```bash
for f in 01_supabase_schema.sql 02_add_defekti_and_kontrolni_log_defekt.sql \
  03_schema_from_docs.sql 04_kontrolna_lista_policies.sql 05_dopuna_tabele_rls.sql \
  06_storage_excel_sync.sql 07_spc_views_and_alarms.sql 08_fix_admin_radnik.sql \
  09_fix_kontrolni_log_sequence.sql 10_povezi_auth_radnici.sql 11_varijabilne_schema.sql \
  12_gage_rr_schema.sql 13_merenja_varijabilna_foto.sql 14_kpi_skart_dorada_oee.sql \
  15_sesija_id.sql 16_kpi_planirano_kom.sql 17_notifikacije.sql \
  18_karakteristike_revizija.sql 19_fix_merenja_varijabilna_sequence.sql \
  09_kalibracija_zahtevi.sql 20_radnici_uloge_kvalitet_sef.sql; do
  echo "=== $f ==="
  docker exec -i supabase-db psql -U postgres -d postgres < "/opt/spc-web/sql/$f"
done
```

Ime Docker kontejnera može biti drugačije — proveri: `docker ps | grep db`.

Dodatno za bucket crteža (ako nije u migracijama):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('spc-crtezi', 'spc-crtezi', false)
ON CONFLICT (id) DO NOTHING;
```

### 2.4 Učitavanje podataka iz backup-a

```bash
docker exec -i supabase-db psql -U postgres -d postgres < /opt/spc-web/backup/supabase/spc_full_YYYY-MM-DD.sql
```

Ako restore prijavi greške oko uloga/extension — prvo učitaj samo podatke iz cloud dump-a ili koristi CSV:

```bash
cd /opt/spc-web
export SUPABASE_URL="http://127.0.0.1:8000"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_sa_servera>"
npm run import:docs
```

### 2.5 Storage (crteži i Excel)

Sa računara gde imaš `backup/storage/`:

```bash
cd /opt/spc-web
export SUPABASE_URL="http://127.0.0.1:8000"
export SUPABASE_SERVICE_ROLE_KEY="<service_role>"
npm run restore:storage
```

---

## Faza 3 — Build i postavljanje web aplikacije

### 3.1 Node na serveru (ili build na PC pa samo dist)

**Opcija A — build na serveru:**

```bash
cd /opt/spc-web
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm ci
```

Kreiraj **`.env.production`** (ne commituj):

```env
VITE_SUPABASE_URL=https://spc.firma.local:8000
VITE_SUPABASE_ANON_KEY=<anon_key_sa_servera>
```

```bash
npm run build
# rezultat: dist/
```

**Opcija B — build na svom PC** sa istim URL-om koji će server imati u fabrici, pa kopiraj samo `dist/` u paket.

### 3.2 Nginx (Linux)

Kopiraj primer:

```bash
cp /opt/spc-web/deploy/nginx-spc.conf.example /etc/nginx/sites-available/spc
ln -s /etc/nginx/sites-available/spc /etc/nginx/sites-enabled/
```

Uredi `server_name`, putanje, SSL sertifikate. Primer strukture — vidi `deploy/nginx-spc.conf.example`.

```bash
nginx -t && systemctl reload nginx
```

Operateri otvaraju: **`https://spc.firma.local`**

### 3.3 Reverse proxy ka Supabase API (preporučeno)

Da browser ne mora da otvori port 8000 i da izbegneš CORS probleme, proxy `/auth`, `/rest`, `/storage`, `/realtime` kroz Nginx na `127.0.0.1:8000`. Primer je u `deploy/nginx-spc.conf.example`.

Tada u `.env.production`:

```env
VITE_SUPABASE_URL=https://spc.firma.local
```

(bez `:8000` — sve ide kroz 443)

**Posle izmene `.env.production` obavezno ponovo `npm run build`.**

---

## Faza 4 — Windows Server (alternativa)

Ako IT daje samo Windows Server:

1. Instaliraj **Docker Desktop** ili **WSL2 + Docker**.
2. Isti koraci za Supabase: kloniraj `supabase/docker`, `docker compose up -d`.
3. Za web:
   - **IIS** — sajt pokazuje na `C:\inetpub\spc-web\dist`
   - ili **Nginx for Windows**
4. SQL migracije: `docker exec` kao na Linuxu, ili **pgAdmin** + ručno paste.
5. Firewall: dozvoli 443 iz LAN-a.

Detaljan IIS checklist: `deploy/IT_CHECKLIST.md`.

---

## Faza 5 — Korisnici i prijava

### 5.1 Auth nalozi

U **Supabase Studio** (na serveru) → Authentication → Users → Add user.

Za svakog radnika iz tabele `radnici` poveži `user_id`:

```sql
UPDATE radnici
SET user_id = '<uuid>', email = 'operator1@fabrika.com'
WHERE id = 1;
```

Skripta: `10_povezi_auth_radnici.sql`.

### 5.2 Uloge

| Uloga | Pristup |
|-------|---------|
| operator | unos |
| kontrolor | unos + karte |
| kvalitet / admin | sve tabove + admin |

---

## Faza 6 — Tableti i stanice u fabrici

1. Poveži tablet na **fabrički Wi‑Fi** (isti LAN kao server).
2. U browseru (Chrome/Edge): `https://spc.firma.local`
3. Dodaj na početni ekran (PWA).
4. **Kamera / barkod**: radi na HTTPS; na HTTP samo `localhost`.
5. Ako interni sertifikat nije pouzdan — IT mora da ga instalira na tablete (MDM/GPO) ili koristiće se „Advanced → Proceed” (nije idealno).

### Digitalna merila (USB Serial)

Radi u Chrome/Edge na HTTPS stranici fabrike — vidi `docs/UPUTSTVO_BARKOD_I_MERILA.md`.

---

## Faza 7 — Isključivanje cloud Supabase

Kad server firme radi i podaci su migrirani:

1. **Ne koristi** više cloud URL u `.env.production`.
2. Rotiraj / obriši cloud **service_role** ključ u Supabase dashboardu (ili zatraži od IT da se projekat ugasi).
3. Proveri da aplikacija u `dist/` nema stari URL — build uvek sa firminskim `.env.production`.
4. Arhiviraj poslednji `backup/` na serveru firme (ne na cloud).

---

## Faza 8 — Backup na serveru firme

| Šta | Kada | Kako |
|-----|------|------|
| SQL dump | dnevno/noću | cron + `pg_dump` iz Docker kontejnera |
| Storage | nedeljno | `npm run backup:storage` (URL = lokalni) |
| `dist/` + `.env` | posle svakog deploy-a | kopija u `backup/app/` |

Primer cron (Linux):

```bash
0 2 * * * docker exec supabase-db pg_dump -U postgres postgres | gzip > /opt/spc-web/backup/nightly_$(date +\%F).sql.gz
```

Čuvaj backup na **drugom disku** ili NAS-u u fabrici.

---

## Faza 9 — Ažuriranje aplikacije (nova verzija)

1. Na dev računaru: izmene koda, test lokalno.
2. `npm run build` sa **istim** `VITE_SUPABASE_URL` kao produkcija.
3. Prebaci novi `dist/` na server (zameni stari).
4. Ako ima **nove SQL migracije** — pokreni ih u Studio pre deploy-a frontenda.
5. `nginx -s reload` (obično nije potreban restart).

---

## Obaveštenja (Teams / email)

| Kanal | On‑premise |
|-------|------------|
| **Browser notifikacije** | Rade (admin u LAN-u) |
| **Teams webhook** | Samo ako firewall dozvoljava izlaz ka Microsoftu |
| **Edge `send-webhook`** | Deploy na server: `supabase functions deploy` ili isključi Teams u Admin → Obaveštenja |

Vidi `docs/SUPABASE_EDGE_WEBHOOK.md`.

---

## Rešavanje problema

| Problem | Rešenje |
|---------|---------|
| Beli ekran | Proveri browser konzolu; pogrešan `VITE_SUPABASE_URL` u build-u |
| Login ne radi | Auth URL mora biti dostupan; proveri Nginx proxy za `/auth/v1` |
| Nema crteža | Storage bucket + `restore:storage`; RLS politike |
| Realtime ne radi | WebSocket kroz Nginx — vidi `proxy_set_header Upgrade` u nginx primeru |
| CORS greška | API i SPA na istom domenu (reverse proxy) |
| Spor rad | RAM servera; indeksi u bazi; SSD disk |

---

## Brza referenca — redosled za prvi deploy

```
[TVoj PC]
  1. backup:db + backup:storage
  2. pakuj-za-firminski-server.ps1
  3. prebaci deploy-paket na server firme

[Server firme]
  4. docker compose up (Supabase)
  5. SQL migracije redom
  6. restore SQL dump + restore storage
  7. .env.production → npm run build
  8. nginx + HTTPS
  9. kreiraj Auth korisnike
 10. test sa tableta u LAN-u
 11. ugasi cloud pristup
```

---

## Povezani fajlovi u projektu

| Fajl | Namena |
|------|--------|
| `deploy/nginx-spc.conf.example` | Nginx: SPA + Supabase proxy |
| `deploy/env.production.example` | Build za firmu |
| `deploy/IT_CHECKLIST.md` | Lista za IT odeljenje |
| `scripts/pakuj-za-firminski-server.ps1` | Pakovanje za prenos |
| `docs/UPUTSTVO_LOKALNA_BAZA.md` | Backup i lokalni test |
| `docs/MIGRACIJE.md` | Redosled SQL |

---

## Zaštita koda i licenca

Posle deploy-a: **`docs/UPUTSTVO_ZASTITA_KODA_I_LICENCA.md`** (zaštita izvora, uključivanje/isključivanje po datumu).

---

## Bezbednost (za IT)

- Supabase **service_role** samo na serveru, nikad u browseru.
- Pristup Supabase Studio (`:8000`) ograniči na admin IP ili VPN.
- PostgreSQL port (`5432`) **ne izlaži** na internet — samo localhost Docker mreža.
- Redovni backup i test restore jednom mesečno.
- Audit: svi unosi imaju `kontrolor`, `created_at`, `sesija_id` u bazi.
