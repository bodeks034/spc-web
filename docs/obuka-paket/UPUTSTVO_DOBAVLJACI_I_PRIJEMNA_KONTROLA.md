# Dobavljači i prijemna kontrola — kompletno uputstvo

Ovo uputstvo objašnjava:

- ko održava šifrarnik dobavljača;
- ko i gde unosi prijemnu kontrolu;
- kako se evidentiraju količine, status, defekt i fotografija NOK dela;
- kako aplikacija računa OK stopu, PPM i prihvat prijema;
- gde se pregleda i izvozi izveštaj dobavljača u Modulu 2;
- kako se radi periodična **ocena dobavljača** (A–D) sa tooltip objašnjenjima;
- kako rade ručni i ERP unos.

---

## 1. Svrha

Modul služi za praćenje kvaliteta materijala, delova i komponenti koje stižu od
dobavljača.

Tok podataka:

```text
Dobavljač
   ↓
Materijal / deo + lot + prijemnica
   ↓
Prijemna kontrola (primljeno, kontrolisano, OK, NOK)
   ↓
Defekt + foto NOK + odluka o prijemu
   ↓
Modul 2 → Kvalitet → Dobavljači
   ↓
OK stopa, PPM, odbijeni prijemi, Pareto i PDF
```

Podaci prijemne kontrole nisu isto što i proizvodna merenja. Oni predstavljaju
kontrolu robe na ulazu u firmu, pre puštanja u skladište ili proizvodnju.

---

## 2. Preduslovi

Pre rada moraju biti primenjene SQL migracije:

1. `67_erp_master_podaci.sql` — dobavljači i materijali;
2. `69_dobavljaci_prijemna_kontrola.sql` — prijemne kontrole, KPI i foto NOK;
3. `70_prijemna_veza_kontrolni_log.sql` — veza prijema ↔ Ulazna kontrola (`kontrolni_log.prijemna_kontrola_id`);
4. `71_ocena_dobavljaca.sql` — periodična ocena dobavljača (A–D) i istorija;
5. `72_prijemna_veza_merljiva.sql` — veza prijema ↔ merljiva merenja i ID uzorka.

Migracija 69 je idempotentna i može se ponovo pokrenuti kada se dodaju nove kolone.

U aplikaciji proveri:

- **Admin → Status šeme**;
- stavka **Dobavljači — prijemna kontrola i KPI** mora biti zelena;
- dobavljač mora postojati pre prijemne kontrole;
- materijal treba da bude povezan sa dobavljačem ako se koristi izbor materijala.

---

## 3. Ko šta radi

| Uloga u procesu | Odgovornost |
|---|---|
| Nabavka | Dostavlja šifru dobavljača, naziv i podatke sa prijemnice |
| Magacin / prijem robe | Potvrđuje dobavljača, dokument, lot i primljenu količinu |
| Kontrolor prijema / kvalitet | Uzorkuje robu, unosi kontrolisano, OK, NOK, defekt, fotografiju i status |
| Inženjer kvaliteta | Analizira PPM, Pareto i trend; pokreće reklamaciju ili korektivnu meru |
| Šef kvaliteta | Odobrava uslovni prijem ili odbijanje prema internom postupku |
| Admin / ERP administrator | Održava migracije, ERP mapiranje i prava pristupa |

U trenutnoj aplikaciji:

- **šifrarnik dobavljača** (Modul 0) održavaju korisnici sa pristupom Šifrarniku
  (tipično **kvalitet, šef ili admin**);
- **prijemnu kontrolu** (Modul 1 — Atributivne → **PRIJEM**) unose **kontrolor**,
  **kvalitet**, **šef** ili **admin**.

---

## 4. Šifrarnik dobavljača

### 4.1 Gde se nalazi

**Početni ekran → Modul 0 — Šifrarnik → Osnovno → Dobavljači**

### 4.2 Ko unosi

Primarno **nabavka**, **kvalitet** ili **ERP administrator**. Šifra mora biti ista kao
šifra dobavljača u ERP-u.

### 4.3 Polja

| Polje | Obavezno | Primer | Značenje |
|---|---:|---|---|
| Šifra dobavljača | Da | `DOB-001` | Stabilna ERP šifra; ne menjati posle korišćenja |
| Naziv dobavljača | Da | `Metal Promet d.o.o.` | Pun poslovni naziv |
| Država | Ne | `RS` | Država sedišta |
| Grad | Ne | `Beograd` | Grad sedišta |
| Status | Da | `Aktivan` | Da li se dobavljač nudi u novom unosu |

