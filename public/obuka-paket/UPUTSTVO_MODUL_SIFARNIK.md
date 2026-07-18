# Modul 0 — Šifrarnik (kompletno uputstvo)

Uputstvo za **Modul 0 — Šifrarnik** u SPC Web aplikaciji. Obuhvata svih **6 grupa** i njihove tabove, sa objašnjenjem šta se unosi, gde se čuva i kako utiče na unos na liniji (Modul 1) i analitiku (Modul 2).

---

## 1. Šta je Modul 0

Šifrarnik je **centralna baza podataka** pre početka proizvodnje:

- koji delovi postoje i kako se zovu
- koje dimenzije se mere (LSL, USL, nominal)
- koje greške postoje u atributivnom unosu
- radni nalozi, kupci, linije, mašine
- merila, kalibracije, barkod profili
- moment ključevi (ako se koriste)

**Bez šifrarnika** operater ne može da skenira deo, ne pojavljuju se dimenzije za merenje, ne rade SPC karte.

Ulaz: **Početni ekran → Modul 0 — Šifrarnik** (ikona 📋).

---

## 2. Ko ima pristup

| Uloga | Pristup |
|-------|---------|
| **Kvalitet** | Da |
| **Šef** | Da |
| **Admin** | Da |
| **Kontrolor** | Ne |
| **Operater** | Ne |

Potrebna je i **licenca** koja uključuje modul šifrarnika.

---

## 3. Dva načina unosa podataka

### A) Ručno u tabovima (primarni način)

Većina podataka unosi se direktno u aplikaciji — tab po tab, forma + **Sačuvaj**.

### B) Masovni uvoz iz ERP-a (CSV)

Za velike količine podataka iz SAP / Pantheon koristi se **Alati → ERP uvoz** (i pojedinačni CSV na tabu Radni nalozi).

### C) Glavni unos (poseban Excel — inženjerski format)

Tab **Glavni unos** ima **Uvezi .xlsx** — to je **poseban format** `glavni unos.xlsx` za dimenzije i zaglavlje dela. **Nije** isto što i ERP CSV uvoz.

---

## 4. VAŽNO — Excel i CSV: šta važi u ovom modulu

| Način | Format | Gde u modulu | Šta radi |
|-------|--------|--------------|----------|
| **ERP masovni uvoz** | **Samo `.csv`** | Alati → **ERP uvoz** | SAP/Pantheon izvozi → direktno u Supabase tabele |
| **Radni nalozi (brzi uvoz)** | **Samo `.csv`** | Osnovno → **Radni nalozi** → 📎 CSV uvoz (ERP) | Samo RN; deo mora već postojati |
| **Glavni unos (inženjer)** | **`.xlsx` / `.xls`** | Osnovno → **Glavni unos** → Uvezi .xlsx | Staging → propagacija u merljive/atributivne tabele |
| **Backup** | **Samo izvoz `.xlsx`** | Alati → **Backup** | Preuzimanje kopije baze — **nema uvoza** |

### Šta se NE radi u Modulu 0

- **Nema** uvoza celog master Excel šifrarnika (`SPC_master_atributivne.xlsx`) kroz UI tabove.
- **Nema** uvoza `.xlsx` fajlova u tabu ERP uvoz — tamo su **isključivo CSV** fajlovi iz ERP-a.
- **Log kontrole** (OK/NOK, merenja) **nikad** ne idu kroz šifrarnik — to je Modul 1 (unos na liniji).

### Preporučeni tok za fabriku sa ERP-om

```
ERP (SAP/Pantheon) izvozi CSV
        ↓
Alati → ERP uvoz (Preview → Uvezi)
        ↓
Ručno dopuna u tabovima (dimenzije, greške, crteži…)
        ↓
Glavni unos (opciono) za nove delove / dimenzije
        ↓
Modul 1 — operateri rade unos
```

Detaljnija ERP dokumentacija: [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md), [UPUTSTVO_SAP_ERP_DROP.md](./UPUTSTVO_SAP_ERP_DROP.md).

---

## 5. Pregled grupa i tabova

| Grupa | Tabovi |
|-------|--------|
| **Osnovno** | Glavni unos, Pogon mapa, Linija↔deo, Liste, Delovi, RN, Kupci, Dobavljači, Linije, Mašine, Smene, Ciljevi, Kontrolna lista |
| **Atributivne** | Katalog grešaka, Crtež dela, Pogoni po delu |
| **Merljive** | Dimenzije, SPC alarm %, SOP po delu, Merila/kalibracija |
| **Celo vozilo** | Tipovi vozila, Defekti vozila, Delovi vozila |
| **Moment ključ** | Šifrarnik JOB, Ključevi/kalibracija |
| **Alati** | Barkod, ERP uvoz, Backup |

