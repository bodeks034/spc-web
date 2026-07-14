# SPC on-prem — Windows Server (Docker + IIS/Nginx)

Kompletan put za **Windows Server**, **Docker dozvoljen**, podaci **samo u LAN-u** (bez cloud Supabase).

Povezano: `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md`, `deploy/IT_CHECKLIST.md`, `docs/MIGRACIJE.md`

---

## Arhitektura

```
Tableti/PC  →  https://spc.firma.local
                    │
        ┌───────────┴───────────┐
        │  IIS ili Nginx (443)   │  ← dist/ (React build)
        │  proxy /auth, /rest,   │
        │  /storage, /realtime   │
        └───────────┬───────────┘
                    │ localhost:8000
        ┌───────────┴───────────┐
        │  Docker: Supabase      │
        │    └─ PostgreSQL       │  ← baza na disku servera
        └───────────────────────┘
```

**Preporuka:** jedan domen (`https://spc.firma.local`) — API ide kroz proxy, ne otkrivaš port 8000 tabletima.

---

## Faza 0 — Šta IT pripremi

| Stavka | Vrednost |
|--------|----------|
| OS | Windows Server 2019/2022 |
| Docker | Docker Desktop ili WSL2 + Docker |
| DNS | `spc.firma.local` → IP servera |
| HTTPS | Interni sertifikat (obavezno za kamere/tablete) |
| Firewall | LAN → **443**; **5432** samo localhost |
| Folderi | `C:\spc-web\sql`, `C:\inetpub\spc-web\dist` |

---

## Faza 1 — Supabase Docker (baza + API)

### 1.1 Kloniranje i `.env`

```powershell
cd C:\
git clone --depth 1 https://github.com/supabase/supabase
cd C:\supabase\docker
copy .env.example .env
notepad .env
```

Koristi primer iz **`deploy/env.supabase.docker.windows.example`** (prilagodi lozinke i URL).

Ključne vrednosti:

```env
POSTGRES_PASSWORD=<jaka_lozinka>
JWT_SECRET=<openssl rand -base64 32>

# Kako browser vidi API (posle Nginx/IIS proxy-ja):
SITE_URL=https://spc.firma.local
API_EXTERNAL_URL=https://spc.firma.local
SUPABASE_PUBLIC_URL=https://spc.firma.local

# Ako proxy NE radi na početku — privremeno direktno:
# API_EXTERNAL_URL=http://spc.firma.local:8000
# SUPABASE_PUBLIC_URL=http://spc.firma.local:8000
```

### 1.2 Pokretanje

```powershell
cd C:\supabase\docker
docker compose pull
docker compose up -d
docker compose ps
```

Čekaj 2–5 min. Studio (admin): `http://localhost:8000` (ili port iz `.env`).

### 1.3 Anon ključ (za build aplikacije)

```powershell
Select-String -Path C:\supabase\docker\.env -Pattern "^ANON_KEY="
```

Kopiraj vrednost u `.env.production` kao `VITE_SUPABASE_ANON_KEY`.

**SERVICE_ROLE_KEY** iz istog fajla — **čuvaš samo ti**, ne daješ IT-u.

---

## Faza 2 — SQL migracije

### Način A — PowerShell + Docker (preporučeno na serveru)

Kopiraj ceo projekat (ili samo `*.sql`) u `C:\mix\spc-web\`.

```powershell
cd C:\mix\spc-web
# Provera imena DB kontejnera:
docker ps --format "{{.Names}}" | Select-String db

# Dry-run (lista fajlova):
.\scripts\pokreni-migracije-windows.ps1 -DryRun

# Primena (default kontejner: supabase-db):
.\scripts\pokreni-migracije-windows.ps1

# Ako je drugačije ime:
.\scripts\pokreni-migracije-windows.ps1 -DockerContainer supabase_db_spc-web
```

### Način B — sa dev računara (DATABASE_URL)

U `.env.local` na računaru gde je `npm` (VPN u LAN ili RDP na server):

```env
# Supabase Docker obično izlaže Postgres na host (proveri docker compose ps / port mapping)
DATABASE_URL=postgresql://postgres:LOZINKA@192.168.10.50:5432/postgres
```

```powershell
cd C:\mix\spc-web
npm run db:migrate -- --all
npm run db:verify
```

### Posle migracija — licenca u bazi (Sloj B, samo ti)

Sa **tvog** računara (ne na serveru gde IT čita env):

```powershell
cd C:\mix\spc-web
$env:SUPABASE_URL="https://spc.firma.local"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role — samo kod tebe>"
node scripts/postavi-licencu.mjs --do 2027-12-31 --enable --deployment on-prem --tenant firma-xy --napomena "Go-live"
```

---

## Faza 3 — Build frontenda

Na dev računaru (ili na serveru ako ima Node):

```powershell
cd C:\mix\spc-web
copy deploy\env.production.windows.example .env.production
notepad .env.production
# Popuni VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY

