# Uputstvo: barkod čitač i digitalna merila

Aplikacija **SPC Web** podržava USB periferije koje se ponašaju kao tastatura (**keyboard wedge**) ili kao **serijski port** (digitalna merila). Nije potreban poseban drajver na računaru — samo pregledač i kabel.

---

## 0. Česta pitanja — šta se dešava sa podacima?

### Da li se čitač / merilo povezuje „direktno na aplikaciju“?

**Da, ali preko računara i pregledača** — ne na Supabase i ne na poseban server za merila.

```
[ Barkod čitač ]──USB──► [ PC / tablet ]
[ Digitalno merilo ]──USB/RS232──► [ PC / tablet ]
                              │
                              ▼
                    Chrome / Edge (SPC Web)
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     Odmah na ekranu (forma)          Posle „Sačuvaj“ / „Zapiši“
     ID, kolone, OK/NOK               ▼
                              Supabase (cloud baza)
```

- Uređaj **nema** svoju IP adresu u aplikaciji niti API ključ ka Supabase-u.
- **Barkod** = tastatura → aplikacija čita znakove i popunjava **ID dela**.
- **Merilo (serial)** = Web Serial API u pregledaču → aplikacija parsira liniju i dodaje broj u **kolonu merenja**.
- **Merilo (wedge)** = tastatura → broj ide u fokusirano polje kolone.

To je „direktno u aplikaciju“ u smislu: **nema MeasurLink / posebnog SPC agenta** — operator radi u istom prozoru gde unosi i snima.

### Da li se rezultati odmah vide u aplikaciji?

| Uređaj | Šta vidite odmah | Šta još nije u bazi |
|--------|------------------|-------------------|
| **Barkod** | ID dela, naziv dela, nalog (ako u kodu), toast „Skenirano“ | Kontrola / merenja dok ne završite unos i snimite |
| **Digitalno merilo** | Vrednost u koloni, OK/NOK, brojač `n/5`, toast `+ D1: 12.34` | Redovi u Supabase tek posle **Sačuvaj seriju** (merljive) |

### Da li se podaci čuvaju u Supabase?

**Da, nakon akcije operatera** — uređaji sami ne šalju u cloud.

| Modul | Akcija operatera | Tabela u Supabase | Šta se upisuje |
|-------|------------------|-------------------|----------------|
| **Merljive** | **Sačuvaj seriju** | `merenja_varijabilna` | Svako merenje: datum, smena, id_deo, pozicija, vrednost, status OK/NOK, … |
| **Merljive** | (uz seriju) | `kpi_unos` | Škart / dorada / OEE ako ste popunili KPI panel |
| **Atributivne** | **Zapiši** (kontrola) | `kontrolni_log` | OK/NOK komadi, defekti, itd. |
| **Atributivne** | (uz zapis) | `kpi_unos` | KPI serije |

**Barkod** sam po sebi upisuje samo **identifikaciju dela** u formi; u bazu ide ono što ste uneli posle skena (merenja ili kontrola).

**Offline:** ako nema mreže, paket ide u red (`localStorage`); pri povratku mreže aplikacija radi **Sync** u iste tabele.

### Da li se mogu raditi SPC karte na osnovu toga?

| Izvor podataka | Karte u aplikaciji | Uslov |
|----------------|-------------------|--------|
| Merenja sa merila (posle **Sačuvaj**) | **Merljive → SPC karte** | X̄, R, I, MR, Cp/Cpk, Pareto, trend, alarmi — čitaju se iz `merenja_varijabilna` |
| Barkod + merljivi unos | Isto | Barkod/merilo su samo **brži unos**; karte koriste **iste** snimljene redove kao ručni unos |
| Barkod + atributivna kontrola | **Atributivne → karte** (p, trend, …) | Podaci iz `kontrolni_log` posle **Zapiši**, ne iz samog skena |

**Zaključak:** merilo i barkod **ne prave poseban tip karte** — uklapaju se u postojeći tok. Za merljive SPC karte mora postojati **bar jedna sačuvana serija** u bazi za taj `id_deo` i poziciju.

---

## 1. Barkod / QR čitač (ID dela)