---

## 6. Grupa OSNOVNO

### 6.1 Glavni unos

**Svrha:** Glavni inženjerski unos — jedan deo, više dimenzija (merljivih i atributivnih), zaglavlje (RN, kupac, linija…).

**Gde se čuva (staging):** tabela `glavni_unos_redovi` (po sheet-ovima: vozilo1, vozilo2…).

**Propagacija (dugme Sačuvaj i propagiraj / Propagiraj)** automatski puni:

| Cilj | Tabela |
|------|--------|
| Dimenzije merljive | `karakteristike_merljive` |
| SOP merljive | `sop_deo_varijabilni` |
| Deo (zaglavlje) | `delovi` |
| Pogon po delu (atr.) | `delovi_atributivni_pogon` |
| Kupac | `kupci` |
| Radni nalog | `radni_nalozi` |

**Šta unosite po redu dimenzije:**

| Polje | Značenje |
|-------|----------|
| ID deo * | Šifra dela (npr. MRAP1) |
| Radni nalog | RN iz proizvodnje |
| Kupac | Ime kupca |
| Naziv dela | Opis |
| Linija / operacija / mašina | Gde se kontroliše |
| Karakteristika | Naziv mere ili kontrole |
| Klasa | Critical / Major / Minor |
| Nominal, LSL, USL | Granice (merljive) |
| Jedinica | mm, Nm… |
| Tip | Merljiva ili Atributivna |
| Instrument | Koji merni instrument |
| Kom za kontrolu n | Veličina uzorka |
| SPC broj merenja | Koliko merenja u seriji |

**Akcije:**

- **+ Grupni unos** — više redova odjednom
- **+ Dimenzije za {ID}** — novi redovi po šablonu dela
- **Sačuvaj i propagiraj** — snima staging + šalje u produkcione tabele
- **Uvezi .xlsx** — uvoz iz `glavni unos.xlsx` (inženjerski format, **ne ERP CSV**)

**Kako radi:** Unos → staging → propagacija. Modul 1 posle toga vidi dimenzije i granice pri skeniranju dela.

---

### 6.2 Pogon mapa

**Svrha:** Veza **faze linije** (A–I) sa `linija_id` u bazi.

**Tabela:** `pogon_linija_mapa`

| Polje | Značenje |
|-------|----------|
| linija_faza | Oznaka faze (A, B, C…) |
| linija_id | ID iz tabele linije |
| pogon_kod | Kod pogona (A–I) |

**Zašto je bitno:** Na tabletu operater bira pogon; filter dimenzija i RN zavisi od ove mape.

**Akcije:** + Linija/pogon, Sačuvaj, brisanje (×).

---

### 6.3 Linija ↔ deo

**Svrha:** **Pregled** (read-only) — koji delovi su vezani za koju liniju/pogon. Nema unosa.

**Akcije:** filter, osveži (↻).

Koristi se za proveru da li je mapiranje ispravno pre puštanja linije.

---

### 6.4 Liste (dropdown)

**Svrha:** Vrednosti za padajuće liste u Glavnom unosu i drugim formama.

**Tabela:** `sifrarnik_liste_vrednosti`

Liste: `karakteristika`, `reakcioni_plan`, `instrument`, `jedinica`.

Fiksno u kodu: **Klasa** (Critical/Major/Minor), **Tip** (Merljiva/Atributivna).

**Akcije:** izbor liste, Dodaj vrednost, brisanje.

---

### 6.5 Delovi (pregled)

**Svrha:** Pregled i ručna izmena delova koji su već u sistemu (iz ERP-a ili propagacije).

**Kompletna procedura za novi deo (komponenta):** `UPUTSTVO_NOVI_DEO_SIFARNIK.md`.  
**Novo celo vozilo:** `UPUTSTVO_NOVO_VOZILO_SIFARNIK.md`.

**Tabela:** `delovi`

| Polje | Značenje |
|-------|----------|
| id_deo | Šifra (PK) |
| naziv_dela | Naziv |
| karakteristika | Opis kontrole |
| tip_kontrole | `deo` ili `vozilo` |
| kom_za_kontrolu | Veličina uzorka (n) |
| aktivan | Da/ne — neaktivan se ne nudi na liniji |
| napomena | Slobodan tekst |

