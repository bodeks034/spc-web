# IT checklist — SPC aplikacija na internom serveru

Dokument za IT odeljenje fabrike. Aplikacija: **SPC Kontrola Kvaliteta** (React + self-hosted Supabase).

> **Za dobavljača:** popunjivi checklist pre instalacije (jedna firma) → `docs/obuka-paket/CHECKLIST_PRE_INSTALACIJA_FIRMA.md`

---

## Namena

Interni web sistem za unos kontrole kvaliteta (atributivne i merljive mere). Podaci **ne smeju** na javni cloud — sve u LAN-u.

---

## Zahtevi servera

| Resurs | Minimum | Preporuka |
|--------|---------|-----------|
| CPU | 4 jezgra | 8 jezgra |
| RAM | 8 GB | 16 GB |
| Disk | 50 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Softver | Docker + Docker Compose, Nginx | + automatski backup |

Alternativa: Windows Server 2019+ sa Docker Desktop (manje preporučeno).

---

## Mreža

| Stavka | Vrednost |
|--------|----------|
| DNS (interni) | npr. `spc.firma.local` |
| IP (primer) | `192.168.10.50` |
| HTTPS | **Obavezno** (kamera na tabletima, Web Serial) |
| Sertifikat | Interni CA (GPO/MDM) ili self-signed + distribucija na uređaje |
| Ulazni portovi (LAN) | **443** (web); opciono 8000 samo za admin |
| Izlaz (opciono) | `*.office.com` ako se koriste Teams obaveštenja |

**Firewall:** pristup samo iz fabričkih subnet-a; **bez** port forwarding na internet.

---

## Servisi na serveru

| Servis | Port | Napomena |
|--------|------|----------|
| Nginx | 443 | Statički fajlovi (`dist/`) + reverse proxy |
| Supabase (Docker) | 8000 (interno) | API, Auth, Storage, Realtime |
| PostgreSQL | 5432 (Docker internal) | **Ne izlaži** van hosta |
| Supabase Studio | 8000/studio | Samo za administratore |

---

## Podaci

- **PostgreSQL** — svi šifrarnici, logovi merenja, korisnici (Auth u istoj bazi).
- **Storage** — crteži delova (`spc-crtezi`), Excel kopije (`spc-excel-sync`).
- **Backup** — noćni `pg_dump` + nedeljni Storage; čuvanje na NAS-u u LAN-u.

---

## Korisnici

- Prijava email + lozinka (Supabase Auth).
- Naloge kreira administrator u Supabase Studio ili kroz SQL vezu sa tabelom `radnici`.
- Uloge: operator, kontrolor, kvalitet, admin, sef.

---

## Klijenti (tableti / PC)

- Google Chrome ili Microsoft Edge (najnoviji).
- Pristup: `https://spc.firma.local`
- Ista Wi‑Fi / VLAN kao server.

---

## Održavanje

| Zadatak | Učestalost |
|---------|------------|
| SQL backup | dnevno (02:00 — `SPC-Postgres-Backup` / Linux cron) |
| SPC cron zadaci | vidi `docs/obuka-paket/UPUTSTVO_AUTOMATIZACIJA.md` |
| Provera Docker kontejnera | dnevno (monitoring) |
| OS security patch | mesečno |
| Test restore backup-a | kvartalno |
| Deploy nove verzije frontenda | po dogovoru sa razvojem |

### Automatizacija (cron)

| Windows | `npm run auto:install:admin` |
| Linux | `./scripts/install-automatizacija-linux.sh` |
| Env | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_TO`, `SPC_BACKUP_DIR` |
| Telemetrija SQL | `npm run db:migrate:auto` (fajl `61_auto_telemetrija.sql`) |
| Cloud (Vercel) | `CRON_SECRET` + `api/cron.js` — **ne duplirati** sa on-prem cron-om |

Smoke test: `npm run auto:smoke` · logovi: `npm run logs:auto`
Go-live gate: `npm run deploy:go-live` · ISO audit: `npm run iso:audit` · runbook: `docs/obuka-paket/GO_LIVE_RUNBOOK.md`

---

## Licenca i zaštita koda

- Na server ide samo **`dist/`** (minifikovan build), ne `src/`.
- Produženje rada programa vrši **dobavljač softvera**, ne IT (potpisana licenca + baza).
- `service_role` ključ za licenciranje **nije** deo operativnog IT pristupa.

**Windows on-prem korak-po-korak:** `deploy/WINDOWS_ONPREM.md`

Vidi: `docs/obuka-paket/UPUTSTVO_ZASTITA_KODA_I_LICENCA.md`

## Kontakt za deploy

Razvojni paket: folder `deploy-paket/` sa SQL migracijama, `backup/`, nginx primerom.  
Glavno uputstvo: `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md`.

---

## Potvrda IT (popuniti)

- [ ] Server provisioned
- [ ] DNS / hosts zapis
- [ ] HTTPS sertifikat
- [ ] Firewall pravila
- [ ] Docker instaliran
- [ ] Backup destinacija (NAS) — `SPC_BACKUP_DIR` u env
- [ ] SPC cron instaliran (`auto:install` ili Linux skripta)
- [ ] `61_auto_telemetrija.sql` primenjen (Admin → Status automatizacije)
- [ ] Test pristup sa jednog tableta u LAN-u

Datum: _______________  
Potpis IT: _______________
