# Excel fajlovi, putanje i uvoz/izvoz (SPC Web)

Projekat: **`C:\mix\spc-web`**

Aplikacija **nema jednu fiksnu Windows putanju** (npr. `C:\SPC\Excel`). Podaci idu u **Supabase**; na računar stiže ono što **preuzmeš** (obično folder **Preuzimanja**) ili što držiš u **`docs`**.

---

## 1. Fajlovi u projektu (izvor / šabloni)

Glavni folder za dopunu šifrarnika i merenja:

### `C:\mix\spc-web\docs\`

| Fajl | Namena |
|------|--------|
| `delovi.csv`, `linije.csv`, `masine.csv`, `smene.csv` | Atributivni šifrarnici |
| `greske_katalog.csv`, `katalog_gresaka_vozilo.csv` | Katalozi grešaka |
| `radnici.csv`, `radni_nalozi.csv`, `kontrolna_lista_stavke.csv` | Ljudi, nalozi, kontrolna lista |
| `kontrolni_log.csv` | Log kontrola (atributivno) |
| `katalog_gresaka.xlsx` | Katalog grešaka (Excel) |
| `AQL_Kalkulator.xlsm` | AQL kalkulator (referenca) |
| `Varijabilne_SPC.xlsm` | Glavni Excel za merljive (tabovi **SOP**, **Definicija_Karakteristika**, **DATA**) |
| `sop_deo_varijabilni.csv`, `karakteristike_merljive.csv`, `merenja_varijabilna.csv` | Merljive tabele |
| `sop_varijabilni.csv`, `unos_merenja.csv`, `linije_procesi_varijabilne.csv` | Dodatak merljivim |

Povezano uputstvo za CSV uvoz: **`docs\UVOZ_UPUTSTVO.md`**

---

## 2. Atributivne — dopuna podataka i izvoz

### U aplikaciji (preporučeno)

1. Uloguj se kao **admin** → modul **Atributivne** → tab **ADMIN**.
2. Panel **EXCEL ↔ SUPABASE**:
   - **⬇ Preuzmi master Excel** → fajl `SPC_master_YYYY-MM-DD.xlsx` (u **Preuzimanja**).
   - Uredi lokalno. Nazivi tabova moraju biti tačni:
     - `linije`, `masine`, `smene`, `greske_katalog`, `katalog_gresaka_vozilo`, `delovi`, `radnici`, `radni_nalozi`, `kontrolna_lista_stavke`
   - **⬆ Uvezi iz Excela** → izaberi izmenjeni fajl (npr. iz `Downloads` ili kopiju u `docs`).
3. **⬇ Preuzmi kontrolni_log kopiju** → `kontrolni_log.xlsx`.
4. Tab **SPC KARTE** → **📊 Excel** → izvoz loga za izabrani deo i period.

### Automatski pri unosu u UNOS

Svaki save ide u Supabase i u oblak:

- **Supabase Storage**
- bucket: `spc-excel-sync`
- fajl: `kontrolni_log.xlsx`

To nije folder na PC-u dok ga ne preuzmeš dugmetom u ADMIN-u.

### Preko terminala (CSV iz `docs`)

```powershell
cd C:\mix\spc-web
$env:SUPABASE_URL="https://<projekat>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
npm run import:docs
```

Skripta `scripts/import-all-docs.mjs` učitava **`docs\*.csv`** u bazu. Mapiranje tabela: vidi **`UVOZ_UPUTSTVO.md`**.

---

## 3. Merljive veličine — dopuna i izvoz

### U aplikaciji

1. Modul **Varijabilne veličine** → panel **MERLJIVE — EXCEL ↔ SUPABASE**.
2. **⬇ Preuzmi merljive tabele** → `SPC_merljive_YYYY-MM-DD.xlsx`.
3. Uvoz iz Excela:
   - direktno **`Varijabilne_SPC.xlsm`** (tabovi **SOP**, **Definicija_Karakteristika**, **DATA**), ili
   - master sa tabovima: `sop_deo_varijabilni`, `karakteristike_merljive`, `merenja_varijabilna`
4. Tab **SPC KARTE** → **📊 Excel** → merenja po delu / dimenziji / periodu.

### Izvor na disku

**`C:\mix\spc-web\docs\Varijabilne_SPC.xlsm`**

Alternativa preko skripti:

```powershell
cd C:\mix\spc-web
node scripts/export-varijabilne-csv.mjs
npm run import:docs
```

Prva skripta puni **`docs\*.csv`** iz `.xlsm`, druga uvozi CSV u Supabase.

---

## 4. Gde završava izvoz na računaru

| Akcija | Tipična lokacija na PC-u |
|--------|---------------------------|
| **Preuzmi master / merljive / log** u aplikaciji | `C:\Users\<korisnik>\Downloads\` |
| Ručna kopija za rad (preporuka) | `C:\mix\spc-web\docs\` |
| Šifrarnici u repou | `C:\mix\spc-web\docs\` |
| Kopija loga u oblaku | Supabase → Storage → `spc-excel-sync` / `kontrolni_log.xlsx` |

Aplikacija **ne čita automatski** fiksnu fasciklu na disku. Pri **Uvezi iz Excela** uvek biraš fajl ručno.

Opciono možeš uvesti radnu fasciklu npr. `C:\mix\spc-web\excel-rad` — samo tamo drži master fajlove i pri uvozu ih izaberi.

---

## 5. Pregled toka

```
ATRIBUTIVNE — šifrarnici:
  docs\*.csv  ──npm run import:docs──► Supabase
  ili: Admin → Preuzmi master → uredi → Uvezi iz Excela

ATRIBUTIVNE — unosi / log:
  UNOS u aplikaciji ──► Supabase + Storage (kontrolni_log.xlsx)
  izvoz: Admin „Preuzmi kontrolni_log“ ili SPC KARTE „Excel“ → Downloads

MERLJIVE:
  docs\Varijabilne_SPC.xlsm ──uvoz u aplikaciji──► Supabase
  ili: export-varijabilne-csv.mjs → docs\*.csv → import:docs
  izvoz merenja: SPC KARTE (merljive) → Excel → Downloads
```

---

## 6. Konstante u kodu (referenca)

| Konstanta | Vrednost |
|-----------|----------|
| Storage bucket | `spc-excel-sync` |
| Log fajl u Storage-u | `kontrolni_log.xlsx` |
| Master atributivni (pri izvozu) | `SPC_master_<datum>.xlsx` |
| Master merljivi (pri izvozu) | `SPC_merljive_<datum>.xlsx` |

Izvor: `src/lib/excelSync.js`, paneli `AdminExcelPanel` (App.jsx) i `MerljiveExcelPanel.jsx`.

---

## 7. MSA / Gage R&R (merljive)

U modulu **Varijabilne veličine** → tab **MSA / Gage R&R**:

- unos matrice merenja (delovi × operateri × ponavljanja),
- izračun **X̄/R** i **ANOVA** (%GRR, ndc, EV/AV/PV),
- čuvanje u Supabase tabeli **`gage_rr_studije`** (migracija `12_gage_rr_schema.sql`),
- **Excel** izvoz: `MSA_GageRR_<naziv>_<datum>.xlsx` (listovi: info, merenja, Xbar_R, ANOVA),
- povezivanje sa merilom iz tabele `merila`.

Detalji: `src/lib/gageRR.js`, `src/lib/gageRRStore.js`, `src/components/GageRRPanel.jsx`.

---

*Poslednje ažuriranje: u skladu sa SPC Web aplikacijom (Excel ↔ Supabase sync).*
