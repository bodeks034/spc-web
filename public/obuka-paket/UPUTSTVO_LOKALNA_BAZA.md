# Lokalna kopija Supabase baze i pokretanje aplikacije sa računara

Ovaj vodič objašnjava kako da:

1. **snimite kompletnu cloud bazu** na svoj računar (arhiva / disaster recovery),
2. **pokrenete lokalni Supabase** (Docker) i učitate podatke,
3. **povežete SPC aplikaciju** na lokalnu bazu umesto na internet.

---

## Šta „kompletna baza” uključuje

| Deo | Šta sadrži | Gde se čuva |
|-----|------------|-------------|
| **PostgreSQL** | tabele, podaci, RLS, view-ovi, sekvence | SQL dump |
| **Auth** | korisnici (`auth.users`), lozinke (hash) | u istom dump-u |
| **Storage** | crteži (`spc-crtezi`), Excel kopije (`spc-excel-sync`) | fajlovi na disku |
| **Edge funkcije** | `send-webhook` (Teams proxy) | `supabase/functions/` u projektu |
| **Šema (migracije)** | SQL fajlovi `01_…sql` … `20_…sql` | već u repou |

Aplikacija **ne radi sama od sebe** samo sa `.sql` fajlom — potreban je Supabase runtime (Auth + API + Realtime + Storage). Zato je preporuka: **Supabase lokalno preko Dockera**.

---

## Preduslovi (Windows)

1. **Node.js** (već imate za `npm run dev`)
2. **Docker Desktop** — [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)  
   Mora biti pokrenut (zelena ikonica u tray-u).
3. **Supabase CLI** — u PowerShell-u (admin):

```powershell
scoop install supabase
# ili:
npm install -g supabase
```

Provera:

```powershell
supabase --version
docker ps
```

---

## Pristup A — samo backup cloud baze na disk (arhiva)

Koristi se kada želite **kopiju za čuvanje**, bez lokalnog rada.

### 1. Prijava i povezivanje projekta

```powershell
cd C:\mix\spc-web
supabase login
supabase link --project-ref wzxkcomeurogvfisticq
```

(`project-ref` je deo URL-a: `https://wzxkcomeurogvfisticq.supabase.co`)

### 2. SQL dump (šema + podaci + auth)

```powershell
$datum = Get-Date -Format "yyyy-MM-dd_HHmm"
New-Item -ItemType Directory -Force -Path "backup\supabase" | Out-Null

supabase db dump --linked -f "backup\supabase\spc_full_$datum.sql"
```

Opciono odvojeno:

```powershell
supabase db dump --linked --schema-only -f "backup\supabase\spc_schema_$datum.sql"
supabase db dump --linked --data-only   -f "backup\supabase\spc_data_$datum.sql"
```

Ili gotova skripta:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-supabase-db.ps1
```

### 3. Storage (crteži i Excel)

Service role ključ: **Supabase Dashboard → Project Settings → API → `service_role` (secret)**.

```powershell
$env:SUPABASE_URL="https://wzxkcomeurogvfisticq.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
node scripts/download-supabase-storage.mjs
```

Fajlovi idu u `backup\storage\spc-crtezi\` i `backup\storage\spc-excel-sync\`.

### 4. Šta još arhivirati

- ceo folder `C:\mix\spc-web` (git + `excel-rad\`, `docs\`)
- folder `backup\` sa dump-ovima
- **nikad** ne commit-uj `service_role` ključ u git

---

## Pristup B — lokalni Supabase + aplikacija (preporučeno za rad offline)

### Pregled koraka

```
Cloud Supabase  ──dump──►  backup/spc_full.sql
                                │
                                ▼
Docker: supabase start  ──restore──►  lokalna baza :54321
                                │
                                ▼
