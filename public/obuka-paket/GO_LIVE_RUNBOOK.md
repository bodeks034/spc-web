# Go-live runbook — TRI-CORE QC

Korak-po-korak pre puštanja operatera u produkciju.

---

## Automatski gate

```powershell
cd C:\mix\spc-web
npm run deploy:go-live
```

Proverava: licenca, unit testovi, auto smoke, build, šemu, deploy check (+ E2E ako ima kredencijale).

Izveštaj: `logs/go-live-*.txt`

---

## 1. Baza i šema

```powershell
npm run db:migrate
npm run db:migrate:auto
npm run db:verify
```

Admin → **Status šeme** — sve zeleno (uključujući `61_auto_telemetrija`).

### Nova firma (zadrži šifrarnik, obriši operativu)

Ako na istoj bazi prelaziš sa demo/test podataka na praznu operativu:

```powershell
npm run db:ocisti-operativu:dry
npm run db:ocisti-operativu -- --potvrdi
```

Varijanta koja zadržava 8D/PFMEA dokumente: `npm run db:ocisti-operativu:qms -- --potvrdi`

Skripte: `scripts/ocisti-operativu-pre-go-live.sql`, `scripts/ocisti-operativu-zadrzi-qms.sql`

---

## 2. Automatizacija

```powershell
npm run auto:install:admin
npm run auto:podsetnici:dry
npm run digest:smena:dry
```

Admin → **Status automatizacije** — poslednji runovi vidljivi.

Env u `.env.local`:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_TO`
- `SPC_BACKUP_DIR` (backup na NAS)

---

## 3. Frontend / Docker

On-prem Windows: vidi `deploy/WINDOWS_ONPREM.md`

```powershell
npm run build
# ili Docker: deploy/docker-compose.spc.yml
```

HTTPS obavezno (kamera, Web Serial).

### Vercel (cloud frontend + Admin API)

Ako je frontend na Vercel-u, u **Project → Settings → Environment Variables** postavi:

| Promenljiva | Svrha |
|-------------|--------|
| `VITE_SUPABASE_URL` | Supabase projekat (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Javni ključ (frontend) |
| `SUPABASE_URL` | Isti URL — serverless API rute |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **Admin → Očisti operativu** preko `/api/admin-ocisti-operativu` |
| `ADMIN_API_SECRET` ili `CRON_SECRET` | Opciono: Bearer auth za API bez JWT |

**Pre go-live:** pokreni u Supabase SQL Editoru migracije `77_ocisti_operativu_rpc.sql`, `78_obrisi_deo_iz_sifrarnika_rpc.sql` i `79_obrisi_demo_delove_rpc.sql` (ili `npm run db:migrate:go-live`).

Admin panel poziva `POST /api/admin-ocisti-operativu` sa telom `{ "zadrzi_qms": false, "potvrdi": "OCISTI_OPERATIVU" }` — isto kao `npm run db:ocisti-operativu -- --potvrdi`.

---

## 4. Test nalozi

| Uloga | Provera |
|-------|---------|
| Operater | Login, unos merenja, shop-floor |
| Kvalitet | NCR, 8D, SPC alarmi |
| Šef | Digest, dashboard, auto-pravila |
| Admin | Status šeme, ISO audit, korisnici |

```powershell
npm run e2e:full-tok
```

Zahteva `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_EMAIL_KVALITET`.

---

## 5. Backup i restore

1. Pokreni `scripts/backup-postgres-windows.ps1` ručno jednom
2. Restore na test instancu (IT)
3. Task `SPC-Postgres-Backup` — 02:00

---

## 6. ISO audit paket (pre audita)

**Admin → ISO AUDIT PAKET:**
- Export audit log (CSV) — auto akcije + cron
- PDF po lotu/VIN

**CLI:**
```powershell
npm run iso:audit
npm run iso:audit -- --lot LOT-A1 --id-deo 5502-A --od 2026-07-01 --do 2026-07-09
```

Izlaz: `audit-export/YYYY-MM-DD_YYYY-MM-DD/`

---

## 7. Obuka (30 min)

1. Početni ekran i moduli
2. 3×NOK → eskalacija (auto)
3. NCR otvaranje / zatvaranje
4. Trasabilitet + ISO PDF
5. Admin status (šef/kvalitet)

Materijal: `docs/obuka-paket/OBUKA_INZENJER_MODUL2.html`

---

## 8. Go / No-go

| Kriterijum | OK |
|------------|-----|
| `deploy:go-live` prolazi | [ ] |
| Šema 36/36 | [ ] |
| Email digest test | [ ] |
| Backup + restore test | [ ] |
| E2E puni tok | [ ] |
| IT checklist potpisan | [ ] |

Potpis kvalitet: _______________  Datum: _______________

Potpis IT: _______________

---

Povezano: `deploy/IT_CHECKLIST.md` · `docs/obuka-paket/UPUTSTVO_AUTOMATIZACIJA.md`
