# SPC karte i analitika — uputstvo za inženjera kvaliteta

**SPC Kontrola kvaliteta · Modul 2 — Analitika**  
Format: A4 · jun 2026

---

## 1. Uvod — šta su SPC karte?

**SPC (Statistical Process Control)** = statistička kontrola procesa.

Umesto da gledate samo „koliko je NOK danas“, karte odgovaraju na:

| Pitanje | Odgovor daje |
|---------|--------------|
| Da li je proces **stabilan**? | Kontrolne karte (X̄, R, p, …) |
| Da li je proces **u granicama specifikacije**? | Cp/Cpk, LSL/USL |
| Da li postoji **trend** (pogoršava se)? | RTY, DPMO, linija karte |
| **Koji** defekti dominiraju? | Pareto |
| Da li je **merilo** pouzdano? | Gage R&R (tab MSA) |

U aplikaciji podaci za karte dolaze iz **unosa na liniji (Modul 1)**. Bez tačnog unosa operatera — karte su besmislene.

---

## 2. Gde su karte u programu?

| Tip kontrole | Tab | Fajl / komponenta |
|--------------|-----|-------------------|
| Atributivne | **SPC KARTE** | `App.jsx` → SPCKarte |
| Merljive | **SPC KARTE** | `MerljiveSpcKarte.jsx` |

**Uslov:** Modul 2 — Analitika (ne Modul 1 linija).

---

## 3. Predlog karata (vodič u aplikaciji)

Kad izaberete **ID dela**, aplikacija prikazuje plavi panel **„Predlog karata“**.

Sistem analizira:

- tip dela (vozilo, dimenzija, vizuelno…)
- broj unosa u periodu
- veličinu uzorka (n)
- broj tipova grešaka
- da li ima LSL/USL (merljive)

i **predlaže** koje karte prvo otvoriti. Klik na predlog menja tip karte.

> Predlog je pomoć — uvek proverite i druge karte ako sumnjate na specifičan uzrok.

---

## 4. Atributivne SPC karte

### 4.1 Filteri (pre čitanja karte)

Na tabu **SPC KARTE** podesite:

| Filter | Značenje |
|--------|----------|
| **ID dela** | Obavezno |
| **Datum OD / DO** | Period analize |
| **Smena** | 1, 2, 3 ili sve |
| **Mašina** | Ako imate više mašina |
| **Grupisanje** | dan / dan+smena / … — kako se tačke grupišu na karti |

Klik **↻** osvežava podatke.

### 4.2 Tipovi karata — šta znače i kada koristiti

| Karta | Šta meri | Kada koristiti |
|-------|----------|----------------|
| **p-Karta** | Udeo neispravnih (%) | Kada se **menja veličina uzorka** n po periodu; standard za većinu atributivnih |
| **np-Karta** | Broj neispravnih | Kada je **n stabilan** (isti broj komada po periodu) |
| **u-Karta** | Prosečan broj defekata po jedinici | Više grešaka po komadu; kontrola celog vozila |
| **nC-Karta** | Ukupan broj grešaka po periodu | Mnogo defekata po komadu, veliki obim |
| **Pareto** | Koji tip greške dominira | **Prva karta** kad tražite uzrok — 80/20 pravilo |
| **RTY / DPMO** | Trend kvaliteta kroz vreme | Nedeljni/mesečni pregled; management izveštaj |
| **Po smeni** | Poređenje smena | Razlika između smena za isti deo |

**Kontrola celog vozila:** sistem predlaže p, u, Pareto, RTY (ne C/nC za finalni auto).

### 4.3 Linije na karti

| Linija | Značenje |
|--------|----------|
| **CL** (centar) | Prosečna vrednost procesa u periodu |
| **UCL / LCL** | Gornja / donja **kontrolna** granica (±3σ za proces) |
| **Tačke van UCL/LCL** | Proces **nije stabilan** — istražiti uzrok |

### 4.4 Western Electric pravila (automatski u aplikaciji)

Aplikacija **označava sumnjive tačke** po pravilima Western Electric, npr.:

- tačka van UCL/LCL
- n tačaka zaredom na istoj strani centra
- trend (rastući/padajući niz)
- …

**Šta raditi kad vidite označenu tačku:**

1. Proverite **LOG** — šta je uneto taj dan?
2. Proverite **Pareto** — koja greška?
3. Proverite **mašinu / smenu / operatera** u filteru
4. Ako nije slučajnost → **eskalacija / 8D**
5. Posle korektivne mere → pratite kartu **7+ tačaka** da potvrdite stabilizaciju

### 4.5 Baseline (referentna faza)

