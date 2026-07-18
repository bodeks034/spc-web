# Automatizacija SPC — uputstvo za IT i kvalitet

Kompletan pregled cron zadataka, real-time pravila i održavanja.

---

## Brzi start (Windows)

```powershell
cd C:\mix\spc-web
npm run auto:install:admin    # Task Scheduler (10 zadataka)
npm run db:migrate:auto       # telemetrija (ako nije vec primenjeno)
```

**Linux (Ubuntu server):**

```bash
chmod +x scripts/install-automatizacija-linux.sh scripts/backup-postgres-linux.sh
./scripts/install-automatizacija-linux.sh
```

---

## Zadaci (cron / Task Scheduler)

| Zadatak | Raspored | Skripta | Log |
|---------|----------|---------|-----|
| ERP uvoz | 06:00 | `erp-dnevni-uvoz.mjs` | `logs/erp-uvoz.log` |
| ERP izvoz kvaliteta | 06:15 | `erp-izvoz-kvalitet.mjs` | `logs/erp-izvoz-kvalitet.log` |
| ERP arhiva retention | Ned 03:00 | `erp-processed-cleanup.mjs --apply` | `logs/erp-processed-cleanup.log` |
| Health check | 06:30 | `auto-health-check.mjs --email` | `logs/auto-health.log` |
| Podsetnici | 08:00 | `auto-podsetnici.mjs` | `logs/auto-podsetnici.log` |
| Digest smena 1 | 14:05 | `smenski-digest.mjs --pdf` | `logs/smenski-digest.log` |
| Digest smena 2 | 22:05 | `smenski-digest.mjs --smena 2 --pdf` | `logs/smenski-digest.log` |
| Nedeljni rollup | Pet 15:00 | `nedeljni-rollup.mjs` | `logs/nedeljni-rollup.log` |
| PG backup | 02:00 | `backup-postgres-*.ps1/sh` | `logs/pg-backup.log` |
| Moment-drop | pri logovanju (Win) | `watch-moment-drop.mjs --watch` | — |

---

## Env (.env.local)

| Promenljiva | Namena |
|-------------|--------|
| `SUPABASE_URL` | API baze |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron skripte (obavezno za pune podsetnike) |
| `SMTP_TO` | Primalac digesta i health upozorenja |
| `DATABASE_URL` | Lokalne migracije (`npm run db:migrate:auto`) |
| `SPC_BACKUP_DIR` | Folder backupa (Win: `D:\Backup\spc`, Linux: `/var/backups/spc`) |
| `SPC_DOCKER_DB` | Ime Docker kontejnera PG (default: `supabase-db`) |
| `LICENSE_VAZI_DO` | Opciono — podsetnik pre isteka (cron) |
| `CRON_SECRET` | Samo Vercel cloud cron (`api/cron.js`) |
| `DIGEST_PDF` | `1` = uvek PDF prilog u digestu |

---

## Real-time pravila (u aplikaciji)

- **3× NOK** — eskalacija, NCR draft, vodič „pauziraj seriju“
- **SPC alarm** — NCR draft, blokada linije
- **Zatvaranje NCR** — zatvara eskalacije i SPC alarme
- **KPI dorada** — podsetnik ako nema dorade 2h+
- **Proaktivno** — kalibracija, MSA, NCR rok, licenca (`license.json` + RPC)

Ukljucivanje/iskljucivanje: **Admin → Podešavanja auto-pravila**.

---

## Komande za održavanje

```bash
npm run logs:auto              # pregled logova
npm run auto:podsetnici:dry    # podsetnici bez slanja
npm run digest:smena:dry       # digest bez emaila
npm run digest:smena:dry -- --po-linijama   # digest po linijama (dry)
npm run digest:smena -- --linija "Ulazna kontrola"   # jedna linija
npm run auto:health            # health check
npm run auto:smoke             # smoke (dry podsetnici + digest)
npm run erp:izvoz:dry          # pregled dnevnog quality izvoza bez pisanja
npm run erp:cleanup            # processed retention dry-run (90 dana)
npm run erp:cleanup:apply      # primeni potvrđene retention kandidate
npm run auto:uninstall         # ukloni Windows taskove
```

---

## Admin panel

- **Status automatizacije** — poslednji runovi iz `auto_run_log`, audit iz `auto_akcije_log`, CSV export
- **Status šeme** — provera migracija ukljucujuci `61_auto_telemetrija.sql`
- **Podešavanja auto-pravila** — odvojeni toggle-i za ERP uvoz i ERP izvoz

---

## Health check — sta proverava

1. Supabase konekcija i kljucne tabele
2. Nedostajuce SQL migracije
3. `SMTP_TO` podešen
4. ERROR u logovima (ERP uvoz/izvoz, digest, podsetnici)
5. **2× uzastopni FAIL** istog cron joba u `auto_run_log` → email upozorenje

---

## Cloud (Vercel)

Ako frontend ide na Vercel umesto on-prem cron-a:

1. Postavi `CRON_SECRET` u Vercel env
2. `vercel.json` sadrzi crons za health, podsetnici, digest, weekly
3. Endpoint: `/api/cron?job=health|podsetnici|digest|weekly`

On-prem i cloud **ne treba** da rade istovremeno (dupli email).

---

## Migracije

| Fajl | Sadrzaj |
|------|---------|
| `61_auto_telemetrija.sql` | `auto_run_log`, `auto_akcije_log` |

```bash
npm run db:migrate:auto
npm run db:verify
```

---

## Povezana dokumentacija

- ERP uvoz: `docs/obuka-paket/UPUTSTVO_ERP_RADNI_NALOZI.md`
- IT checklist: `deploy/IT_CHECKLIST.md`
- Go-live runbook: `docs/obuka-paket/GO_LIVE_RUNBOOK.md`
- Windows on-prem: `deploy/WINDOWS_ONPREM.md`
- Migracije: `docs/MIGRACIJE.md`

---

## ISO audit paket

Za reviziju / ISO audit — kombinovani CSV audit loga (`auto_akcije_log` + `auto_run_log`) i opciono trasabilitet PDF po lotu.

**CLI (preporučeno za arhivu):**

```bash
npm run iso:audit
npm run iso:audit -- --od 2026-07-01 --do 2026-07-09
npm run iso:audit -- --lot LOT-A1 --id-deo 5502-A
```

Izlaz: `audit-export/{od}_{do}/` — `ISO_audit_log.csv`, `manifest.json`, opciono `trasabilitet_LOT_*.pdf`.

**UI:** Admin → ISO audit panel — period, preuzmi CSV, PDF po lotu.

**Trasabilitet modul:** dugme „ISO PDF” kada je VIN/lot popunjen.
