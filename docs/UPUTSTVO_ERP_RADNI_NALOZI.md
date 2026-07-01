# Uvoz radnih naloga iz ERP (CSV)

Dnevni izvoz iz SAP / Pantheon / custom ERP → SPC Web (konfigurabilan uvoz u više tabela).

**Nivo C — konfiguracija:** vidi `docs/UPUTSTVO_ERP_KONFIGURACIJA.md`  
Preseti: `config/erp/presets/sap.json`, `pantheon.json`  
Aktivni config: `config/erp/erp-uvoz.config.json`

## Kolone radnih naloga (redosled fleksibilan)

| Kolona | Obavezno | Primer | Alternativni nazivi |
|--------|----------|--------|---------------------|
| `broj_naloga` | Da | `RN-2026-101` | `radni nal`, `RN`, `nalog` |
| `id_deo` | Da | `5502-A` | `id dela`, `id_dela` |
| `naziv_dela` | Ne | Osovina | |
| `kolicina` | Ne | 500 | `količina` |
| `kupac` | Ne | Kupac A | |
| `datum_unosa` | Ne | 2026-06-01 ili 01.06.2026 | `datum unosa` |
| `rok_isporuke` | Ne | 2026-06-15 | `rok isporuke` |
| `status` | Ne | `aktivan` | `zavrsen`, `otkazan` |
| `operater` | Ne | | |
| `napomena` | Ne | | |

Primer fajla: `docs/erp_radni_nalozi.example.csv`

---

## Automatski dnevni uvoz (preporučeno)

ERP **automatski izvozi** CSV u folder — bez ručnog uploada u aplikaciji.

### 1. SQL migracije (jednom)

U Supabase SQL Editoru:

1. `38_erp_uvoz_log.sql`
2. `39_erp_uvoz_grants.sql`

### 2. Podešavanje env

Kopiraj u `.env.erp` u korenu projekta:

```env
SUPABASE_URL=https://wzxkcomeurogvfisticq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role>
ERP_DROP_DIR=erp-drop/incoming
ERP_MIN_AGE_MIN=2
```

### 3. ERP drop folder

Podesi ERP da svaki dan piše CSV u:

```
C:\mix\spc-web\erp-drop\incoming\
```

(npr. `radni_nalozi.csv` — bilo koji naziv sa `.csv`)

Posle uspešnog uvoza fajl se premešta u `erp-drop/processed/YYYY-MM-DD/`.

### 4. Windows Task Scheduler

```cmd
cd C:\mix\spc-web
powershell -ExecutionPolicy Bypass -File scripts\registruj-erp-cron.ps1
```

Registruje zadatak **SPC-ERP-DnevniUvoz** — svaki dan u **05:30**.

Test odmah:

```cmd
npm run import:erp-dnevni
```

ili:

```cmd
powershell -ExecutionPolicy Bypass -File scripts\erp-dnevni-uvoz.ps1
```

### 5. Linux cron (firminski server)

```bash
chmod +x deploy/erp-dnevni-uvoz-cron.sh
# crontab -e:
30 5 * * * /opt/spc-web/deploy/erp-dnevni-uvoz-cron.sh >> /opt/spc-web/logs/erp-uvoz.log 2>&1
```

### 6. Praćenje

- **Log fajl:** `logs/erp-uvoz.log`
- **Baza:** tabela `erp_uvoz_log`
- **UI:** Merljive → tab **Nalozi** — prikaz poslednjeg automatskog uvoza

---

## Ručni uvoz (fallback)

```powershell
cd C:\mix\spc-web
node scripts/import-radni-nalozi.mjs C:\putanja\nalozi.csv
```

Provera bez upisa:

```bash
node scripts/import-radni-nalozi.mjs --dry-run
npm run import:radni-nalozi -- --dry-run
```

---

## Uvoz iz aplikacije

Merljive → tab **Nalozi** → **📎 CSV uvoz (ERP)**.

- Podržava iste kolone kao gore
- **Upsert** po `broj_naloga` (isti RN se ažurira, ne duplira)
- Kupci se automatski dodaju u šifarnik `kupci`

---

## Nepotpuni podaci u ERP — da li je problem?

| Situacija | Ponašanje | Rizik |
|-----------|-----------|-------|
| Nedostaje `broj_naloga` ili `id_deo` | Red se **preskače**, upozorenje u logu | Nizak — samo taj red ne uđe |
| Prazne opcione kolone (količina, kupac, rok…) | **Automatski uvoz** čuva stare vrednosti iz baze (`mergeNulls`) | Nizak |
| Ručni CSV uvoz iz UI | Prazna polja **prepisuju** postojeće vrednosti | Srednji — koristi pun izvoz |
| Prazan `status` u ERP | Automatski uvoz **ne menja** postojeći status; novi RN = `aktivan` | Nizak |
| `id_deo` ne postoji u šifrarniku `delovi` | **Greška FK** — batch ne prolazi | **Visok** — prvo uvezi deo u Excel/šifrarnik |
| ERP izvozi samo aktivne RN | Završeni RN ostaju u bazi sa starim statusom | OK ako je to namerno |
| ERP izvozi pun snapshot sa statusom | Sve se ažurira uključujući `zavrsen` | OK — preporučeno |

**Preporuka za ERP tim:**

1. U izvoz uključiti bar **broj_naloga** + **id_deo** (obavezno).
2. Po mogućnosti pun snapshot sa **status** kolonom.
3. `id_deo` mora postojati u SPC šifrarniku pre uvoza RN.
4. Izvoz zakazati **pre** cron-a (npr. ERP 05:00, SPC cron 05:30).

---

## Povezanost sa linijom

Posle uvoza, pri skenu ID dela aplikacija automatski predlaže aktivni RN (`src/lib/radniNalog.js`).
