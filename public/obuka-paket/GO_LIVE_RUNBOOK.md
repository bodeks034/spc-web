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

Materijal: `docs/obuka-paket/UPUTSTVO_OBUKA_INZENJER_MODUL2.md`

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
