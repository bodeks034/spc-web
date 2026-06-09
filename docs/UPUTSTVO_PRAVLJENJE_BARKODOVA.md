# Kompletno uputstvo — pravljenje barkod etiketa za SPC Web

Ovaj dokument objašnjava **kako napraviti**, **štampati** i **testirati** barkod etikete koje aplikacija SPC Web razume.

Povezano: [UPUTSTVO_BARKOD_I_MERILA.md](./UPUTSTVO_BARKOD_I_MERILA.md) (povezivanje čitača i merila).

---

## 1. Šta aplikacija očekuje

Kada skenirate etiketu, aplikacija čita **tekst** iz barkoda i parsira ga (`src/lib/barkod.js`).

### Podržani formati sadržaja

| Format | Primer | Šta se popunjava |
|--------|--------|------------------|
| **Samo ID** | `5502-A` | ID dela |
| **ID + nalog** | `5502-A\|RN-2024-002` | ID + radni nalog |
| **ID + nalog + datum + smena** | `5502-A\|RN-2024-002\|2026-06-06\|2` | ID, nalog, smena (1–3) |
| **JSON** | `{"id_deo":"5502-A","rn":"RN-2024-002","smena":2}` | Polja iz JSON-a |

**Pravila:**

- ID mora **tačno** odgovarati šifri u tabeli `delovi` (npr. `5502-A`, `AUTO-001`).
- Aplikacija pretvara ID u **VELIKA SLOVA** (`5502-a` → `5502-A`).
- Separator za više polja je znak **`|`** (pipe), bez razmaka oko njega.
- Za USB čitač mora biti uključen **suffix Enter** na kraju skena.

### Koji tip barkoda koristiti

| Tip | Kada koristiti | Sken u SPC Web |
|-----|----------------|----------------|
| **QR kod** | Telefon/tablet kamera (📷), 2D USB čitači | ✅ Kamera + USB |
| **Code 128** | Klasične termalne etikete, 1D/2D čitači | ✅ USB (preporučeno u proizvodnji) |

Za ID poput `5502-A` i `AUTO-001` oba tipa rade odlično. **QR** je praktičniji za kameru na mobilnom; **Code 128** je standard na industrijskim etiketama.

---

## 2. Excel registar — glavni izvor (preporučeno)

Sve barkodove drži u **jednom Excel fajlu**:

```
C:\mix\spc-web\excel-rad\Barkod_etikete.xlsx   ← OVDE radiš
C:\mix\spc-web\docs\barkodi_sadrzaj.csv        ← auto-sinhronizacija (git)
C:\mix\spc-web\docs\barkodi\                   ← generisane slike + štampa
```

### Sheet `barkodi` — kolone

| Kolona | Primer | Obavezno |
|--------|--------|----------|
| `id_deo*` | `5502-A` | Da — mora postojati u `delovi` |
| `naziv` | Osovina | Za štampu na etiketi |
| `tip_kontrole` | `deo` ili `vozilo` | |
| `format` | `id`, `id_rn`, `puna` | Oznaka varijante |
| `sadrzaj_barkoda*` | `5502-A\|RN-2024-002` | **Tačan tekst u kodu** |
| `radni_nalog` | RN-2024-002 | Opciono (pregled) |
| `tip_koda` | `oba`, `qr`, `code128` | Šta generisati |
| `aktivna` | `DA` ili `NE` | `NE` = preskoči |
| `napomena` | ID + radni nalog | Ispis ispod koda |

Sheet **`uputstvo`** u istom fajlu objašnjava kolone.

### Radni tok

```
1. Urediš excel-rad/Barkod_etikete.xlsx
2. npm run barkodi
   → sinhronizuje docs/barkodi_sadrzaj.csv
   → generiše PNG + etikete-stampa.html
3. Štampaš docs/barkodi/etikete-stampa.html
```

**Prvi put** (ako nema Excel fajla):

```bash
npm run barkodi:seed-excel
```

### Komande

| Komanda | Šta radi |
|---------|----------|
| `npm run barkodi` | Excel → CSV → PNG + HTML |
| `npm run barkodi:sync` | Samo Excel → CSV |
| `npm run barkodi:seed-excel` | CSV → Excel (inicijalno) |