# Sloj A licence (potpisani fajl):
node scripts/generisi-licencu.mjs --enable --do 2027-12-31 --tenant firma-xy --deployment on-prem --out deploy/license.firma.json

npm run build
```

Kopiraj **`dist\`** na server:

```powershell
robocopy C:\mix\spc-web\dist C:\inetpub\spc-web\dist /MIR
```

---

## Faza 4 — Web server na Windowsu

### Varijanta A — Nginx for Windows (najlakše, isti config kao Linux)

1. Instaliraj [Nginx for Windows](https://nginx.org/en/download.html)
2. Kopiraj `deploy/nginx-spc.conf.example` → `C:\nginx\conf\spc.conf`
3. Zameni putanje:
   - `root` → `C:/inetpub/spc-web/dist`
   - SSL sertifikati → putanje IT-a
   - `proxy_pass` → `http://127.0.0.1:8000`
4. U `nginx.conf` uključi `include spc.conf;`
5. `nginx -s reload`

**`.env.production` za build:**

```env
VITE_SUPABASE_URL=https://spc.firma.local
VITE_SUPABASE_ANON_KEY=<anon>
```

### Varijanta B — IIS

Detaljno: **`deploy/IIS_SETUP_WINDOWS.md`**

1. Instaliraj **URL Rewrite** + **Application Request Routing (ARR)** — uključi **Server Proxy**
2. Site → fizički put `C:\inetpub\spc-web\dist`
3. Kopiraj **`deploy/web.config`** u `dist\` (posle svakog build-a)
4. HTTPS binding + interni sertifikat
5. WebSocket enabled (Realtime)

```powershell
copy C:\mix\spc-web\deploy\web.config C:\inetpub\spc-web\dist\web.config
```

Build mora imati `VITE_SUPABASE_URL=https://spc.firma.local` (isti host kao IIS).

### Varijanta C — Bez proxy-ja (brza proba, ne za produkciju)

Build sa:

```env
VITE_SUPABASE_URL=https://spc.firma.local:8000
```

Firewall mora pustiti **8000** iz LAN-a; HTTPS na 8000 zahteva dodatni TLS na Kong-u — zato **ne preporučujemo**.

### Varijanta D — Samo Docker frontend (test)

```powershell
cd C:\mix\spc-web\deploy
copy .env.docker.windows.example .env.docker
notepad .env.docker
docker compose -f docker-compose.spc.yml --env-file .env.docker up -d --build
```

Otvori `http://server:8080` — nginx u kontejneru proxy-uje na `host.docker.internal:8000`.

---

## Faza 5 — Provera

| Korak | Kako |
|-------|------|
| API | `https://spc.firma.local/rest/v1/` (401 je OK — znači da API živi) |
| Login | Operater sa tableta u LAN-u |
| Šema | Admin → Status šeme (sve zeleno) |
| Licenca | `node scripts/verify-license.mjs` |
| Backup | Task Scheduler → `scripts\backup-postgres-windows.ps1` |

---

## Backup (IT — Task Scheduler)

```powershell
cd C:\mix\spc-web
.\scripts\backup-postgres-windows.ps1 -DockerContainer supabase-db -OutDir D:\Backup\spc
```

Noćni zadatak: pokreni istu komandu u 02:00.

---

## Ko šta drži

| Resurs | IT | Ti (dobavljač) |
|--------|----|----------------|
| Server, Docker, IIS/Nginx | ✅ | |
| `postgres` backup | ✅ | |
| `dist/` deploy | po dogovoru | ✅ |
| `private.pem` | ❌ | ✅ |
| `SERVICE_ROLE_KEY` | ❌ | ✅ (offline) |
| Produženje licence | ❌ | ✅ |

---

## Rešavanje problema

| Problem | Rešenje |
|---------|---------|
| Login ne radi | Proveri `VITE_SUPABASE_URL` u build-u = URL u browseru; proxy `/auth/v1` |
| CORS | `SITE_URL` u supabase `.env` mora biti isti domen |
| Šema crvena | Ponovi migracije; `npm run db:verify` |
| `docker exec` ne nađe DB | `docker ps` → `-DockerContainer` parametar |
| Tablet ne veruje HTTPS | IT distribuira interni CA na uređaje |

---

## Fajlovi u ovom paketu

| Fajl | Namena |
|------|--------|
| `deploy/env.supabase.docker.windows.example` | Supabase `C:\supabase\docker\.env` |
| `deploy/env.production.windows.example` | Build → `.env.production` |
| `deploy/.env.docker.windows.example` | Docker samo frontend |
| `scripts/pokreni-migracije-windows.ps1` | SQL 01–60 redom |
| `scripts/backup-postgres-windows.ps1` | Noćni pg_dump |
| `deploy/web.config` | IIS — kopija u `dist\` |
| `deploy/IIS_SETUP_WINDOWS.md` | IIS + ARR uputstvo |