**Akcije:** filter po tipu, + Deo, Sačuvaj, ✎ izmena, ▦ barkod (prebacuje na tab Barkod).

---

### 6.6 Radni nalozi

**Svrha:** Aktivni RN za proizvodnju — operater ih bira posle skena dela.

**Tabela:** `radni_nalozi`

| Polje | Značenje |
|-------|----------|
| broj_naloga | Broj RN |
| id_deo | Deo (mora postojati u `delovi`) |
| kolicina | Planirana količina |
| kupac | Kupac |
| rok_isporuke | Datum |
| pogon_kod | Pogon A–I |
| status | aktivan / završen / arhiviran |
| napomena | Napomena |

**Akcije:**

- **+ Novi RN** — ručni unos
- **📎 CSV uvoz (ERP)** — **samo `.csv`**, brzi uvoz RN iz ERP izvoza
- filter po statusu, arhiviranje

**Pravilo:** `id_deo` mora **već postojati** u šifrarniku delova — inače uvoz pada (FK greška).

Za masovni uvoz svih entiteta koristite **Alati → ERP uvoz**.

---

### 6.7 Kupci

**Tabela:** `kupci` — `naziv`, `aktivan`.

Ručni unos ili ERP CSV (`kupci.csv`).

---

### 6.7a Dobavljači

**Tabela:** `dobavljaci`

Osnovni podaci: šifra, naziv, država, grad i status. Šifra treba da odgovara ERP šifri
dobavljača. Neaktivan dobavljač ostaje u istoriji, ali se ne nudi za novi prijem.

ERP CSV: `dobavljaci.csv`.

### 6.7b Prijemna kontrola — nije u Šifrarniku

Unos prijemne kontrole je u **Modulu 1 — Atributivne → PRIJEM**.
Šifrarnik drži samo master **Dobavljači**. Dugme **Pokreni Ulaznu kontrolu**
otvara atributivni UNOS (pogon A) i vraća OK/NOK u prijem.

Detaljno uputstvo, PPM formula i izveštaj:

[Dobavljači i prijemna kontrola](./UPUTSTVO_DOBAVLJACI_I_PRIJEMNA_KONTROLA.md)

---

### 6.8 Linije

**Tabela:** `linije`

| Polje | Značenje |
|-------|----------|
| linija | Naziv radnog mesta |
| proces | Proces |
| operacija | Operacija |
| greske | Povezane greške (tekst) |

ERP CSV: `linije.csv` (ARBPL, work center…).

---

### 6.9 Mašine

**Tabela:** `masine` — `naziv`, `linija`.

ERP CSV: `masine.csv`.

---

### 6.10 Smene

**Tabela:** `smene` — `naziv`, `pocetak`, `kraj` (vreme smene).

Ručno — ERP retko šalje smene (u config-u isključeno po defaultu).

Aplikacija inače automatski određuje smenu po satu (`useAutoSmena`).

---

### 6.11 Ciljevi

**Svrha:** Ciljevi kvaliteta po delu za dashboard i alarme.

**Tabela:** `ciljevi`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| rty_cilj | Ciljni RTY/FPY % |
| dpmo_cilj | Ciljni DPMO |
| p_cilj | Cilj za p-kartu |
| vazi_od | Od kog datuma važi |

Koristi se u analitici i KPI trakama.

---

### 6.12 Kontrolna lista

**Svrha:** Stavke koje kontrolor mora potvrditi **pre početka smene** (poka-yoke na Modulu 1).

**Tabela:** `kontrolna_lista_stavke`

| Polje | Značenje |
|-------|----------|
| kategorija | Grupa stavki |
| stavka | Tekst pitanja |
| redosled | Redosled prikaza |
| aktivna | Da/ne |

Na liniji: bez potvrde liste operater ne ulazi u unos (osim admin).

---

## 7. Grupa ATRIBUTIVNE

### 7.1 Katalog grešaka

**Svrha:** Lista grešaka za OK/NOK unos na liniji.

**Tabela:** `greske_katalog`

| Polje | Značenje |
|-------|----------|
| kategorija | Glavna kategorija |
| podkategorija | Podgrupa |
| defekt | Naziv defekta |
| id_deo | Opciono — vezano za deo |
| pogon_kod | Opciono — vezano za pogon |