Aplikacija može učitati **baseline** granice (admin / SPC baseline panel) — upoređujete trenutni proces sa referentnom fazom (npr. posle puštanja alata).

---

## 5. Merljive SPC karte

### 5.1 Filteri

| Filter | Značenje |
|--------|----------|
| **ID dela** | Obavezno |
| **Karakteristika (pozicija)** | Jedna dimenzija ili „sve dimenzije“ |
| **Datum OD / DO** | Period |
| **Smena** | Opciono |
| **n podgrupe** | Veličina podgrupe za X̄/R (2–10, tipično 5) |

### 5.2 Tipovi karata — šta znače i kada koristiti

| Karta | Šta meri | Kada koristiti |
|-------|----------|----------------|
| **X̄-Karta** | Sredina podgrupe merenja | Proces sa **više merenja po uzorku** (n≥2); prati **pomeranje sredine** |
| **R-Karta** | Raspon unutar podgrupe | Uz X̄ — prati **rasipanje** unutar uzorka |
| **I-Karta** | Pojedinačna merenja | Malo tačaka ili **1 merenje po uzorku** |
| **MR-Karta** | Moving range | Uz I-kartu — rasipanje između uzastopnih merenja |
| **Cp/Cpk** | Kapabilitet procesa | Da li proces **staje u LSL–USL**; min. ~25–30 merenja za pouzdanost |
| **Histogram** | Raspodela vrednosti | Provera normalnosti pre Cp/Cpk |
| **Pareto NOK** | Koje dimenzije najčešće padaju | Više pozicija na delu |
| **Heat mapa** | Mapa odstupanja po pozicijama | Brzi vizuelni pregled „gde boli“ |
| **Dashboard** | Sve pozicije odjednom | Pregled dela sa više dimenzija |
| **Po smeni / mašini / operateru** | Poređenje izvora varijacije | Kada sumnjate na smenu ili setup |
| **Sigma nivo** | Sigma procesa | Sažet indikator (iz Cp/Cpk / DPMO) |
| **Stabilnost** | Da li je proces stabilan | **Pre** interpretacije Cp/Cpk |

### 5.3 Granice na merljivim kartama

| Granica | Tip | Značenje |
|---------|-----|----------|
| **LSL / USL** | Specifikacija (crtež) | Šta **kupac/tolerancija** dozvoljava |
| **UCL / LCL** | Kontrola procesa | Šta proces **obično** radi (3σ) |

**Van USL/LSL** = loš deo (NOK).  
**Van UCL/LCL** = proces se promenio — istražiti **pre** nego što nastane škart.

### 5.4 Cp/Cpk — kako čitati

| Vrednost | Boja u aplikaciji | Značenje |
|----------|-------------------|----------|
| **≥ 1,33** | Zeleno | Proces sposoban (tipični cilj industrije) |
| **1,0 – 1,33** | Žuto | Granično — rizik |
| **< 1,0** | Crveno | Proces nije sposoban — korektivna mera obavezna |

**Cp** = rasipanje u odnosu na toleranciju (ne gleda centriranje).  
**Cpk** = stvarna kapabilitet (centriranje + rasipanje) — **uvek gledajte Cpk**.

**Upozorenje u aplikaciji:** Cp/Cpk pretpostavljaju **približno normalnu raspodelu** i **stabilan proces**. Ako je histogram skewed ili I-karta van kontrole — prvo stabilizujte, pa Cp/Cpk.

### 5.5 Redosled analize merljivog dela (preporučeno)

```
1. Izaberite ID + karakteristiku + period
2. I-Karta ili X̄/R — da li je proces STABILAN?
   └─ Ne → uzrok (alat, materijal, setup) → 8D
3. Histogram — normalnost OK?
4. Cp/Cpk — da li proces STAJE u toleranciji?
   └─ Cpk nizak → centriraj proces ili smanji rasipanje
5. Heat mapa / Pareto NOK — koje pozicije padaju
6. Po smeni / mašini — izvor varijacije
7. PDF / Excel izvoz — izveštaj
```

---

## 6. Analitika van taba SPC KARTE

SPC karte nisu sve — **analitika** uključuje:

### 6.1 Tab STANJE (Inteligencija procesa)

- Pregled **stanja dela** (OK trend, rizik)
- **Predikcija** Cp/Cpk / trenda
- Predlog **korektivnih mera**
- Automatska **eskalacija** inženjeru (kvalitet / šef / admin)

**Kada:** svakodnevni pregled pre sastanka; posle alarma na karti.

### 6.2 Tab DASHBOARD (atributivne)

- OK / NOK / merenja za smenu/dan
- Brzi pregled bez duboke SPC analize

### 6.3 Tab SMENA

- Agregat po smenama — ko / kada lošije