> **Gotove etikete i kompletno uputstvo za pravljenje:** [UPUTSTVO_PRAVLJENJE_BARKODOVA.md](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md)  
> Excel registar: `excel-rad/Barkod_etikete.xlsx` · slike: `docs/barkodi/` · `npm run barkodi`

### Kako se povezuje

| Korak | Šta uraditi |
|-------|-------------|
| 1 | Čitač spojite na **USB** port računara (ili USB hub na tabletu). |
| 2 | Windows prepoznaje uređaj kao **HID tastatura** — nema instalacije drajvera. |
| 3 | Otvorite aplikaciju u **Chrome** ili **Edge** (preporučeno). |
| 4 | U podešavanjima čitača (skener app / QR na uputstvu proizvođača) uključite **suffix Enter** (često `CR`, `LF` ili `CR+LF`) — aplikacija završava sken na tasteru Enter. |
| 5 | Na etiketi dela koristite format koji aplikacija razume (vidi tabelu ispod). |

Čitač **ne šalje podatke u Supabase direktno** — simulira kucanje znakova u aktivno polje ili globalni hvatač u aplikaciji.

### Gde u aplikaciji

| Modul | Ekran | Polje |
|-------|--------|--------|
| **Atributivne** | Unos | **ID DELA / BARKOD** (leva kolona na desktopu; mobilni unos) |
| **Merljive** | Tab **Unos** | **ID deo \*** |

### Način rada

1. **Sken van tekstualnog polja** — aplikacija hvata brz niz znakova + Enter i popunjava ID (i po mogućnosti radni nalog / smenu).
2. **Sken direktno u polje ID** — znakovi idu u polje; na **Enter** merljive učitavaju deo (`ucitajDeo`), atributivne prepoznaju deo kad ima ≥3 znaka.
3. Kliknite jednom u prazan deo forme pa skenirajte ako globalni sken ne reaguje.

### Podržani formati etikete

| Format | Primer | Šta se popunjava |
|--------|--------|------------------|
| Samo ID | `5502-A` | ID dela |
| ID \| nalog | `5502-A\|RN-2024-015` | ID + radni nalog (atributivne toast) |
| ID \| nalog \| datum \| smena | `5502-A\|RN-15\|2026-06-04\|2` | ID, nalog, smena (1–3) |
| JSON | `{"id_deo":"5502-A","rn":"RN-15","smena":2}` | Polja iz JSON ključeva |

JSON ključevi: `id`, `id_deo`, `deo` · `rn`, `radni_nalog`, `nalog` · `datum` · `smena`.

ID se u aplikaciji normalizuje na **velika slova**.

### Preporučeni čitači

Bilo koji **1D/2D USB HID** čitač (Zebra, Honeywell, Datalogic, jeftini „keyboard wedge“ sa AliExpress-a). Za proizvodnju: otpornost na udar, kabl sa spiralom, fiksna postaja pored unosa.

### Rešavanje problema (barkod)

| Problem | Rešenje |
|---------|---------|
| Ništa se ne dešava | Proverite suffix **Enter** na čitaču; probajte drugi USB port. |
| Dupli unos / čudni znakovi | Isključite „prefix“ simbole na čitaču; koristite samo ID na etiketi. |
| Deo se ne prepoznaje | ID mora postojati u bazi **delovi**; unesite ručno i proverite šifru. |
| Na tabletu ne radi | Koristite **OTG USB** adapter; iOS Safari često ne podržava USB čitač — koristite Android/Windows tablet. |

---

## 2. Digitalna merila (merljive SPC)

Panel **DIGITALNO MERILO · USB / SERIAL · UVOZ** pojavljuje se na tabu **Unos** merljivog modula **posle** što unesete ID dela i izaberete seriju (A/B/…).

### Tri načina povezivanja

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  A) SERIAL      │     │  B) NALEPI/FAJL  │     │  C) Ručno +     │
│  RS-232/USB     │     │  izvoz sa merila  │     │  Enter u koloni │
│  Web Serial     │     │  .txt / .csv      │     │  (postojeće)    │
└────────┬────────┘     └────────┬─────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
   Chrome „Poveži serial“    „Uvezi u kolone“
   9600 baud (podrazum.)    parsiranje brojeva