Klikni **+ Dobavljač**, popuni polja i klikni **Sačuvaj**.

Ne briši dobavljača koji ima istoriju. Postavi ga na **Neaktivan**. Istorijski izveštaji
ostaju sačuvani.

### 4.4 ERP unos dobavljača

Dobavljači mogu stići iz `dobavljaci.csv`.

Minimalne kolone:

```csv
SifraDobavljaca,NazivDobavljaca,Drzava,Grad,Status
DOB-001,Metal Promet d.o.o.,RS,Beograd,aktivan
```

SAP/Pantheon preset može prepoznati i dodatne podatke kao što su PIB, kontakt,
telefon i email. Ručni tab prikazuje operativna osnovna polja.

---

## 5. Prijemna kontrola — gde se unosi

Put (Modul 1 — operativni unos):

**Početni ekran → Modul 1 — Unos → Atributivne → tab PRIJEM**
**Početni ekran → Modul 1 — Unos → Merljive → tab PRIJEM**

Isti ekran PRIJEM postoji i u atributivnom i u merljivom modulu — zapisi su
zajednički, pa prijem otvoren u jednom modulu vidiš i u drugom.

- u **režimu linija**: tab **PRIJEM** je pored UNOS / LOG (u merljivim pored
  UNOS / FAI / LOG; na tabletu dugmad **PRIJEM** i **POVEŽI** u zaglavlju);
- u **režimu analitika**: **Operativa → PRIJEM** (isti unosni ekran).
  Povezivanje merenja sa prijemom radi se na tabu **POVEŽI PRIJEM** (linija).

Šifrarnik (Modul 0) sadrži samo master **Dobavljači**, ne i unos prijema.

### Razlika: PRIJEM i Ulazna kontrola

Ova dva zapisa nisu duplikati:

| Evidencija | Šta predstavlja | Šta se u njoj čuva |
|---|---|---|
| **PRIJEM** | Jedan prijem, lot ili stavka prijemnice od dobavljača | Dobavljač, materijal/deo, lot, prijemnica, primljena i kontrolisana količina, zbirni OK/NOK i odluka o prijemu |
| **Ulazna kontrola — pogon A** | Detaljna kontrola pojedinačnih komada i karakteristika iz tog prijema | ID deo, kontrolisana karakteristika, rezultat OK/NOK, defekt, količina, kontrolor i Foto NOK |

Primer: dobavljač isporuči lot od **1.000 komada**. U zapisu **PRIJEM** stoji
prijemnica, lot i primljena količina 1.000. Kontrolor zatim kroz **Ulaznu kontrolu**
pregleda uzorak od 50 komada. Ako su 47 OK i 3 NOK, aplikacija te zbirne rezultate
vraća u PRIJEM. Konačna odluka — **Prihvaćeno**, **Uslovno** ili **Odbijeno** —
donosi se i čuva samo na PRIJEMU.

Važno:

- **PRIJEM** je zaglavlje i odluka za ceo lot/prijemnicu;
- **Ulazna kontrola** je dokaz šta je konkretno pregledano i sa kojim rezultatom;
- atributivna veza se čuva preko `kontrolni_log.prijemna_kontrola_id`;
- merljiva veza se čuva preko `merenja_varijabilna.prijemna_kontrola_id`;
- zato se rezultati ne povezuju nepouzdano samo po datumu ili nazivu dela.

### Preporučeni tok — kreni iz merenja

Ovo je preporučeni i najbrži tok za kontrolora:

1. Otvori **Modul 1 → Atributivne → UNOS** ili **Modul 1 → Merljive → UNOS**.
2. Unesi ili skeniraj **ID dela**.
3. Otvori tab **POVEŽI PRIJEM** (pored taba PRIJEM; na tabletu dugme **POVEŽI**
   u zaglavlju). Forma za povezivanje nije na ekranu UNOS — ne zauzima prostor
   iznad unosa.
4. Izaberi/skeniraj dobavljača i unesi **lot**, prijemnicu i **primljenu količinu**.
5. Klikni **Aktiviraj i nastavi merenje**. Aplikacija pronalazi postojeći ili kreira
   novi otvoreni PRIJEM za isti dobavljač + deo + lot + dokument, postavlja
   **pogon A (Ulazna kontrola)** i vraća te na UNOS.