.env.local (VITE_SUPABASE_URL=http://127.0.0.1:54321)
                                │
                                ▼
npm run dev  ──►  aplikacija na http://localhost:5173
```

### 1. Inicijalizacija lokalnog Supabase-a

```powershell
cd C:\mix\spc-web
supabase init
supabase start
```

Prvi `start` skida Docker image-e (5–15 min). Na kraju:

```powershell
supabase status
```

Zapiši:

| Parametar | Tipična vrednost |
|-----------|------------------|
| API URL | `http://127.0.0.1:54321` |
| DB URL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | `http://127.0.0.1:54323` |
| anon key | dugačak JWT iz `supabase status` |

### 2. Kreiranje šeme (migracije)

Lokalna baza je prazna. Pokreni SQL **redom** iz `docs/MIGRACIJE.md`, plus:

| Fajl | Napomena |
|------|----------|
| `09_kalibracija_zahtevi.sql` | zahtevi za kalibraciju |
| `20_radnici_uloge_kvalitet_sef.sql` | uloge kvalitet / šef |

**Način 1 — Supabase Studio (lokalno):**  
Otvori `http://127.0.0.1:54323` → SQL Editor → nalepi sadržaj svakog fajla → Run.

**Način 2 — psql:**

```powershell
$psql = "docker exec -i supabase_db_spc-web psql -U postgres -d postgres"
Get-Content 01_supabase_schema.sql | Invoke-Expression $psql
# ponovi za svaki fajl po redu iz MIGRACIJE.md
```

### 3. Storage bucket-i (lokalno)

U lokalnom SQL Editoru:

```sql
-- Excel sync (već u 06_storage_excel_sync.sql)
-- Crteži delova:
INSERT INTO storage.buckets (id, name, public)
VALUES ('spc-crtezi', 'spc-crtezi', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_read_crtezi" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'spc-crtezi');

CREATE POLICY "auth_write_crtezi" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'spc-crtezi')
  WITH CHECK (bucket_id = 'spc-crtezi');
```

### 4. Učitavanje podataka iz cloud-a

Ako imaš dump iz Pristupa A:

```powershell
# Zaustavi API da ne smeta restore-u (opciono)
# supabase stop

# Učitaj dump u lokalnu bazu
Get-Content "backup\supabase\spc_full_2026-06-06_1200.sql" |
  docker exec -i supabase_db_spc-web psql -U postgres -d postgres
```

**Napomena:** dump sa cloud-a može sadržati ekstenzije ili uloge koje lokalni Postgres ne prepoznaje. Ako restore padne:

- prvo učitaj samo `--schema-only`, pa `--data-only` bez `auth` šeme, ili
- koristi CSV uvoz: `npm run import:docs` (vidi `docs/UVOZ_UPUTSTVO.md`).

### 5. Auth korisnici (prijava u aplikaciju)

Posle restore-a cloud `auth.users` obično rade i lokalno (isti email/lozinka).

Ako nema korisnika, u **lokalnom Studio → Authentication → Users** dodaj nalog, pa u SQL:

```sql
-- Poveži sa radnikom (primer)
UPDATE radnici
SET user_id = '<uuid-iz-auth-users>', email = 'admin@fabrika.com'
WHERE id = 1;
```

Detalji: `10_povezi_auth_radnici.sql`.

### 6. Upload Storage fajlova (crteži, Excel)

Posle `download-supabase-storage.mjs` sa cloud-a, upload na lokalni Supabase:

```powershell
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role iz: supabase status>"
node scripts/upload-storage-local.mjs
```

Ili ručno u Studio → Storage → bucket → Upload.

### 7. Povezivanje aplikacije na lokalnu bazu

```powershell
cd C:\mix\spc-web
copy .env.example .env.local
```

Uredi `.env.local`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key iz supabase status>
```

Pokretanje:

```powershell
# Terminal 1 — baza (jednom, dok radi Docker)
supabase start

# Terminal 2 — aplikacija
npm run dev
```

Otvori `http://localhost:5173` i prijavi se.

Za produkcioni build lokalno:

```powershell
npm run build
npm run preview
```

### 8. Edge funkcija (Teams obaveštenja) — opciono

Lokalno:

```powershell
supabase functions serve send-webhook
```

Bez ovoga aplikacija i dalje radi; Teams webhook možda neće proći (CORS). Vidi `docs/SUPABASE_EDGE_WEBHOOK.md`.

---

## Pristup C — samo aplikacija lokalno, baza ostaje u cloud-u

Najjednostavnije za svakodnevni rad:

```powershell
cd C:\mix\spc-web
npm install
npm run dev
```

Aplikacija koristi cloud Supabase (podrazumevano u kodu).  
Backup radiš povremeno preko **Pristupa A**.

---

## Redovni backup (preporuka)

| Učestalost | Akcija |
|------------|--------|
| **Dnevno / nedeljno** | `scripts\backup-supabase-db.ps1` |
| **Posle većeg uvoza** | + `download-supabase-storage.mjs` |
| **Mesečno** | kopija celog `C:\mix\spc-web` na drugi disk / NAS |

Čuvaj bar **3 generacije** dump-ova (`backup\supabase\`).

---

## Rešavanje problema

### `supabase start` ne radi

- Proveri Docker Desktop (mora biti pokrenut).
- WSL2: u Docker Settings → Resources → WSL integration.

### Aplikacija ne vidi podatke

- Proveri `.env.local` — mora biti `VITE_` prefiks.
- Posle izmene `.env.local`: restartuj `npm run dev`.
- U browser DevTools → Network: da li API ide na `127.0.0.1:54321`?

### Greška pri restore SQL

- Restore na **praznu** lokalnu bazu posle svih migracija.
- Konflikti: `DROP SCHEMA public CASCADE` (samo lokalno!) pa migracije iznova.

### RLS / „permission denied”

- Ulogovan si? Lokalni anon key + Auth session moraju postojati.
- Za skripte koristi `SUPABASE_SERVICE_ROLE_KEY` (zaobilazi RLS).

### Realtime (kalibracija, prekid) ne osvežava

- Lokalni Supabase podržava Realtime; proveri da je `supabase start` aktivan.
- Firewall ne blokira `54321`.

### PowerShell blokira npm

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# ili koristi cmd:
cmd /c "npm run dev"
```

---

## Brza referenca — komande

```powershell
# Backup cloud baze
supabase login
supabase link --project-ref wzxkcomeurogvfisticq
supabase db dump --linked -f backup\supabase\spc_full.sql

# Lokalni Supabase
supabase init
supabase start
supabase status
supabase stop

# Aplikacija na lokalnu bazu
# .env.local → VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

---

## Deploy na server firme

Kad lokalni test radi, sledeći korak je produkcija u fabrici: **`docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md`**

## Povezana dokumentacija

- `docs/MIGRACIJE.md` — redosled SQL migracija
- `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md` — prebacivanje na interni server
- `docs/UVOZ_UPUTSTVO.md` — uvoz CSV iz `docs/`
- `docs/EXCEL_I_PUTANJE.md` — Excel ↔ Storage
- `docs/SUPABASE_EDGE_WEBHOOK.md` — Teams proxy
- `.env.example` — šablon za lokalne promenljive

---

## Bezbednost

- **`service_role`** daje pun pristup bazi — čuvaj samo lokalno, nikad u gitu.
- Lokalni Supabase (`supabase start`) nije izložen internetu dok ne proslediš portove ručno.
- Za produkciju na fabričkoj mreži razmotri self-hosted Supabase ili VPN do cloud projekta.