### 6.4 Tab STABILNOST (merljive)

- Da li su tačke van kontrole pre nego što računate kapabilitet

### 6.5 Tab MSA / Gage R&R

- Da li **merilo** pravi deo varijacije
- Pre optuženja procesa — proverite merilo

### 6.6 Tab TRASABILITET

- Lanac: RN → unos → merenje → operater → datum
- Reklamacije kupca

### 6.7 Tab OEE / CILJEVI

- KPI linije + ciljevi PPM/RTY iz šifrarnika

### 6.8 Tab 8D / ESKALACIJE

- Formalno rešavanje problema pokrenutog iz SPC analize

---

## 7. Praktični scenariji

### Scenarij A — „Danas više NOK na NT-001“

1. Modul 2 → Atributivne → **SPC KARTE**
2. ID = NT-001, period = poslednjih 7 dana
3. **Pareto** — koja greška?
4. **p-Karta** — od kada trend?
5. Filter **smena / mašina**
6. **LOG** — detalji unosa
7. **8D** ako se ponavlja

### Scenarij B — „Kupac žali dimenziju NM-001“

1. Modul 2 → Merljive → **TRASABILITET**
2. Pronađite seriju / datum
3. **SPC KARTE** → I ili X̄ za tu poziciju u tom periodu
4. **Cp/Cpk** u tom periodu
5. **Foto arhiva** (ako ima NOK foto)
6. **8D** + izveštaj (PDF iz kartice)

### Scenarij C — „Cp/Cpk je žuto — šta dalje?“

1. **Stabilnost** / I-karta — stabilan?
2. **Histogram** — normalnost?
3. **R-Karta** — rasipanje raste?
4. Ako je centar pomeren → podešavanje alata/procesa
5. Ako je rasipanje veliko → uzrok varijacije (materijal, alat, temperatura…)
6. Posle mere — pratite kartu **min. 25 novih merenja**

### Scenarij D — „Koja karta prva?“

| Tip | Prva karta |
|-----|------------|
| Atributivne, tražite uzrok | **Pareto** |
| Atributivne, trend kvaliteta | **p-Karta** |
| Merljive, 1 merenje/komad | **I + MR** |
| Merljive, 5 merenja/uzorak | **X̄ + R** |
| Merljive, više pozicija | **Heat mapa / Pareto NOK** |
| Izveštaj kupcu | **Cp/Cpk + histogram + PDF export** |

---

## 8. Izvoz iz SPC karata

Na merljivim kartama:

- **📄 PDF** — slika karte za izveštaj / email
- **📊 Excel** — sirovi podaci za dalju analizu

Atributivne karte — koristite tab **EXCEL** modula za šire izvoz.

---

## 9. Greške koje inženjeri prave

| Greška | Posledica | Ispravno |
|--------|-----------|----------|
| Gledaju Cp/Cpk na 5 merenja | Pogrešan zaključak | Min. 25–30 tačaka, stabilan proces |
| Ignorišu Pareto | Leče simptom, ne uzrok | Uvek Pareto pre 8D |
| Menjaju LSL/USL umesto procesa | Maskiranje problema | Korektivna mera na procesu |
| Analiza bez filtera smene | Pogrešan uzrok | Uvek proverite smenu/mašinu |
| Očekuju karte bez unosa | Prazne karte | Obuka operatera Modul 1 |

---

## 10. Povezanost Modul 1 → Modul 2

```
OPERATER (Modul 1)          INŽENJER (Modul 2)
─────────────────          ───────────────────
Tačan ID dela       →      Ispravan filter na karti
Poka-yoke           →      Pouzdani podaci
OK/NOK / merenja    →      p / X̄ / I tačke
LSL/USL iz šifrarnika →    Cp/Cpk smislen
Foto NOK            →      Trasabilitet + 8D dokaz
```

**Bez kvalitetnog Modula 1 — Modul 2 laže.**

---

## 11. Rezime — analitika u jednoj rečenici

**Analitika** = pretvaranje unosa sa linije u **odluke**: stabilan ili ne, sposoban ili ne, koji uzrok, koja korektivna mera — kroz SPC karte, Pareto, Cp/Cpk, STANJE, 8D i trasabilitet.

---

*Operateri: [OBUKA_OPERATER_MODUL1.html](./OBUKA_OPERATER_MODUL1.html)*  
*Inženjer pregled: [UPUTSTVO_OBUKA_INZENJER_MODUL2.md](./UPUTSTVO_OBUKA_INZENJER_MODUL2.md)*  
*Pregled sistema: [UPUTSTVO_KORISCENJE_APLIKACIJE.md](./UPUTSTVO_KORISCENJE_APLIKACIJE.md)*