6. Radi atributivna ili merljiva merenja kao i obično. Merenja se vezuju za prijem
   **samo dok je pogon A**. Iznad forme stoji plava traka **PRIJEM #…** — dugmetom
   **—** možeš da je skupiš (prijem ostaje povezan), a dugmetom **✕** da odspojiš
   prijem. Ako prebaciš na drugi pogon, traka upozorava „Prebaci pogon na A“.
7. Posle snimanja aplikacija automatski popunjava **Kontrolisano**, **OK** i **NOK**
   na PRIJEMU.
8. Na tabu **PRIJEM** odgovorna osoba ručno bira konačnu odluku:
   **Prihvaćeno / Uslovno / Odbijeno**.

Primljena količina i odluka se **ne izračunavaju iz merenja**:

- **Primljeno** dolazi sa prijemnice / iz ERP-a;
- **status prijema** je poslovna odluka kvaliteta ili nabavke.

Ako broj kontrolisanih uzoraka pređe primljenu količinu, aplikacija neće sama
povećati Primljeno — prvo ispravi podatak na PRIJEMU.

### Alternativni tok — kreni iz PRIJEMA

1. Klikni **+ Novi prijem**, unesi dobavljača, lot, prijemnicu, **ID deo**, primljenu količinu.
2. Sačuvaj, zatim **Pokreni Ulaznu kontrolu** (ili dugme **Kontrola** u tabeli).
3. Otvara se **UNOS** sa pogonom **A — Ulazna kontrola** i banerom prijema (lot/dokument).
4. Unesi OK/NOK po komadu kao običnu atributivnu kontrolu i snimi.
5. Aplikacija upiše OK/NOK nazad u prijem. Odluku **Prihvaćeno / Uslovno / Odbijeno** i dalje biraš na tabu PRIJEM.
6. Dugme **↻** / **Osveži OK/NOK iz kontrole** ponovo agregira log ako treba.

Ovaj smer ostaje koristan kada magacin prvo evidentira prijem, a kontrolor tek
kasnije uzima uzorak.

### Kako se računaju merljivi uzorci

Jedan merljivi uzorak/komad može imati više dimenzija. Sve dimenzije istog uzorka
dele `inspekcija_id`, pa se ne broje kao više kontrolisanih komada:

```text
ako su sve dimenzije uzorka OK  → uzorak je OK
ako je bar jedna dimenzija NOK → ceo uzorak je NOK
```

Primer: izmereno je 5 komada, svaki sa 8 dimenzija. To je **5 kontrolisanih**, ne
40 merenja. Ako na drugom komadu jedna dimenzija izađe iz tolerancije, rezultat
prijema je **4 OK + 1 NOK**.

Za isti fizički uzorak nemoj praviti dva odvojena unosa u atributivnom i merljivom
modulu, jer se odvojene kontrolisane jedinice sabiraju.

Ne upisuj lot ili broj prijemnice u polje **Radni nalog**. Lot i dokument se prenose
iz zapisa PRIJEM i prikazuju u baneru iznad Ulazne kontrole.

Klikni **+ Novi prijem**.

Jedan red predstavlja jedan kontrolisani prijem, lot ili stavku prijemnice od jednog
dobavljača.

---

## 6. Redosled unosa prijemne kontrole

### Korak 1 — identifikacija prijema

Popuni:

| Polje | Obavezno | Primer |
|---|---:|---|
| Datum | Da | `2026-07-18` |
| Dobavljač | Da | `DOB-001 — Metal Promet d.o.o.` |
| Materijal | Preporuka | `MAT-001 — Čelični lim S355` |
| ID deo | Po potrebi | `HAM-NM-001` |
| Broj lota | Preporuka | `LOT-2026-0718-01` |
| Dokument / prijemnica | Preporuka | `PR-2026-00451` |

Dobavljača možeš izabrati iz liste ili kliknuti ikonu **📷** pored polja
**Dobavljač** i skenirati njegov barkod. Barkod može sadržati:

- samo šifru, npr. `DOB-001`;
- šifru kao prvi segment, npr. `DOB-001|LOT-0718`;
- JSON sa poljem `sifra_dobavljaca`, `supplier` ili `vendor`.

