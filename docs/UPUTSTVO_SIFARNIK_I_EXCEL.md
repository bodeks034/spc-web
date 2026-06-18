# Uputstvo — novi šifrarnik, Excel, CSV i uvoz u bazu

**PDF obuka (A4):** [OBUKA_EXCEL_UNOS.html](./OBUKA_EXCEL_UNOS.html) — otvori u browseru → Ctrl+P → Save as PDF

Projekat: **`C:\mix\spc-web`**

---

## 1. Kratak odgovor na pitanja

| Pitanje | Odgovor |
|---------|---------|
| **Stari katalog vozila imao 1 sheet, novi 9 — šta sada?** | U Excelu možeš imati **9 sheetova po komponentama** (§4). Za bazu i uvoz i dalje treba **jedan** fajl: `katalog_gresaka_vozilo.csv` — spojiš 9 tabova u jedan CSV pre uvoza. |
| **Da li kolone moraju da budu kao u starom šifrarniku?** | **Ne moraju biti identične**, ali moraju imati **iste podatke** (kategorija, podkategorija, defekt). Nazivi kolona mogu biti na srpskom, sa razmacima — uvoz ih mapira automatski. |
| **Mogu li samo novi katalog za vozilo?** | **Da.** `katalog_gresaka_vozilo` je **poseban** katalog za AUTO-001. Stari `greske_katalog` ostaje za delove (5501-A…). |
| **Odakle aplikacija čita podatke?** | Iz **Supabase baze** (ne direktno iz Excela). Excel/CSV služe za **uvoz u bazu**. |
| **Folder `sifarnik celo vozilo`?** | Samo **referenca** (dijagram). **Ne učitava se** pri uvozu. |

### Dva različita Excel fajla (ne mešati)

| Fajl | Broj tabova | Namena |
|------|-------------|--------|
| **`SPC_master_atributivne.xlsx`** | 9 tabova (§3) | Ceo SPC šifrarnik: linije, delovi, radnici… + **jedan** tab `katalog_gresaka_vozilo` |
| **`Katalog_vozilo_9_komponenti.xlsx`** | 9 tabova po komponentama (§4) | Samo katalog celog vozila — radiš u njemu, pa **spajaš** u jedan CSV |

---

## 2. Gde smestiti glavne Excel fajlove

Preporučena struktura na disku:

```
C:\mix\spc-web\
│
├── docs\                              ← CSV izvoz (za npm run import:docs)
│   ├── linije.csv
│   ├── masine.csv
│   ├── smene.csv
│   ├── greske_katalog.csv             ← greške za POJEDINAČNE delove
│   ├── katalog_gresaka_vozilo.csv     ← greške za CELO VOZILO (AUTO-001)
│   ├── delovi.csv                     ← uključuje AUTO-001
│   ├── radnici.csv
│   ├── radni_nalozi.csv
│   ├── kontrolna_lista_stavke.csv
│   ├── barkodi_sadrzaj.csv            ← izvoz iz Barkod_etikete.xlsx
│   ├── barkodi\                       ← generisane PNG + etikete-stampa.html
│   │
│   ├── Varijabilne_SPC.xlsm           ← GLAVNI Excel za MERLJIVE
│   ├── sop_deo_varijabilni.csv        ← izvoz iz merljivog Excela
│   ├── karakteristike_merljive.csv
│   └── merenja_varijabilna.csv
│
├── excel-rad\                         ← radna kopija master fajlova
│   ├── SPC_master_atributivne.xlsx    ← 9 tabova (§3) — ceo SPC šifrarnik
│   ├── Katalog_vozilo_9_komponenti.xlsx  ← NOVI: 9 sheetova po komponentama (§4)
│   ├── Barkod_etikete.xlsx            ← registar barkod etiketa (§5)
│   └── Varijabilne_SPC.xlsm           ← kopija merljivog fajla
│
└── sifarnik celo vozilo\              ← samo dijagram / dokumentacija (NE uvoz)
    └── vehicle_quality_zones_diagram.svg
```

### Pravilo