ERP CSV: `greske_katalog.csv`.

Na liniji: operater bira kategoriju → podkategoriju → defekt.

---

### 7.2 Crtež dela

**Svrha:** Slika/crtež za atributivni unos (tab CRTEŽ u Modulu 1).

**Tabela:** `delovi` (polje `slika_naziv`) + Storage bucket `atributivne/`

**Akcije:** izbor dela, upload slike, Sačuvaj.

---

### 7.3 Pogoni po delu

**Svrha:** Koji pogon (A–I) važi za koji deo u atributivnom modulu — kom za kontrolu, RN po pogonu.

**Tabela:** `delovi_atributivni_pogon`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| pogon_kod | A–I |
| radni_nalog | RN za taj pogon |
| kom_za_kontrolu | n za uzorkovanje |
| aktivan | Da/ne |

Popunjava se ručno ili propagacijom iz Glavnog unosa.

---

## 8. Grupa MERLJIVE

### 8.1 Dimenzije (pregled)

**Svrha:** Sve merljive karakteristike — **srce merljivog modula**.

**Tabela:** `karakteristike_merljive`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| pogon_kod | Pogon A–I |
| pozicija | Oznaka dimenzije (D1, D2…) |
| sifra_merenja | Šifra mere |
| naziv_mere | Naziv |
| nominala, lsl, usl | Granice |
| jedinica | mm, °… |
| merni_instrument | Instrument |
| kom_za_kontrolu_n | Veličina uzorka |
| broj_merenja | Merenja po seriji |
| fai_broj_merenja | Za FAI |
| klasa | Critical/Major/Minor |
| radni_nalog | RN |
| slika | Referenca slike |

**Akcije:**

- filter po delu/pogonu
- **Propagiraj iz Osnovnog** — povuci iz `glavni_unos_redovi`
- + Dimenzija, Sačuvaj, brisanje

ERP CSV: `karakteristike_merljive.csv`.

**Na liniji:** posle skena dela učitavaju se redovi za taj `id_deo` + `pogon_kod` → kolone za kucanje merenja.

---

### 8.2 SPC alarm %

**Svrha:** Globalni pragovi za SPC alarme po klasi greške.

**Čuva se u:** `app_podesavanja` (ključevi `spc_alarm_prag_*`)

Procenat odstupanja od centra procesa za alarm (default / Critical / Major / Minor).

**Akcija:** Sačuvaj pragove — važi za celu aplikaciju.

---

### 8.3 SOP po delu (pregled)

**Svrha:** Operativni podaci za merljivi unos — slika SOP, mašina, linija, broj merenja.

**Tabela:** `sop_deo_varijabilni`

| Polje | Značenje |
|-------|----------|
| id_deo, pogon_kod | Ključ |
| slika | SOP slika |
| masina, linija | Lokacija |
| broj_merenja | Plan merenja |
| kontrolor_ime | Podrazumevani kontrolor |

**Propagiraj iz Osnovnog** — iz Glavnog unosa.

---

### 8.4 Merila / kalibracija

**Svrha:** Registar mernih instrumenata i kalibracija.

**Tabele:** `merila`, `kalibracije`

**Merilo:**

| Polje | Značenje |
|-------|----------|
| naziv | Naziv instrumenta |
| serijski_broj | SN |
| tip | Tip merila |
| lokacija | Gde se nalazi |
| opseg | Mereni opseg |
| kategorija | npr. digitalno merilo |
| aktivno | Da/ne |

**Kalibracija:**

| Polje | Značenje |
|-------|----------|
| datum_kal | Datum kalibracije |
| sledeca_kal | Sledeća kalibracija |
| izvrsio | Ko je radio |
| sertifikat_br | Broj sertifikata |
| rezultat | OK/NOK |

ERP CSV: `merila.csv`, `kalibracije.csv`.

Na liniji: digitalna merila se vezuju preko vendor profila; istekla kalibracija blokira unos.

---

## 9. Grupa CELO VOZILO

Za kontrolu **celog vozila** (ne pojedinačnog dela).

**Kompletna procedura za novo vozilo:** `UPUTSTVO_NOVO_VOZILO_SIFARNIK.md` (dijagram → tip → deo → defekti → pogon F → test).

### 9.1 Tipovi vozila

**Tabela:** `tipovi_vozila`