Skenirana šifra mora postojati u šifrarniku **Modul 0 → Dobavljači**. Ako nije
pronađena, aplikacija neće izabrati drugog dobavljača i prikazaće poruku o grešci.

Koristi:

- **Materijal** kada se kontroliše sirovina iz šifrarnika materijala;
- **ID deo** kada dobavljač isporučuje gotovu komponentu;
- oba polja samo ako interna sledljivost zahteva obe veze.

### Korak 2 — količine

Popuni:

| Polje | Značenje |
|---|---|
| Primljeno | Ukupna količina na prijemnici / u lotu |
| Kontrolisano | Broj stvarno pregledanih ili izmerenih jedinica |
| OK | Broj kontrolisanih jedinica bez utvrđenog odstupanja |
| NOK | Broj kontrolisanih jedinica sa utvrđenim odstupanjem |

Pravila aplikacije:

```text
kontrolisano ≤ primljeno
OK + NOK ≤ kontrolisano
sve količine ≥ 0
```

Ako je `OK + NOK < kontrolisano`, razlika predstavlja još nerazvrstane ili nepotpuno
ocenjene jedinice. Pre zatvaranja prijema preporuka je:

```text
OK + NOK = kontrolisano
```

### Korak 3 — NOK podatak

Ako je `NOK > 0`:

1. u polje **Defekt** upiši jasan naziv, npr. `Korozija`, `Pogrešna debljina`,
   `Oštećenje pri transportu`;
2. klikni **Slikaj / izaberi** u delu **Foto (NOK)**;
3. fotografiši NOK deo ili izaberi sliku iz galerije;
4. upiši komentar uz sliku, npr. `Korozija na ivici, lot 0718-01`;
5. proveri da se vidi umanjeni prikaz fotografije.

Slika se pre čuvanja smanjuje i kompresuje. Ako aplikacija prijavi da je fotografija
prevelika, napravi bliži kadar ili koristi sliku manje rezolucije.

Fotografija NOK se prikazuje:

- u tabeli Prijemne kontrole;
- u Modulu 2, u galeriji **Foto NOK dela**;
- u PDF izveštaju dobavljača;
- u štampanom izveštaju.

### Korak 4 — status

Izaberi status:

| Status | Kada se koristi |
|---|---|
| Otvoreno | Kontrola ili odluka još nije završena |
| Prihvaćeno | Lot je prihvaćen bez zadržavanja |
| Uslovno | Lot se koristi uz odobreno odstupanje, sortiranje ili dodatnu kontrolu |
| Odbijeno | Lot se vraća, blokira ili ide u reklamaciju |

Status se bira ručno. Aplikacija ga ne menja automatski samo zato što postoji NOK.
Odluka mora pratiti interni postupak, specifikaciju i odobrenje odgovorne osobe.

### Korak 5 — napomena i čuvanje

U **Napomena** upiši odluku ili akciju, na primer:

```text
Uslovni prijem odobrio šef kvaliteta. Sortiranje 100% pre proizvodnje.
```

Klikni **Sačuvaj**.

Posle čuvanja proveri red u tabeli: datum, dobavljač, materijal/deo, lot, količine,
foto NOK i status.

---

## 7. Primer kompletnog unosa

| Polje | Vrednost |
|---|---|
| Datum | `2026-07-18` |
| Dobavljač | `DOB-001` |
| Materijal | `MAT-001` |
| ID deo | prazno |
| Lot | `LOT-0718-01` |
| Dokument | `PR-00451` |
| Primljeno | `1000` |
| Kontrolisano | `100` |
| OK | `98` |
| NOK | `2` |
| Defekt | `Korozija` |
| Foto NOK | fotografija korozije |
| Status | `Uslovno` |
| Napomena | `100% sortiranje pre izdavanja proizvodnji` |

---

## 8. Kako aplikacija računa PPM

PPM znači **broj NOK jedinica na milion kontrolisanih jedinica**.

Formula:

```text
PPM = (ukupno NOK / ukupno kontrolisano) × 1.000.000
```

Rezultat se zaokružuje na ceo broj.

Važno:

- imenilac je **Kontrolisano**, ne Primljeno;
- računaju se svi prijemi izabranog dobavljača u izabranom periodu;
- status prijema ne briše NOK iz obračuna;
- ako nema kontrolisanih jedinica, PPM je `0`.

### Primer 1 — jedan prijem