| Tip podataka | Glavni Excel | CSV u `docs\` | Uvoz u bazu |
|--------------|--------------|---------------|-------------|
| **Atributivne (9 tabova)** | `SPC_master_atributivne.xlsx` | 8 CSV + `katalog_gresaka_vozilo.csv` | Admin ili `npm run import:docs` |
| **Katalog vozila (9 komponenti)** | `Katalog_vozilo_9_komponenti.xlsx` | samo **`katalog_gresaka_vozilo.csv`** (spojeno) | isto — uvozi se jedan CSV |
| **Merljive veličine** | `docs\Varijabilne_SPC.xlsm` | 3 CSV | Modul Merljive → Uvezi Excel |
| **Barkod etikete** | `excel-rad\Barkod_etikete.xlsx` | `barkodi_sadrzaj.csv` | `npm run barkodi` (nije Supabase) |
| **Unosi kontrole (log)** | — | `kontrolni_log.csv` (opciono) | Automatski iz aplikacije → Supabase |

Aplikacija **ne čita automatski** folder sa diska. Pri uvozu u Admin panelu **ručno izabereš** Excel fajl.

---

## 3. Atributivni master — devet tabova (ceo SPC)

U fajlu **`SPC_master_atributivne.xlsx`** nazivi tabova moraju **tačno** odgovarati (mala slova, donja crta):

| # | Naziv taba u Excelu | CSV u `docs\` | Supabase tabela | Namena |
|---|---------------------|---------------|-----------------|--------|
| 1 | `linije` | `linije.csv` | `linije` | Proizvodne linije |
| 2 | `masine` | `masine.csv` | `masine` | Mašine / stanice |
| 3 | `smene` | `smene.csv` | `smene` | Smene 1/2/3 |
| 4 | `greske_katalog` | `greske_katalog.csv` | `greske_katalog` | Greške za **delove** (5501-A…) |
| 5 | `katalog_gresaka_vozilo` | `katalog_gresaka_vozilo.csv` | `katalog_gresaka_vozilo` | Greške za **celo vozilo** (spoj iz §4) |
| 6 | `delovi` | `delovi.csv` | `delovi` | Svi delovi + **AUTO-001** |
| 7 | `radnici` | `radnici.csv` | `radnici` | Kontrolori, operatori… |
| 8 | `radni_nalozi` | `radni_nalozi.csv` | `radni_nalozi` | RN po delu |
| 9 | `kontrolna_lista_stavke` | `kontrolna_lista_stavke.csv` | `kontrolna_lista_stavke` | Ček lista pre unosa |

Tab **#5** u masteru je **jedan** tab — u njega ide spojeni sadržaj iz 9 komponentnih sheetova (§4).

---

## 4. Katalog celog vozila — 9 sheetova po komponentama (NOVI format)

### Stari vs novi

| | Stari katalog vozila | Novi katalog vozila |
|---|---------------------|---------------------|
| Excel | **1 sheet** — sve greške zajedno | **9 sheetova** — po komponenti / podsklopu |
| Kolona `id` | Svi redovi: `FINAL-001` | Svaki sheet: **svoj kod** (preporučeno) |
| Baza | 1 tabela `katalog_gresaka_vozilo` | **Ista tabela** — nema promene sheme |
| CSV za uvoz | 1 fajl | **I dalje 1 fajl** — spojiš 9 sheetova |

### Gde držiš glavni Excel za vozilo

```
C:\mix\spc-web\excel-rad\Katalog_vozilo_9_komponenti.xlsx
```

Imena tabova u tom fajlu **nisu** vezana za uvoz — možeš ih zvati kako hoćeš (Karoserija, Motor, Enterijer…). Važna je kolona **`id`** u svakom tabu.

### Preporučeno mapiranje sheet → kolona `id`

| Sheet u tvom Excelu (primer) | Vrednost u koloni `id` | Zona na dijagramu |
|------------------------------|------------------------|------------------|
| Karoserija / Limarija | `KAROS-001` | Karoserija |
| Motor | `MOTOR-001` | Motor |
| Transmisija / Menjač | `TRANS-001` | Transmisija |
| Enterijer / Kabina | `INT-001` | Enterijer |
| Elektrika / Osvetljenje | `EL-001` | Elektrika |
| Finalna / Funkcionalni test | `FINAL-001` | Finalna |
| + 3 dodatna sheet-a | npr. `STAKLO-001`, `PODVOZJE-001`, `PRTLJAG-001` | mapiraj na najbližu zonu u kodu ako treba |

Ako imaš tačno **9** sheetova a dijagram ima **6** zona — nije problem. Više sheetova može deliti isti `id` (npr. dva sheeta oba `EL-001`).

### Kolone u svakom od 9 sheetova

| Kolona u Excelu | U bazi | Obavezno |
|-----------------|--------|----------|
| `id` | `vozilo_id` | Da — kod komponente (KAROS-001…) |
| `kategorija` | `kategorija` | Da |
| `podkategorija` | `podkategorija` | Da |
| `defekt` | `defekt` | Da |

**Ne mora** da bude kao stari 1-sheet fajl — dovoljno je da svaki red ima ova 4 polja.

### Kako spojiti 9 sheetova u jedan CSV

1. U svakom tabu dodaj kolonu `id` sa kodom komponente (KAROS-001…).
2. Kopiraj sve redove iz svih 9 tabova **jedan ispod drugog** (header samo jednom).
3. Izvezi kao **`docs\katalog_gresaka_vozilo.csv`** (UTF-8).

Primer:

```csv
id,kategorija,podkategorija,defekt
KAROS-001,EKSTERIJER (Karoserija i Limarija),Prednji branik,Loše poravnanje
MOTOR-001,FUNKCIONALNE ZONE I PODVOZJE,Motorni prostor,Curenje ulja
INT-001,ENTERIJER (Kabina),Sedišta,Ogrebotina na koži
```

### AUTO-001 u `delovi.csv`

- `tip kontrole` = **`vozilo`**
- `vozilo katalog id` = **`FINAL-001`** (referenca na ceo katalog — aplikacija učitava sve komponente)

---

## 5. Kolone — ostale tabele atributivnog mastera

Kolone **ne moraju** da se zovu identično kao u starom fajlu. Dozvoljeno je:

- srpski nazivi (`id dela`, `naziv dela`, `kom za kontrolu n`)
- zvezdica na kraju (`id dela*`) — ignoriše se
- ć/č/š u headerima — skripta normalizuje

### Obavezna polja po tabeli

**linije:** `id`, `linija`  
**masine:** `id`, `naziv masine` (ili `naziv`)  
**smene:** `id`, `smena` (ili `naziv`)

**greske_katalog** (delovi):
- `id`, `kategorija`, `podkategorija`, `defekt` (opciono `opis`)

**katalog_gresaka_vozilo** — vidi §4 (9 sheetova → jedan CSV).

**delovi:**
- `id dela`, `naziv dela`, `linija id`, `masina id`, `kom za kontrolu n`
- opciono: `tip kontrole`, `vozilo katalog id`, `slika/crtez`, `aktivan`, `napomena`

**radnici:** `id`, `ime i prezime`, `uloga`, opciono `email`, `aktivan`  
**radni_nalozi:** `radni nal`, `id dela`, opciono `kupac`, `kolicina`, `status`  
**kontrolna_lista_stavke:** `id`, `kategorija`, `stavka`, `redosled`, `aktivna`

---

## 6. Filter kataloga po delu / modelu vozila

Pokreni SQL: **`24_katalog_filter_po_delu.sql`** (jednom).

```
Unos ID dela
     │
     ├─ 5501-A, 5502-A …  →  greske_katalog
     │                        filter: id_deo ili katalog_id = delovi.greska_katalog_id
     │
     └─ AUTO-001, AUTO-SUV …  →  katalog_gresaka_vozilo
                                 filter: vozilo_id = SUV ili SUV-KAROS-001…
                                 + dijagram zona