| Polje | Značenje |
|-------|----------|
| kod | Kod tipa |
| naziv | Naziv modela |
| prefiks_id_deo | Prefiks šifre delova |
| dijagram_src / slika_sop | Slike |
| aktivan | Da/ne |

ERP CSV: `tipovi_vozila.csv`.

---

### 9.2 Defekti vozila

**Tabela:** `katalog_gresaka_vozilo`

Kategorija / podkategorija / defekt **po tipu vozila**.

Koristi se u vozilo-modu atributivnog unosa (zona na dijagramu).

---

### 9.3 Delovi vozila

**Tabela:** `delovi` gde `tip_kontrole = 'vozilo'`

Delovi vezani za tip vozila — ID, naziv, slika, kom za kontrolu.

---

## 10. Grupa MOMENT KLJUČ

Za montažu sa **digitalnim moment ključevima** (Atlas, itd.).

### 10.1 Šifrarnik JOB

Unutrašnji pod-tabovi:

| Pod-tab | Tabela | Svrha |
|---------|--------|-------|
| Jedan list | — | Brz unos jednog lista |
| JOB-ovi | `moment_job` | Posao momentiranja po delu |
| Koraci sekvence | `moment_korak` | Redosled, ciljni Nm, tolerancije |
| Pozicije | `moment_pozicija` | Brojevi pozicija na crtežu |
| Ključevi na liniji | `merila` (`kategorija: momentni_kljuc`) | Digitalni ključevi |

**Akcije:** Učitaj kompletan šifrarnik, Export JSON, Uvezi protokol (CSV/TXT/LOG/XML/JSON iz ključa).

Na liniji (Modul 1 → tab MOMENT): operater prati sekvencu koraka sa ključem.

---

### 10.2 Ključevi / kalibracija

Isti panel kao **Merila / kalibracija** — opšti registar merila uključujući moment ključeve.

Za **konfiguraciju sekvence** koristite pod-tab **Šifrarnik JOB**.

---

## 11. Grupa ALATI

### 11.1 Barkod

**Svrha:** Profili etiketa za štampu barkoda po delu.

**Tabela:** `barkod_profili`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| format | id / id_rn / puna |
| tip_koda | QR, Code128… |
| sadrzaj_barkoda | Šta je u kodu |
| radni_nalog | Opciono RN u kodu |

**Akcije:** pregled, Sačuvaj profil, **Štampaj**.

Na liniji: skener čita barkod → otvara deo (i RN ako je u profilu).

Detalji: [UPUTSTVO_PRAVLJENJE_BARKODOVA.md](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md).

---

### 11.2 ERP uvoz ⭐ (CSV)

**Svrha:** Masovni dnevni uvoz iz SAP / Pantheon — **bez Excela**.

**Tabele i tipični CSV fajlovi** (preset SAP):

| Entitet | CSV fajl | Supabase tabela |
|---------|----------|-----------------|
| Linije | `linije.csv` | `linije` |
| Mašine | `masine.csv` | `masine` |
| Tipovi vozila | `tipovi_vozila.csv` | `tipovi_vozila` |
| Delovi | `delovi.csv`, `sap_delovi.csv` | `delovi` |
| Crteži | `crtezi_dela.csv` | `crtez_assets` |
| Greške | `greske_katalog.csv` | `greske_katalog` |
| Kupci | `kupci.csv` | `kupci` |
| Merila | `merila.csv` | `merila` |
| Kalibracije | `kalibracije.csv` | `kalibracije` |
| Dimenzije | `karakteristike_merljive.csv` | `karakteristike_merljive` |
| Radni nalozi | `radni_nalozi.csv`, `sap_radni_nalozi.csv` | `radni_nalozi` |

**Kako radi:**

1. Izaberi **preset** (SAP ili Pantheon)
2. **Upload CSV** — izaberi jedan ili više `.csv` fajlova
3. **Preview** — dry-run, vidi greške pre upisa
4. **Uvezi u bazu** — upis u Supabase
5. **Server trigger** (opciono) — čita folder `erp-drop/incoming/` preko API-ja

**Ograničenja:**