```text
Kontrolisano = 100
NOK = 2

PPM = (2 / 100) × 1.000.000
PPM = 20.000
```

### Primer 2 — više prijema

| Prijem | Kontrolisano | OK | NOK |
|---|---:|---:|---:|
| PR-001 | 100 | 98 | 2 |
| PR-002 | 50 | 49 | 1 |
| Ukupno | 150 | 147 | 3 |

```text
PPM = (3 / 150) × 1.000.000 = 20.000
```

Aplikacija prvo sabira sve kontrolisane i sve NOK količine, pa tek onda računa PPM.
Ne računa prost prosek PPM vrednosti pojedinačnih prijema.

---

## 9. Ostali KPI dobavljača

### 9.1 OK stopa

```text
OK stopa (%) = (ukupno OK / ukupno kontrolisano) × 100
```

Za prethodni primer:

```text
OK stopa = (147 / 150) × 100 = 98,00%
```

Prikazuje se sa dve decimale.

Ako `OK + NOK < kontrolisano`, OK stopa i NOK udeo neće zajedno dati 100%, jer postoje
nerazvrstane jedinice.

### 9.2 Prihvat prijema

```text
Prihvat prijema (%) =
(broj prijema sa statusom Prihvaćeno / ukupan broj prijema) × 100
```

Statusi **Uslovno**, **Odbijeno** i **Otvoreno** ne računaju se kao potpuno prihvaćeni.

Primer:

```text
10 prijema ukupno
7 Prihvaćeno
2 Uslovno
1 Odbijeno

Prihvat prijema = (7 / 10) × 100 = 70,00%
```

### 9.3 Pareto defekata

Aplikacija:

1. uzima samo redove koji imaju naziv defekta i `NOK > 0`;
2. grupiše ih po nazivu defekta;
3. sabira NOK količine;
4. sortira od najveće ka najmanjoj količini.

Zato isti defekt treba uvek pisati jednako. Nemoj koristiti varijante:

```text
Korozija
koroz.
Rđa
```

ako predstavljaju isti katalogizovan problem. Preporuka je dogovorena lista naziva
defekata.

### 9.4 Kvalitet po materijalu / delu

Za svaki materijal ili deo aplikacija sabira:

- kontrolisano;
- OK;
- NOK;
- OK stopu.

Ako nije izabran materijal, koristi se ID dela. Ako nije uneto ni jedno, zapis pripada
grupi **BEZ-ŠIFRE**.

---

## 10. Izveštaj dobavljača u Modulu 2

Put:

**Početni ekran → Modul 2 — Analiza → Kvalitet → Dobavljači**

Postupak:

1. izaberi dobavljača;
2. izaberi period: 7, 30, 90 ili 365 dana;
3. klikni **Generiši**.

Period se računa prema polju **Datum** na prijemnoj kontroli:

```text
datum prijema ≥ današnji datum − izabrani broj dana
```

Izveštaj prikazuje:

- podatke dobavljača;
- broj prijema;
- ukupno kontrolisano;
- OK i NOK;
- OK stopu;
- PPM;
- kvalitet po materijalu ili delu;
- Pareto defekata;
- tabelu prijemnih kontrola;
- galeriju Foto NOK dela;
- karticu **Ocena dobavljača**.

### Ocena dobavljača (A–D)

Ocena je poslovni sloj iznad KPI prijema. Ne menja status dobavljača i **nikad ne
blokira automatski**.

Ponderi:

| Kriterijum | Ponder | Izvor |
|---|---:|---|
| Kvalitet | 60% | Automatski iz PPM-a i udela odbijenih/uslovnih prijema |
| Isporuka | 20% | Ručni unos ili ERP (OTIF / rok i potpunost) |
| Dokumentacija | 10% | Ručni unos ili ERP (sertifikati, prijemnica, sledljivost) |
| Reakcija | 10% | Ručni unos ili ERP (vreme odgovora / zatvaranja 8D) |

Klase:

| Klasa | Opseg | Značenje |
|---|---|---|
| A | 90–100 | Odobren dobavljač |
| B | 75–89 | Uslovno odobren — pratiti trend |
| C | 60–74 | Potreban plan poboljšanja |
| D | ispod 60 | Predlog za blokadu ili ponovnu kvalifikaciju |

Postupak:

1. generiši izveštaj;
2. proveri automatski **Kvalitet (60%)**;
3. unesi **Isporuku**, **Dokumentaciju** i **Reakciju** (0–100);
4. upiši **Obrazloženje** (obavezno);
5. po potrebi označi **Odobreno**;
6. klikni **Sačuvaj ocenu u istoriju**.

Tooltipovi na kartici i KPI poljima objašnjavaju formulu i značenje klase. Unos i
odobrenje rade uloge **kvalitet / šef / admin**.

### Kako se računa ukupna ocena

Ukupna ocena je ponderisani zbir četiri skora, svaki u opsegu 0–100:

```text
Ukupno = Kvalitet × 0,60
       + Isporuka × 0,20
       + Dokumentacija × 0,10
       + Reakcija × 0,10
```

Rezultat je broj od 0 do 100. Na osnovu njega aplikacija dodeljuje klasu.

#### Kvalitet (60%) — automatski

Kvalitetni skor se računa iz podataka prijemne kontrole u izabranom periodu i ima
dva koraka.

**1. Osnovni skor iz PPM-a** (linearna interpolacija između tačaka):

| PPM | Skor |
|---:|---:|
| 0 – 500 | 100 |
| 1.000 | 95 |
| 2.500 | 90 |
| 5.000 | 80 |
| 10.000 | 70 |
| 25.000 | 50 |
| 50.000 | 25 |
| 100.000 i više | 0 |

**2. Penali za odluke o prijemu:**

```text
penal_odbijeno = min(30, (odbijeni prijemi / broj prijema) × 100 × 0,6)
penal_uslovno  = min(10, (uslovni prijemi / broj prijema) × 100 × 0,2)

Kvalitet = max(0, PPM_skor − penal_odbijeno − penal_uslovno)
```

Ako u periodu **nema kontrolisanih jedinica**, kvalitet se ne računa i ocena se ne
može sačuvati (ne dodeljuje se 0).

#### Isporuka, dokumentacija, reakcija — ručno / ERP

Ova tri skora aplikacija ne izvodi automatski. Unosi ih kvalitet ili nabavka (0–100),
ili stižu iz ERP-a. Predlog uzima 100 dok se ne izmene.

| Skor | Šta ocenjuje | Primer merila |
|---|---|---|
| Isporuka | Rok i potpunost isporuke | OTIF %, kašnjenja, delimične isporuke |
| Dokumentacija | Prateća dokumentacija | Sertifikati, prijemnica, sledljivost lota |
| Reakcija | Odziv na probleme | Vreme odgovora, brzina zatvaranja 8D/reklamacije |

### Šta znači koja klasa

| Klasa | Ukupno | Značenje | Preporučena akcija |
|---|---|---|---|
| **A** | 90–100 | Odobren dobavljač | Redovna kontrola |
| **B** | 75–89 | Uslovno odobren | Pratiti trend, upozorenje |
| **C** | 60–74 | Slab učinak | Plan poboljšanja, pojačana kontrola |
| **D** | ispod 60 | Kritičan | Predlog za blokadu ili ponovnu kvalifikaciju |

Klasa **D je samo predlog**. Aplikacija nikada ne blokira dobavljača automatski —
odluku donosi kvalitet/nabavka prema internom postupku.

#### Primer obračuna

```text
Period: 90 dana
PPM = 1.000            → osnovni skor 95
Prijema = 10, odbijeno = 1 (10%), uslovno = 1 (10%)
penal_odbijeno = min(30, 10 × 0,6) = 6
penal_uslovno  = min(10, 10 × 0,2) = 2
Kvalitet = 95 − 6 − 2 = 87

Isporuka = 90, Dokumentacija = 100, Reakcija = 80

Ukupno = 87 × 0,60 + 90 × 0,20 + 100 × 0,10 + 80 × 0,10
       = 52,2 + 18 + 10 + 8 = 88,2  →  Klasa B
```

### PDF

Klikni **PDF**.

PDF sadrži:

- zaglavlje i podatke dobavljača;
- KPI;
- predlog ocene / klasu;
- kvalitet po materijalu;
- Pareto;
- listu prijema;
- galeriju do 12 Foto NOK zapisa.

### Štampa

Klikni **Štampaj**. Ako se prozor ne otvori, dozvoli pop-up prozore za aplikaciju.

---

## 11. ERP unos prijemnih kontrola

Podržan je fajl:

```text
prijemna_kontrola.csv
```

Primer:

```csv
ErpKljuc,Datum,SifraDobavljaca,SifraMaterijala,SifraDela,BrojLota,BrojDokumenta,Primljeno,Kontrolisano,OkKolicina,NokKolicina,Defekt,Status,Napomena
PR-00451-10,2026-07-18,DOB-001,MAT-001,,LOT-0718-01,PR-00451,1000,100,98,2,Korozija,uslovno,Sortiranje 100%
```

`ErpKljuc` mora biti stabilan i jedinstven za stavku dokumenta. Ponovni uvoz istog
ključa ažurira postojeći zapis umesto pravljenja duplikata.

Redosled ERP mastera:

1. dobavljači;
2. materijali i delovi;
3. prijemna kontrola.

Fotografija NOK se u pravilu dodaje ručno u aplikaciji posle ERP uvoza.

---

## 12. Kontrola kvaliteta podataka

Pre završetka smene proveri:

- [ ] dobavljač je tačan;
- [ ] materijal ili ID dela je tačan;
- [ ] broj lota i prijemnice su uneseni;
- [ ] kontrolisano nije veće od primljenog;
- [ ] OK + NOK odgovara kontrolisanom;
- [ ] svaki NOK ima naziv defekta;
- [ ] za značajan NOK postoji jasna fotografija;
- [ ] status odgovara donetoj odluci;
- [ ] napomena sadrži uslovni prijem, sortiranje ili reklamaciju;
- [ ] izveštaj dobavljača prikazuje očekivani period.

---

## 13. Najčešće greške

### Ne vidi se tab Prijemna kontrola

Proveri:

- da si u **Modulu 1 — Atributivne** (ne u Šifrarniku);
- ulogu: **kontrolor**, **kvalitet**, **šef** ili **admin** (operator nema ovaj tab);
- u režimu linija: tab **PRIJEM** pored UNOS (na tabletu dugme **PRIJEM** u zaglavlju);
- u režimu analitika: grupa **Operativa → PRIJEM**.

### „Pokreni Ulaznu kontrolu“ ne radi / OK/NOK se ne vraćaju

- na prijemu mora postojati **ID deo**;
- pokreni migraciju `70_prijemna_veza_kontrolni_log.sql`;
- posle snimanja unosa koristi dugme **↻** na prijemu ako sync nije prošao.

### Poruka da tabela ili kolona ne postoji

Ponovo pokreni:

```text
69_dobavljaci_prijemna_kontrola.sql
```

Zatim osveži aplikaciju i proveri **Admin → Status šeme**.

### Dobavljač nije u izboru

- dodaj ga u **Osnovno → Dobavljači**;
- proveri da je status **Aktivan**;
- kod ERP unosa proveri da je `dobavljaci.csv` uspešno obrađen.

### Materijal nije u izboru

Materijal mora biti aktivan i povezan sa izabranom `SifraDobavljaca`.

### Ne može da sačuva količine

Proveri:

```text
kontrolisano ≤ primljeno
OK + NOK ≤ kontrolisano
```

### PPM izgleda previsoko

PPM koristi kontrolisani uzorak kao imenilac. Dva NOK u uzorku od 100 daju 20.000 PPM,
čak i kada je primljeno 10.000 komada.

### Foto NOK se ne čuva

- pokreni najnoviju migraciju 69;
- koristi JPG ili PNG;
- napravi manju ili bližu fotografiju;
- proveri da se pregled slike vidi pre klika na Sačuvaj.

### Fotografija se vidi u tabeli, ali ne u starom PDF-u

Ponovo generiši izveštaj. PDF se pravi iz trenutno učitanih podataka i ne ažurira već
preuzetu datoteku.

---

## 14. Preporučeni operativni postupak

```text
Magacin evidentira prijem i dokument
        ↓
Kvalitet bira dobavljača, materijal/deo i lot
        ↓
Kontrolor pregleda uzorak
        ↓
Unosi Kontrolisano, OK i NOK
        ↓
Ako ima NOK: defekt + fotografija + komentar
        ↓
Odgovorna osoba bira status
        ↓
Sačuvaj
        ↓
Modul 2 → Dobavljači → Generiši
        ↓
Analiza PPM / Pareto / odluka o akciji
```

Za ponavljajuće ili kritične NOK rezultate pokreni reklamaciju dobavljaču, 8D ili
internu korektivnu meru prema važećem QMS postupku firme.
