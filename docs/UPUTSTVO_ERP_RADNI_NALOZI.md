# Uvoz radnih naloga iz ERP (CSV)

Dnevni izvoz iz SAP / Pantheon / custom ERP → SPC Web tabela `radni_nalozi`.

## Kolone (redosled fleksibilan)

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

## Automatski uvoz (cron / Task Scheduler)

```powershell
cd C:\mix\spc-web
$env:SUPABASE_URL = "https://spc.firma.local"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service_role>"
node scripts/import-radni-nalozi.mjs C:\erp\izvoz\radni_nalozi_danas.csv
```

Provera bez upisa:

```bash
node scripts/import-radni-nalozi.mjs --dry-run
```

NPM:

```bash
npm run import:radni-nalozi
npm run import:radni-nalozi -- --dry-run
npm run import:radni-nalozi -- C:\putanja\nalozi.csv
```

## Uvoz iz aplikacije

Merljive → tab **Nalozi** ili Atributivne → **Nalozi** → **📎 CSV uvoz (ERP)**.

- Podržava iste kolone kao gore
- **Upsert** po `broj_naloga` (isti RN se ažurira, ne duplira)
- Kupci se automatski dodaju u šifarnik `kupci`

## Povezanost sa linijom

Posle uvoza, pri skenu ID dela aplikacija automatski predlaže aktivni RN (`src/lib/radniNalog.js`).