- Samo **`.csv`** — `.xlsx` se ne prihvata
- Imena fajlova moraju odgovarati config-u (inače „Nespojeni fajl")
- Redosled uvoza: prvo delovi, pa radni nalozi
- `radni_nalozi` zahteva postojeći `id_deo` u `delovi`
- Kolone ERP-a se automatski mapiraju (MATNR → id_deo, AUFNR → radni_nalog…)

**Log:** tabela `erp_uvoz_log` — poslednji uvozi vidljivi u panelu.

Primeri CSV: folder `erp-drop/examples/`.

---

### 11.3 Backup

**Samo izvoz** — preuzima `SPC_sifrarnik_backup_{datum}.xlsx`.

**Nema uvoza** — za unos koristite tabove ili ERP CSV.

---

## 12. Preporučeni redosled — novi deo u proizvodnji

Korak-po-korak sa checklistom i čestim greškama: **`UPUTSTVO_NOVI_DEO_SIFARNIK.md`**.

### Sa ERP-om (CSV)

1. ERP izveze CSV → **Alati → ERP uvoz** (delovi, dimenzije, greške, RN…)
2. Proveri **Pogon mapa** i **Linija ↔ deo**
3. Dopuni **Crtež dela** / slike ako nisu u ERP-u
4. Podesi **Barkod** profil
5. Proveri **Kontrolna lista** za smenu
6. Test na Modulu 1 — skeniraj deo, probaj unos

### Bez ERP-a (ručno)

1. **Linije**, **Mašine**, **Kupci**
2. **Glavni unos** → unesi deo + dimenzije → **Propagiraj**
3. **Katalog grešaka** (atributivne)
4. **Pogon mapa** + **Pogoni po delu**
5. **Radni nalozi** ručno
6. **Barkod**, **Kontrolna lista**
7. Test na Modulu 1

---

## 13. Gde šifrarnik utiče u aplikaciji

| Šifrarnik tab | Modul 1 (linija) | Modul 2 (analitika) |
|---------------|------------------|---------------------|
| Delovi | Sken ID dela | Filter po delu |
| Karakteristike merljive | Kolone merenja, LSL/USL | X̄/R, Cp/Cpk |
| Greške katalog | OK/NOK izbor | Pareto, DPMO |
| Radni nalozi | Izbor RN posle dela | Trasabilitet |
| Ciljevi | — | KPI alarmi |
| Kontrolna lista | Blokada unosa | — |
| Merila/kalibracija | Digitalni unos | MSA tab |
| Barkod | Sken | — |
| Moment JOB | Tab MOMENT | — |
| SPC alarm % | Alarm na unosu | SPC alarmi panel |

---

## 14. Česta pitanja

**Zašto operater ne vidi deo?**
→ Proveri `delovi.aktivan`, pogon mapu, licencu modula.

**Zašto nema dimenzija posle skena?**
→ Nema redova u `karakteristike_merljive` za taj `id_deo` + `pogon_kod`. Uvezi CSV ili propagiraj Glavni unos.

**Zašto CSV uvoz RN pada?**
→ `id_deo` ne postoji — prvo uvezi `delovi.csv`.

**Da li mogu da uvezem Excel u ERP tab?**
→ **Ne.** ERP tab prihvata samo CSV. Excel je za Glavni unos (.xlsx poseban format) ili Backup (samo izvoz).

**Da li menjam log u šifrarniku?**
→ **Ne.** Log (kontrolni_log, merenja_varijabilna) nastaje na Modulu 1 pri Zapiši.

---

## 15. Povezana uputstva

| Dokument | Tema |
|----------|------|
| [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md) | ERP CSV config, cron, API |
| [UPUTSTVO_SAP_ERP_DROP.md](./UPUTSTVO_SAP_ERP_DROP.md) | Folder erp-drop/incoming |
| [UPUTSTVO_ERP_RADNI_NALOZI.md](./UPUTSTVO_ERP_RADNI_NALOZI.md) | Mapiranje RN kolona |
| [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) | Glavni unos.xlsx propagacija |
| [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md) | Novi deo (komponenta) u šifrarniku |
| [UPUTSTVO_NOVO_VOZILO_SIFARNIK.md](./UPUTSTVO_NOVO_VOZILO_SIFARNIK.md) | Novo celo vozilo u šifrarniku |
| [UPUTSTVO_SIFARNIK_I_EXCEL.md](./UPUTSTVO_SIFARNIK_I_EXCEL.md) | Legacy master Excel (CLI) |
| [UPUTSTVO_PRAVLJENJE_BARKODOVA.md](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md) | Barkod etikete |
| [UPUTSTVO_BARKOD_I_MERILA.md](./UPUTSTVO_BARKOD_I_MERILA.md) | Merila na liniji |

---

*Verzija: jul 2026 · Modul 0 — Šifrarnik · SPC Web*