```

### A) Serijski port (preporučeno za kontinualan rad)

| Korak | Šta uraditi |
|-------|-------------|
| 1 | Merilo ili **USB–RS232 adapter** (FTDI, Prolific) spojite na PC. |
| 2 | Na merilu uključite **data output** / **SPC** / **Digimatic** (zavisi od modela). |
| 3 | Podesite **9600 baud**, 8N1 (ako merilo nudi izbor — mora biti isto kao u aplikaciji). |
| 4 | U aplikaciji: **▶ Poveži serial (9600)** → pregledač traži port → izaberite **COM** port adaptera. |
| 5 | Svaka linija koja stigne (završena Enter/LF) dodaje **jedno merenje** u aktivnu ili sledeću praznu dimenziju. |

**Zahtev:** **Google Chrome** ili **Microsoft Edge**, stranica na **HTTPS** ili `http://localhost` (Web Serial API).

Podržani primeri linija:

- `12.345` ili `12,401` (samo broj)
- `D1;12.5` ili `D1,12.5` (dimenzija + vrednost → ide u kolonu **D1**)

### B) Nalepi ili fajl (batch uvoz)

1. Na merilu ili PC softveru (Mitutoyo MeasurLink, Excel izvoz) izvezite listu merenja.
2. U panelu nalepite tekst ili **📄 Fajl** (`.txt`, `.csv`, `.dat`).
3. Klik **Uvezi u kolone** — vrednosti se redom upisuju u **sledeće prazne** kolone (ili od izabrane **Aktivne dimenzije**).

### C) Keyboard wedge merilo (bez Serial dugmeta)

Neka digitalna merila šalju broj + Enter kao tastatura:

1. Fokusirajte polje za unos u **željenoj koloni** merenja.
2. Pritisnite taster za slanje na merilu — vrednost se unosi kao ručni unos.

### Aktivna dimenzija

| Izbor | Ponašanje |
|-------|-----------|
| **Auto (sledeća prazna)** | Svako novo merenje ide u prvu kolonu koja nije puna. |
| Konkretna dimenzija | Sva serial merenja idu u tu kolonu dok je ne promenite. |

Validacija (LSL/USL, jedinica mm/°) ista je kao pri ručnom unosu.

### Preporučena oprema

| Tip | Povezivanje | Napomena |
|-----|-------------|----------|
| Mitutoyo Absolute / Digimatic | RS-232 ili USB-Digimatic kabel | Serial u Chromeu |
| Mahr / Sylvac sa SPC izlazom | USB-serial | Baud 9600 |
| Jeftino digitalno merilo sa „PRINT“ | Često samo wedge | Koristite unos u koloni, ne Serial |

### Rešavanje problema (merila)

| Problem | Rešenje |
|---------|---------|
| „Web Serial nije podržan“ | Koristite Chrome/Edge; ne Firefox/Safari. |
| Port se ne vidi | Proverite da li COM port nije zauzet drugim programom (MeasurLink). |
| Pogrešne vrednosti | Uskladite **baud** (9600); proverite decimalni separator (`,` ili `.`). |
| Kolona puna | Promenite seriju ili obrišite unos; povećajte broj merenja u šablonu dela. |
| NOK odmah posle uvoza | Očekivano ako vrednost van LSL/USL — proverite kalibraciju merila. |

---

## 3. Provera u produkciji (checklist)

- [ ] Barkod: test etiketa `5502-A` na oba modula
- [ ] Barkod: test etikete sa nalogom `ID|RN-xxx` (ako koristite)
- [ ] Merila: jedno merenje preko Serial + potvrda u tabeli kolona
- [ ] Merila: uvoz 5 linija iz clipboard-a
- [ ] Admin → Status šeme — migracije OK

---

## 4. Tehnički fajlovi u projektu

| Fajl | Uloga |
|------|--------|
| `src/lib/barkod.js` | Parsiranje, `useBarcodeScanner` |
| `src/lib/meriloUvoz.js` | Parsiranje linija, serial, uvoz u kolone |
| `src/components/DigitalnoMeriloPanel.jsx` | UI merljivog unosa |
| `src/components/MeriloBarkodUputstvo.jsx` | Uputstvo u Admin panelu |

Za pitanja oko etiketa (format za vaš ERP), uskladite štampu sa kolonama u tabeli **delovi** (`id_deo`).