---

## 3. Gotove etikete u projektu (5502-A i AUTO-001)

U folderu `docs/barkodi/` postoje generisane slike i stranica za štampu.

```
docs/barkodi/
├── etikete-stampa.html          ← otvori u Chromeu i štampaj (Ctrl+P)
├── 5502-A/
│   ├── 5502-A-id-qr.png
│   ├── 5502-A-id-code128.png
│   ├── 5502-A-id-rn-qr.png
│   └── 5502-A-id-rn-code128.png
└── AUTO-001/
    ├── AUTO-001-id-qr.png
    └── ...
```

### Brzi test

1. Otvorite `docs/barkodi/etikete-stampa.html` u **Chrome** ili **Edge**.
2. U aplikaciji: **Merljive → Unos** ili **Atributivne**.
3. Kliknite **📷** pored ID polja i skenirajte QR sa ekrana (ili štampane etikete).
4. Treba da se pojavi toast: `📷 Barkod: 5502-A` i da se učita deo.

---

## 4. Pravljenje etiketa — metoda A: besplatno online (najbrže)

### QR kod (preporučeno za telefon)

1. Otvorite [https://www.qr-code-generator.com](https://www.qr-code-generator.com) ili [https://goqr.me](https://goqr.me).
2. Izaberite **Text** (običan tekst).
3. U polje unesite **tačan sadržaj**:
   - samo ID: `5502-A`
   - sa nalogom: `5502-A|RN-2024-002`
4. Preuzmite PNG/SVG.
5. U Wordu, Canvi ili label softveru dodajte:
   - veliki tekst: `5502-A`
   - manji tekst: naziv dela (npr. Osovina)
   - QR sliku

### Code 128 (preporučeno za termalni štampač)

1. Otvorite [https://barcode.tec-it.com](https://barcode.tec-it.com) ili [https://www.barcodesinc.com/generator](https://www.barcodesinc.com/generator).
2. Tip: **Code 128**.
3. Tekst: `5502-A` (bez navodnika).
4. Preuzmite sliku.
5. Na etiketu ispod štampajte i čitljiv ID slovima (za slučaj oštećenog koda).

**Važno:** ne dodavajte razmake na početak/kraj teksta u generatoru.

---

## 5. Pravljenje etiketa — metoda B: Excel / Word

### Excel (Microsoft 365)

1. Ćelija A1: `5502-A`
2. Umetanje → **QR kod** (ako imate dodatak) ili koristite online QR pa nalepite sliku.
3. Za štampu etiketa: koristite šablon Avery ili dimenzije 90×50 mm.

### Word

1. Pošiljke / Etikete → prilagođena etiketa.
2. Umetnite sliku QR/Code128 generisanu online.
3. Iznad dodajte font **Arial Bold 18–22 pt**: `5502-A`.

---

## 6. Pravljenje etiketa — metoda C: profesionalni label softver

| Program | Napomena |
|---------|----------|
| **NiceLabel** | Industrijski standard, Code 128 + promenljivi RN iz baze |
| **Zebra Designer** | Za Zebra štampače |
| **BarTender** | ERP integracija |
| **Label LIVE** (besplatno za manje serije) | Jednostavno za Code 128 |

### Podešavanje u label softveru

| Parametar | Vrednost |
|-----------|----------|
| Tip simbola | Code 128 **ili** QR Code |
| Podaci | `5502-A` ili `5502-A\|RN-2024-002` |
| Human readable | Da (tekst ispod trake) |
| Quiet zone (margina) | min. 2–3 mm oko koda |
| DPI štampača | 203 ili 300 dpi (termalni) |

---

## 7. Štampa etiketa — fizički zahtevi

| Parametar | Preporuka |
|-----------|-----------|
| Veličina etikete | 90 × 50 mm (ili 100 × 50 mm) |
| Materijal | Termo transfer (trajnije) ili direktni termo |
| Kontrast | crni kod na beloj podlozi |
| Minimalna širina Code 128 | ~35 mm za 7 znakova |
| QR veličina | min. 25 × 25 mm na etiketi |

### Štampa iz projekta

1. `docs/barkodi/etikete-stampa.html` → desni klik → Open with Chrome.
2. **Ctrl+P** → More settings → Margins: None.
3. Paper: Custom ili Label 90×50 mm (zavisi od štampača).
4. Štampajte probnu etiketu i testirajte sken pre masovne štampe.

---

## 8. USB barkod čitač — podešavanje

1. Spojite čitač na USB.
2. Skenirajte **konfiguracioni QR** iz uputstva proizvođača:
   - uključite **USB Keyboard** mod
   - uključite **Suffix: Enter (CR/LF)**
   - isključite **Prefix** (npr. `]C1`)
3. Za 2D čitač: omogućite **QR** i **Code 128**.
4. Test: otvorite Notepad, skenirajte etiketu → treba `5502-A` + novi red.

---

## 9. Primeri sadržaja po delu

### 5502-A (Osovina — merljive i atributivne)

| Etiketa | Sadržaj barkoda | Upotreba |
|---------|-----------------|----------|
| Osnovna | `5502-A` | Svakodnevni unos, samo izbor dela |
| Sa nalogom | `5502-A\|RN-2024-002` | Automatski popunjava i radni nalog |
| Puna | `5502-A\|RN-2024-002\|2026-06-06\|2` | + smena 2 |

### AUTO-001 (Automobil — atributivne, tip vozilo)

| Etiketa | Sadržaj barkoda | Upotreba |
|---------|-----------------|----------|
| Osnovna | `AUTO-001` | Finalna kontrola vozila |
| Sa nalogom | `AUTO-001\|FINAL-001` | Ako koristite RN iz `delovi.csv` |

---

## 10. JSON etikete (napredno)

Za fleksibilne etikete iz ERP-a:

```json
{"id_deo":"5502-A","rn":"RN-2024-002","smena":2}
```

- Kodirajte kao **QR** (JSON je duži tekst).
- Code 128 može biti predugačak za veće JSON objekte — tada samo QR.

---

## 11. Kontrolna lista pre produkcije

- [ ] ID u barkodu = ID u Supabase tabeli `delovi`
- [ ] Test sken: Merljive → Unos → `5502-A` učitava Osovinu
- [ ] Test sken: Atributivne → `AUTO-001` učitava dijagram vozila
- [ ] USB čitač šalje Enter na kraju
- [ ] Etiketa čitljiva posle 10 test skenova
- [ ] Human-readable tekst (`5502-A`) štampan ispod koda

---

## 12. Rešavanje problema

| Problem | Uzrok | Rešenje |
|---------|-------|---------|
| Aplikacija ne reaguje | Nema Enter suffix | Podesite čitač na CR/LF |
| Pogrešan ID | Greška u štampi / razmaci | Proverite sadržaj u Notepad-u |
| Deo se ne učitava | Nema u bazi | Dodajte red u `delovi` / Supabase |
| Kamera ne čita | Loš kontrast / premali QR | Veći QR, bolje osvetljenje |
| `5502-a` ne radi | Mala slova u bazi | Aplikacija upper-case-uje; proverite `delovi` |
| Sken u polju ne radi | Fokus u drugom polju | Kliknite prazan deo forme pa skenirajte |

---

## 13. Tehnički fajlovi

| Fajl | Uloga |
|------|--------|
| `excel-rad/Barkod_etikete.xlsx` | **Glavni registar** (ti uređuješ) |
| `docs/barkodi_sadrzaj.csv` | Izvoz za git i skriptu |
| `src/lib/barkod.js` | Parsiranje formata u aplikaciji |
| `scripts/generisi-barkod-etikete.mjs` | Excel/CSV → PNG + HTML |
| `scripts/lib/barkodCsv.js` | Čitanje Excela i CSV-a |
| `docs/barkodi/` | Generisane slike i štampa |
| `docs/delovi.csv` | Lista validnih ID-jeva |

Za nova šifarnička pitanja vidi [UPUTSTVO_SIFARNIK_I_EXCEL.md](./UPUTSTVO_SIFARNIK_I_EXCEL.md).