```

### Pojedinačni delovi (`greske_katalog`)

| Kolona u Excel/CSV | U bazi | Primer |
|--------------------|--------|--------|
| `id_deo` | samo za taj deo | `5502-A` |
| `katalog_id` | grupa delova | `GRUPA-NOSAC` |
| *(prazno)* | zajednički katalog | svi delovi bez posebnog |

U **`delovi`**: kolona `greska katalog id` = `5502-A` ili `GRUPA-NOSAC`.

### Vozila (`katalog_gresaka_vozilo`)

| delovi | katalog grešaka (kolona `id` → vozilo_id) |
|--------|-------------------------------------------|
| `vozilo katalog id` = `SUV` | `SUV-KAROS-001`, `SUV-MOTOR-001`… |
| `AUTO-SUV` + `vozilo katalog id` = `SUV` | isto |

Ako nema posebnih redova za model → koristi se legacy (`KAROS-001`, `FINAL-001`).

- **Moraš** imati red u `delovi` sa `tip_kontrole = vozilo`.
- **Novi format (9 komponenti):** `SUV-KAROS-001` — zona KAROS-001 i dalje radi.

---

## 7. Korak po korak: Excel → CSV → Supabase

### A) Katalog vozila (9 komponentnih sheetova)

1. Radi u **`excel-rad\Katalog_vozilo_9_komponenti.xlsx`**.
2. Spoji 9 tabova u **`docs\katalog_gresaka_vozilo.csv`** (§4).
3. Uvezi CSV (Admin ili `npm run import:docs`).

### B) Ostale atributivne tabele (8 tabova)
1. Pripremi **`SPC_master_atributivne.xlsx`** sa 9 tabova (§3) — tab `katalog_gresaka_vozilo` = spojeni CSV iz koraka A.
2. U svakom tabu: **prvi red = header**, podaci od reda 2.
3. Izvezi CSV u **`C:\mix\spc-web\docs\`**.
4. Uvoz u bazu — **jedan od načina**:
   - **Admin panel** → Atributivne → ADMIN → **Uvezi iz Excela**, ili
   - Terminal:
     ```powershell
     cd C:\mix\spc-web
     $env:SUPABASE_URL="https://<projekat>.supabase.co"
     $env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
     npm run import:docs
     ```

**Napomena:** uvoz `katalog_gresaka_vozilo` **briše stari sadržaj** te tabele i ubacuje novi iz CSV/Excela.

### C) Merljive veličine (odvojeno)

1. Glavni fajl: **`C:\mix\spc-web\docs\Varijabilne_SPC.xlsm`**
2. Tabovi: `SOP`, `Definicija_Karakteristika`, `DATA` (ili CSV: `sop_deo_varijabilni`, `karakteristike_merljive`, `merenja_varijabilna`).
3. Uvoz: Modul **Varijabilne** → **MERLJIVE — EXCEL ↔ SUPABASE** → Uvezi Excel.

### D) Celo vozilo — šta nije uvoz

| Stavka | Gde | Uvoz? |
|--------|-----|-------|
| Katalog grešaka vozila | `katalog_gresaka_vozilo.csv` | Da → Supabase |
| Deo AUTO-001 | `delovi.csv` | Da → Supabase |
| Slika / dijagram vozila | `public/vozilo/dijagrami/*.svg` | Zameni fajl + mapa u `voziloDijagramConfig.js` |
| Mapiranje 6 zona (K,M,T…) | `src/lib/voziloZoneConfig.js` | Samo ako pomeriš hotspot koordinate |
| Više tipova vozila (auto, kamion…) | 1 SVG po tipu u `dijagrami/` | `vozilo katalog id` u `delovi` |

---

## 8. Barkod etikete (Excel — nije Supabase)

Registar svih etiketa za štampu:

| Fajl | Namena |
|------|--------|
| `excel-rad\Barkod_etikete.xlsx` | Glavni radni fajl (sheet `barkodi`) |
| `docs\barkodi_sadrzaj.csv` | Izvoz za git i skriptu |
| `docs\barkodi\` | Generisane PNG slike + `etikete-stampa.html` |

```bash
npm run barkodi:seed-excel   # prvi put: CSV → Excel
npm run barkodi              # Excel → CSV → PNG + HTML za štampu
```

Detaljno: [UPUTSTVO_PRAVLJENJE_BARKODOVA.md](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md)

---

## 9. Provera posle uvoza

1. Supabase → `katalog_gresaka_vozilo` — redovi sa `KAROS-001`, `MOTOR-001`… (novi) ili `FINAL-001` (stari).
2. Supabase → `delovi` — postoji `AUTO-001`, `tip_kontrole = vozilo`.
3. Aplikacija → Atributivne → unesi **AUTO-001** → dijagram + dropdown kategorija posle izbora zone.
4. Aplikacija → unesi **5501-A** → koristi `greske_katalog`, **bez** dijagrama vozila.

---

## 10. Preporučeni radni tok (praksa)

```
1. Radi u Excelu:
   excel-rad\Katalog_vozilo_9_komponenti.xlsx   ← 9 komponenti vozila
   excel-rad\SPC_master_atributivne.xlsx         ← ostali šifrarnici
   docs\Varijabilne_SPC.xlsm                   ← merljive
   excel-rad\Barkod_etikete.xlsx               ← barkod etikete

2. Kad si zadovoljan → izvezi CSV u docs\

3. Uvezi u Supabase (Admin ili npm run import:docs)

4. Za etikete: npm run barkodi → štampaj docs\barkodi\etikete-stampa.html

5. Testiraj AUTO-001 i jedan običan deo

6. Master Excel čuvaj u excel-rad\ ili docs\ — git ne mora da drži pun Excel ako ne želiš
```

Preuzeti master iz aplikacije (Admin → **Preuzmi master Excel**) možeš sačuvati kao **`SPC_master_atributivne.xlsx`** i koristiti kao šablon za novih 9 tabova.

---

## 11. Povezana dokumentacija

- `docs\UVOZ_UPUTSTVO.md` — SQL migracije + mapiranje CSV tabela  
- `docs\EXCEL_I_PUTANJE.md` — putanje, izvoz loga, merljive tabove
- `docs\UPUTSTVO_PRAVLJENJE_BARKODOVA.md` — Excel registar etiketa + štampa  
- `src/lib/excelSync.js` — tačno mapiranje kolona u kodu (`IMPORT_SHEETS`)

---

*Ažurirano za SPC Web — atributivne, merljive i kontrola celog vozila (AUTO-001).*
