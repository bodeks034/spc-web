# Uvoz docs/*.csv u Supabase

## 1) Kreiraj tabele

U Supabase SQL Editor pokreni redom:

1. `03_schema_from_docs.sql` — kreira tabele
2. `04_kontrolna_lista_policies.sql` — kontrolna lista + seed stavki
3. `05_dopuna_tabele_rls.sql` — RLS za sve tabele + ispravka delova/mašina/smena
4. `06_storage_excel_sync.sql` — Storage bucket za Excel kopije + dozvole za uvoz iz Excela
5. `12_gage_rr_schema.sql` — MSA Gage R&R studije (merljive)

Ako već imaš tabele iz koraka 1, dovoljno je pokrenuti `05`, `06` i `12` (za MSA).

## Excel ↔ Supabase (preporučeni tok)

1. **Unos u aplikaciji** → automatski u `kontrolni_log` (Supabase) + kopija u Storage (`spc-excel-sync/kontrolni_log.xlsx`)
2. **Uvoz šifrarnika** → Admin Panel → **Uvezi iz Excela** (tabovi: `linije`, `masine`, `delovi`, …)
3. **Izvoz za uređivanje** → Admin Panel → **Preuzmi master Excel** → izmeni lokalno → ponovo uvezi

Nazivi tabova u Excelu moraju tačno odgovarati: `linije`, `masine`, `smene`, `greske_katalog`, `katalog_gresaka_vozilo`, `delovi`, `radnici`, `radni_nalozi`, `kontrolna_lista_stavke`.

## 2) Postavi env varijable

PowerShell:

```powershell
$env:SUPABASE_URL="https://<projekat>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## 3) Uvezi sve CSV fajlove odjednom

```powershell
npm run import:docs
```

Skripta mapira kolone iz CSV (sa razmacima i srpskim nazivima) u snake_case kolone u bazi.

## Mapiranje tabela

| CSV fajl | Supabase tabela |
|---|---|
| linije.csv | linije |
| masine.csv | masine |
| smene.csv | smene |
| greske_katalog.csv | greske_katalog |
| katalog_gresaka_vozilo.csv | katalog_gresaka_vozilo |
| delovi.csv | delovi |
| radnici.csv | radnici |
| radni_nalozi.csv | radni_nalozi |
| kontrolni_log.csv | kontrolni_log |
| ciljevi.csv | ciljevi |
| merila.csv | merila + kalibracije |
| eskalacije.csv | eskalacije |
| osmd_izvestaji.csv | osmd_izvestaji |
| analiza_*.csv, dpmo.csv, pareto.csv | odgovarajuće analitičke tabele |

Kupci se automatski generišu iz jedinstvenih vrednosti kolone `kupac` u `radni_nalozi.csv`.

## Aplikacija

Aplikacija je prilagođena novim tabelama:

- `radni_nalozi` (umesto `radni_nalozi_lista`)
- `greske_katalog` sa kolonom `defekt` (kaskadni dropdown)
- `delovi` bez LSL/USL — koristi `karakteristika`, `napomena`, `slika_naziv`
- `osmd_izvestaji` (umesto `osmD_izvestaji`)
