# SOP — ERP uvoz, izvoz i povezivanje podataka u SPC aplikaciji

Ovo je operativno uputstvo za SAP/Pantheon ERP razmenu sa SPC aplikacijom. Objašnjava:

- kako se bira **šta se uvozi**;
- kako se radi probni i pravi uvoz;
- gde se svaki podatak smešta u Šifrarniku i bazi;
- kako se povezuju kupac, vozilo, delovi, BOM, operacije, crteži, karakteristike, plan kontrole, PFMEA i radni nalozi;
- kako se bira **šta se izvozi** iz SPC-a prema ERP-u;
- kako se proverava da je ceo tok ispravan.

Primeri koriste SAP nazive, ali isti postupak važi za Pantheon izborom odgovarajućeg preseta.

---

## 1. Najkraći pregled toka

```text
ERP
 ├─ kupci / dobavljači / organizacija
 ├─ tipovi vozila
 ├─ delovi + sastavnica (BOM)
 ├─ operacije + mašine + radni centri
 ├─ crteži + merila + kalibracije
 ├─ karakteristike + Control Plan + PFMEA
 └─ radni nalozi + lotovi + serijski brojevi
             │
             ▼
       SPC ERP uvoz
             │
             ├─ Šifrarnik i QMS tabele
             ├─ Glavni unos po SifraVozila
             └─ Modul 1 / Modul 2
             │
             ▼
 SPC → ERP izlaz kvaliteta
 Karakteristike.csv + KontrolniPlan.csv + PFMEA.csv
```

Najvažnija pravila:

1. ERP šifra je trajni ključ. Naziv nije zamena za šifru.
2. Prvo se uvoze masteri, zatim veze i dokumenti, a radni nalozi/lotovi posle delova.
3. Za izbor šta se uvozi dovoljno je izabrati ili ostaviti samo odgovarajuće fajlove.
4. Ponovni uvoz ažurira postojeći zapis sa istim ključem; ne treba menjati šifre.
5. Deo se vezuje za familiju vozila poljem `SifraVozila`.
6. BOM vezuje roditeljski i podređeni deo, ali **ne zamenjuje** `SifraVozila`.
7. ERP redovi ulaze u Glavni unos samo ako je ERP šifra vozila vezana za neki sheet.

---

## 2. Preduslovi

Pre prvog uvoza administrator proverava:

1. U Supabase su primenjene migracije:
   - `67_erp_master_podaci.sql`
   - `68_erp_glavni_unos_sheetovi.sql`
2. U aplikaciji: **Admin → Provera šeme → ERP master podaci v2** nema greške.
3. Za server uvoz postoje:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Aktivni ERP preset je `sap` ili `pantheon`.
5. ERP fajlovi imaju zaglavlje i stabilne poslovne šifre.

Podržani formati:

- `.csv`, `.xlsx`, `.xls`;
- UTF-8, Windows-1250, ISO-8859-2 i Windows-1252;
- separator zarez, tačka-zarez ili TAB;
- numerisana i obična imena, npr. `04_Delovi.xlsx` ili `delovi.csv`;
- kod Excel fajla prvi sheet predstavlja jedan ERP entitet.

Jedan fajl treba da predstavlja jedan entitet. Nemoj stavljati kupce, delove i RN u isti sheet.

---

## 3. Kako biram šta želim da uvezem

Postoje tri načina.

### 3.1 Ručni upload u aplikaciji — preporuka za probu i pojedinačan uvoz

Put:

**Modul 0 — Šifrarnik → Alati → ERP uvoz**

Postupak:

1. U delu **ERP sistem (preset)** izaberi:
   - **SAP** za SAP kolone poput `MATNR`, `AUFNR`, `KUNNR`, `ARBPL`;
   - **Pantheon** za Pantheon nazive poput `Ident`, `Sifra`, `RN`, `Partner`.
2. Pogledaj listu **Očekivani fajlovi**. Zelena tačka znači da je entitet uključen.
3. Izaberi **Upload CSV**.
4. Klikni **Izaberi CSV**.
5. Izaberi samo fajlove koje sada želiš da uvezeš. Možeš izabrati jedan ili više fajlova.
6. Aplikacija spaja fajl sa entitetom po nazivu.
7. Proveri preview:
   - `✓ fajl → entitet`;
   - broj validnih/ukupnih redova;
   - detektovani encoding;
   - prve greške i upozorenja;
   - listu **Nespojeni** ako naziv fajla nije prepoznat.
8. Klikni **Preview (dry-run)**. Dry-run ne piše u bazu.
9. Tek kada je rezultat ispravan klikni **Uvezi u bazu**.
10. Proveri karticu **Rezultat** i **Istorija uvoza**.

Primeri izbora:

- samo novi kupci: izaberi samo `01_Kupci.csv`;
- samo delovi: izaberi samo `04_Delovi.csv`;
- deo sa kompletnom kontrolom: izaberi `04_Delovi`, `05_Crtezi`, `10_Operacije`,
  `karakteristike_merljive`, `KontrolniPlan`, `PFMEA` i `18_RadniNalozi`;
- celo vozilo i svi njegovi delovi: izaberi `03_TipoviVozila`, `04_Delovi`,
  `06_Sastavnica` i ostale zavisne fajlove.

Fajl koji nije izabran dobija status „nema fajla” i ne menja tu tabelu.

### 3.2 Server trigger — uvoz fajlova iz foldera

Put:

**Modul 0 → Alati → ERP uvoz → Server trigger**

Na firm serveru prvo radi:

```powershell
npm run erp:api
```

U aplikaciji:

1. Unesi API URL, obično `http://127.0.0.1:3921`.
2. Unesi `ERP_API_KEY` ako je podešen.
3. Klikni **Test konekcije**.
4. Klikni **Preview**.
5. Ako je pregled dobar, klikni **Osveži iz foldera**.

Ovaj režim čita fajlove iz `erp-drop/incoming/`.

### 3.3 Automatski dnevni uvoz

ERP/IT ostavlja fajlove u:

```text
erp-drop/incoming/
```

Task Scheduler u 06:00 pokreće:

```powershell
npm run import:erp-dnevni
```

Ručna provera bez upisa:

```powershell
npm run import:erp-dnevni:dry
```

Za uvoz samo jednog entiteta:

```powershell
node scripts/erp-dnevni-uvoz.mjs --entitet delovi
node scripts/erp-dnevni-uvoz.mjs --entitet radni_nalozi
```

Za Pantheon bez menjanja trajne konfiguracije:

```powershell
node scripts/erp-dnevni-uvoz.mjs --preset pantheon --dry-run
```

### 3.4 Trajno uključivanje ili isključivanje entiteta

U `config/erp/erp-uvoz.config.json` svaki entitet ima `ukljuceno`.

Primer — privremeno ne uvozi mašine i radnike:

```json
{
  "entiteti": {
    "masine": { "ukljuceno": false },
    "radnici": { "ukljuceno": false }
  }
}
```

Podrazumevano su isključeni:

- `smene`;
- `radnici`;
- `barkod_profili`;
- `pogon_linija_mapa`.

Uključi ih tek kada ERP stvarno šalje pouzdane podatke. Radnici se ne povezuju automatski
sa Supabase Auth nalogom, PIN-om i aplikacionom ulogom.

---

## 4. Preporučeni redosled kompletnog paketa

Aplikacija obrađuje fajlove u ovom redosledu radi zavisnosti:

1. `01_Kupci`
2. `02_Dobavljaci`
3. `12_Smene` — opciono
4. `07_Linije`
5. `08_RadniCentri`
6. `09_Masine`
7. `03_TipoviVozila`
8. `pogon_linija_mapa` — opciono
9. `13_Materijali`
10. `04_Delovi`
11. `05_Crtezi`
12. `06_Sastavnica`
13. `10_Operacije`
14. `greske_katalog`
15. `16_Merila`
16. `17_Kalibracija`
17. `karakteristike_merljive` (SAP/Pantheon ulaz; tipično `KarakteristikeMerljive.csv`)
18. `KontrolniPlan`
19. `PFMEA`
20. `barkod_profili` — opciono
21. `11_Operateri` — opciono
22. `14_Skladista`
23. `15_Lokacije`
24. `18_RadniNalozi`
25. `19_Serije`
26. `20_SerijskiBrojevi`

Kada se svi fajlovi izaberu odjednom, aplikacija sama poštuje ovaj redosled bez obzira
kojim redom su fajlovi označeni u dijalogu.

---

## 5. Gde se šta smešta i gde se vidi

### 5.1 Osnovni i organizacioni masteri

| ERP fajl / entitet | Ključ povezivanja | Tabela | Gde se proverava u aplikaciji |
|---|---|---|---|
| Kupci | `SifraKupca` | `kupci` | Šifrarnik → Osnovno → Kupci |
| Dobavljači | `SifraDobavljaca` | `dobavljaci` | ERP master u bazi; koristi ga Materijali |
| Linije | `SifraLinije` | `linije` | Šifrarnik → Osnovno → Linije |
| Radni centri | `SifraRadnogCentra` | `radni_centri` | ERP master u bazi; veza Linija → Centar → Operacija |
| Mašine | `SifraMasine` | `masine` | Šifrarnik → Osnovno → Mašine |
| Smene | `SifraSmene` | `smene` | Šifrarnik → Osnovno → Smene |
| Radnici | `BrojZaposlenog` | `radnici` | korisnički/radnički master; podrazumevano isključen |
| Pogon ↔ linija | `linija_faza` | `pogon_linija_mapa` | Šifrarnik → Osnovno → Pogon mapa |

Neki v2 masteri još nemaju poseban tab za ručno uređivanje. To ne znači da nisu uvezeni:
vide se kroz zavisne procese, monitoring ili direktnu administrativnu proveru baze.

### 5.2 Vozilo, delovi i proizvodna struktura

| ERP fajl / entitet | Ključ povezivanja | Tabela | Gde se proverava |
|---|---|---|---|
| Tipovi vozila | `SifraVozila` → `kod` | `tipovi_vozila` | Šifrarnik → Celo vozilo → Tipovi vozila |
| Delovi | `SifraDela` → `id_deo` | `delovi` | Šifrarnik → Osnovno → Delovi |
| Sastavnica/BOM | roditelj + komponenta + revizija | `sastavnica` | ERP proizvodna struktura u bazi |
| Materijali | `SifraMaterijala` | `materijali` | ERP master u bazi; veza na deo/dobavljača |
| Crteži | deo + revizija | `crtez_assets` | Šifrarnik → Atributivne → Crtež dela / prikaz crteža |
| Operacije | deo + `SifraOperacije` | `operacije` | koristi se u karakteristikama, CP/PFMEA i proizvodnom toku |

Na redu dela najvažnije veze su:

- `id_deo` — šifra dela koju operater skenira;
- `sifra_vozila` — familija/model kome deo pripada;
- `sifra_materijala` — ulazni materijal;
- `broj_crteza` i `revizija` — dokumentacija;
- `tip_kontrole` — `deo` ili `vozilo`;
- `vozilo_katalog_id` — katalog/dijagram celog vozila;
- `aktivan` — da li je deo dostupan za rad.

### 5.3 Kvalitet

| ERP fajl / entitet | Ključ povezivanja | Tabela | Gde se proverava |
|---|---|---|---|
| Katalog grešaka | kategorija + podkategorija + defekt | `greske_katalog` | Šifrarnik → Atributivne → Katalog grešaka |
| Merila | ERP šifra, serijski broj ili naziv | `merila` | Šifrarnik → Merljive → Merila / kalibracija |
| Kalibracije | merilo + datum kalibracije | `kalibracije` | Šifrarnik → Merljive → Merila / kalibracija |
| Karakteristike | deo + pogon + šifra merenja + pozicija | `karakteristike_merljive` | Šifrarnik → Merljive → Dimenzije |
| Control Plan | stabilni `erp_kljuc` | `pfmea_cp_dokumenti` + `control_plan_stavke` | Modul 2 → PFMEA / Control Plan |
| PFMEA | stabilni `erp_kljuc` | `pfmea_cp_dokumenti` + `pfmea_stavke` | Modul 2 → PFMEA / Control Plan |

Control Plan i PFMEA se grupišu po `SifraDela + Revizija`. Aplikacija pravi dokument:

- `ERP Control Plan`;
- `ERP PFMEA`.

Uvoz dokumenta ne znači automatsko odobrenje. Kvalitet mora pregledati reviziju i stavke.

### 5.4 Nalozi i sledljivost

| ERP fajl / entitet | Ključ povezivanja | Tabela | Gde se proverava |
|---|---|---|---|
| Skladišta | `SifraSkladista` | `skladista` | ERP/QMS sledljivost u bazi |
| Lokacije | skladište + lokacija | `lokacije` | ERP/QMS sledljivost u bazi |
| Radni nalozi | `BrojRadnogNaloga` | `radni_nalozi` | Šifrarnik → Osnovno → Radni nalozi |
| Serije/lotovi | deo + broj serije | `serije` | sledljivost kontrole/NCR |
| Serijski brojevi | `SerijskiBroj` | `serijski_brojevi` | sledljivost proizvoda |
| Barkod profili | deo + format | `barkod_profili` | Šifrarnik → Alati → Barkod |

SPC ne vodi ERP stanje zaliha. Skladišta i lokacije služe za sledljivost, HOLD i karantin.

---

## 6. Kako se povezuje jedno celo vozilo i svi njegovi delovi

Koristi sledeći model:

```text
Tip vozila TV4X4
  kod = TV4X4
        │
        ├─ FINAL-TV4X4   (tip_kontrole=vozilo)
        ├─ RTB-001       (tip_kontrole=deo)
        ├─ NOSAC-002     (tip_kontrole=deo)
        └─ REZERVOAR-003 (tip_kontrole=deo)

Sva četiri reda u delovi imaju sifra_vozila = TV4X4.
BOM dodatno kaže koji je roditelj i koje su komponente.
```

### Korak 1 — tip vozila

U `03_TipoviVozila.csv` pošalji najmanje:

```csv
SifraVozila,NazivVozila
TV4X4,Terensko vozilo 4x4
```

Rezultat: `tipovi_vozila.kod = TV4X4`.

### Korak 2 — glavni zapis celog vozila

Ako se samo kontroliše komponenta, `TipKontrole` treba da bude `deo`.

Ako red predstavlja kompletno vozilo koje na liniji otvara dijagram i zone:

```csv
SifraDela,NazivDela,SifraVozila,tip_kontrole,product_group
FINAL-TV4X4,Kompletno vozilo TV4X4,TV4X4,vozilo,TV4X4
```

Važno:

- `tip_kontrole=vozilo` uključuje režim celog vozila;
- `product_group=TV4X4` se mapira i na `vozilo_katalog_id`;
- `vozilo_katalog_id` treba da bude isti kao kod u `tipovi_vozila`;
- dijagram i katalog zona proveri/dopuni u
  **Šifrarnik → Celo vozilo → Tipovi vozila / Defekti vozila**.

Za obične komponente:

```csv
SifraDela,NazivDela,SifraVozila,tip_kontrole
RTB-001,Nosač rezervoara,TV4X4,deo
NOSAC-002,Nosač levi,TV4X4,deo
```

### Korak 3 — BOM/sastavnica

U `06_Sastavnica.csv`:

```csv
NadredjeniDeo,PodredjeniDeo,Kolicina,JedinicaMere,Revizija
FINAL-TV4X4,RTB-001,2,kom,A
FINAL-TV4X4,NOSAC-002,1,kom,A
```

Oba dela moraju već postojati u `delovi`.

BOM daje strukturu roditelj → komponenta. Za prikaz u Glavnom unosu svaki deo i dalje
treba da ima `SifraVozila=TV4X4`.

#### Zašto BOM sam ne raspoređuje delove po sheetovima

BOM i sheet odgovaraju na različita pitanja:

| | BOM (sastavnica) | Sheet Glavnog unosa |
|---|---|---|
| Pitanje | *Od čega se sastoji ovaj deo?* | *Kom vozilu/familiji ovaj deo pripada za kontrolu?* |
| Tip veze | graf roditelj → komponenta | jedna klasifikacija po delu |
| Primer | `FINAL-TV4X4 → RTB-001` (količina 2) | `RTB-001` ide u sheet `vozilo1` jer je `SifraVozila=TV4X4` |

Zato aplikacija **ne** izvodi sheet iz BOM-a. Razlozi:

1. **Isti deo ulazi u više sklopova i više vozila.** Zavrtanj ili nosač može biti u desetinama BOM-ova. Sheet mora imati jedan jasan odgovor, a ne nagađati između svih roditelja.
2. **BOM je višeslojan.** Od `ZAVRTANJ-M8` do vozila može biti više nivoa (`podsklop → sklop → FINAL`). Nije univerzalno koji nivo je „vozilo”, pa bi traversal grafa bio dvosmislen.
3. **Mnogo delova nije u BOM-u.** Ulazna kontrola, kupovne komponente i sirovine često nemaju roditelja — a i dalje se kontrolišu. `SifraVozila` radi i bez sastavnice.
4. **BOM se menja po reviziji.** Ako bi raspored zavisio od strukture, deo bi „skakao” između sheetova pri svakoj izmeni sklopa, iako je za kontrolu i dalje isto vozilo.
5. **Jedan deo — više vozila istovremeno.** Deo može fizički ići i na `TV4X4` i na `NTV`. Za liniju treba primarna klasifikacija na samom delu, ne izvedena iz grafa.

Uloga polja:

- **`SifraVozila`** — kom sheetu deo pripada (kontrola / Glavni unos);
- **BOM** — kako je vozilo/sklop sastavljen (struktura, količine, sledljivost).

Nisu „ili/ili”: koriste se zajedno. BOM ne zamenjuje `SifraVozila`.

### Korak 4 — veži vozilo za sheet Glavnog unosa

Put:

**Modul 0 → Osnovno → Glavni unos**

1. Klikni **+ / Veži sheet**.
2. Unesi postojeći ili novi naziv, npr. `vozilo1`.
3. Unesi tačnu ERP šifru, npr. `TV4X4`.
4. Sačuvaj.
5. Na tabu treba da piše `vozilo1 · TV4X4`.

Jedna ERP šifra vozila može biti vezana samo za jedan aktivni sheet.

Automatsko raspoređivanje radi ovako:

```text
delovi.sifra_vozila
        ↓
glavni_unos_sheetovi.sifra_vozila
        ↓
glavni_unos_redovi.sheet_naziv
```

Primer: karakteristike dela `RTB-001`, čiji je `SifraVozila=TV4X4`, ulaze u
`vozilo1` ako je `vozilo1 → TV4X4`.

Ako rezultat uvoza kaže:

```text
SifraVozila NTV nema dodeljen sheet u Glavnom unosu
```

podaci jesu u Šifrarniku/karakteristikama, ali nisu materijalizovani u Glavni unos.
Veži sheet i ponovi uvoz relevantnog dela/karakteristika.

### Korak 5 — karakteristike, operacije i merila

Svaka karakteristika treba da nosi:

- `SifraDela`;
- stabilnu `SifraKarakteristike` ili šifru merenja;
- `SifraOperacije`;
- pogon/fazu;
- nominalu, LSL, USL i jedinicu za merljivu karakteristiku;
- `SifraMerila` kada je merilo propisano;
- oznaku kritičnosti kada postoji.

Veza je:

```text
deo → operacija → karakteristika → merilo
```

Posle uvoza karakteristika automatski se pravi ERP red u Glavnom unosu. Ručni redovi
u Glavnom unosu ostaju netaknuti. Ako se delu promeni `SifraVozila`, ERP redovi se pri
sledećem sync-u premeštaju na novi sheet.

### Korak 6 — Control Plan i PFMEA

Oba dokumenta treba da koriste iste:

- `SifraDela`;
- `Revizija`;
- `SifraOperacije`;
- `SifraKarakteristike` gde je primenljivo.

Tako se ista operacija i karakteristika mogu pratiti kroz:

```text
crtež → operacija → karakteristika → Control Plan → PFMEA
```

### Korak 7 — radni nalog, lot i serijski broj

RN mora da referencira postojeći `SifraDela`. Zatim lot referencira deo, a serijski broj
može referencirati deo i lot:

```text
SifraDela
 ├─ BrojRadnogNaloga
 └─ BrojSerije
      └─ SerijskiBroj
```

Ne uvozi RN pre dela, niti serijski broj pre odgovarajućeg dela/serije.

---

## 7. Kako se povezuje običan deo

Za jednu komponentu bez kompletnog vozila preporučeni paket je:

1. `04_Delovi.csv`
2. `05_Crtezi.csv`
3. `10_Operacije.csv`
4. `greske_katalog.csv`
5. `16_Merila.csv`
6. `17_Kalibracija.csv`
7. `karakteristike_merljive.csv` ili drugi ulazni naziv prikazan u aktivnom presetu
8. `KontrolniPlan.csv`
9. `PFMEA.csv`
10. `18_RadniNalozi.csv`

Obavezan minimum za deo:

```csv
SifraDela,NazivDela,SifraVozila,TipKontrole,Status
RTB-001,Nosač rezervoara,TV4X4,deo,aktivan
```

Provera posle uvoza:

1. **Osnovno → Delovi**: ID, naziv, aktivan, tip `deo`.
2. **Atributivne → Katalog grešaka**: defekti za taj ID/pogon.
3. **Atributivne → Crtež dela**: crtež/revizija.
4. **Merljive → Dimenzije**: pozicije, nominale i tolerancije.
5. **Merljive → Merila / kalibracija**: propisano merilo je aktivno i kalibrisano.
6. **Osnovno → Radni nalozi**: aktivan RN za isti ID.
7. **Glavni unos**: deo se nalazi u sheetu njegove `SifraVozila`.
8. **Modul 1**: sken ID-a otvara tačan deo, pogon, RN, crtež i karakteristike.

---

## 8. Šta se dešava pri ponovnom uvozu

Uvoz koristi upsert:

- novi poslovni ključ → novi zapis;
- postojeći poslovni ključ → ažuriranje postojećeg zapisa;
- isti ključ dva puta u istom fajlu → poslednji red važi i dobija se upozorenje;
- nepostojeća obavezna referenca → odbija se samo loš red;
- prazan ulazni fajl → ne briše celu tabelu;
- izostavljen fajl → ne menja taj entitet;
- nestanak reda iz sledećeg dnevnog fajla → sam po sebi ne briše stari zapis;
- `LVORM/LOEVM = X` ili odgovarajući neaktivan status → deaktivacija zapisa.

Za delove, kupce i RN prazna ERP polja uglavnom ne brišu postojeće korisne vrednosti.
Na delu se čuvaju ručno održavana polja kao što su slika, karakteristika, linija/mašina
i broj komada za kontrolu kada ERP ne pošalje novu vrednost.

Audit:

- svaki pravi paket dobija `batch_id`;
- sažetak je u `erp_uvoz_batch`;
- odbijeni redovi i razlozi su u `erp_uvoz_reject`;
- kratka istorija je u aplikaciji u panelu ERP uvoza;
- server log je `logs/erp-uvoz.log`.

Kod server uvoza uspešno obrađeni fajlovi prelaze u:

```text
erp-drop/processed/YYYY-MM-DD/
```

Upload iz browsera ne koristi lokalni `processed` folder korisnikovog računara.

Važna operativna ograničenja uvoza:

- uvoz **nije jedna transakcija** za ceo paket; ako kasniji entitet padne, raniji ostaju upisani;
- dry-run proverava format i mapiranje, ali **ne proverava** sve DB reference, RLS i unique ograničenja kao pravi upis;
- fajl sa delimično validnim redovima može dobiti status `ok` i biti arhiviran; odbijeni redovi ostaju u `erp_uvoz_reject`;
- `upsertovano` ne razlikuje „novi zapis” i „ažuriran postojeći”;
- Control Plan/PFMEA ažuriraju isti `erp_kljuc`, ali ne brišu stare stavke koje su nestale iz novog ERP fajla;
- crteži, karakteristike i neke šifre operacija/merila su tekstualne veze — neke se ne proveravaju strogo kao RN/BOM.

---

## 9. Kako biram šta želim da izvezem iz SPC-a u ERP

Postoje dva različita izvoza i ne treba ih mešati.

### 9.1 Backup Šifrarnika

Put:

**Modul 0 → Alati → Backup → Preuzmi backup Excel**

Rezultat je `SPC_sifrarnik_backup_DATUM.xlsx`. To je arhivska/migraciona kopija,
a ne standardni dnevni ERP interfejs.

### 9.2 Standardni ERP izvoz kvaliteta

Standardni izlaz trenutno uvek ima tri skupa:

1. `Karakteristike.csv`
2. `KontrolniPlan.csv`
3. `PFMEA.csv`

Odredište:

```text
erp-drop/outgoing/
```

Važno: u aplikaciji trenutno ne postoji ekran sa checkbox izborom pojedinačnih izlaznih
fajlova. Skripta pravi sva tri fajla zajedno. Može se birati:

- svi delovi;
- samo jedna `SifraDela`;
- drugi izlazni folder;
- dry-run bez pisanja.

### 9.3 Ručni izvoz svih delova

Pravi ručni izvoz takođe poštuje Auto pravilo **ERP dnevni izvoz kvaliteta**.
Ako je pravilo isključeno, dry-run će prikazati broj redova, ali pravi izvoz neće pisati
fajlove dok administrator ne uključi i sačuva pravilo.

Prvo pregled broja redova:

```powershell
npm run erp:izvoz:dry
```

Pravi izvoz:

```powershell
npm run erp:izvoz
```

### 9.4 Izvoz samo jednog dela

```powershell
node scripts/erp-izvoz-kvalitet.mjs --deo RTB-001 --dry-run
node scripts/erp-izvoz-kvalitet.mjs --deo RTB-001
```

I dalje nastaju sva tri fajla, ali sadrže samo redove za `RTB-001`.

**Rizik:** `--deo` u podrazumevanom `outgoing/` **prepisuje** kompletan dnevni paket
fajlovima samo jednog dela. Za probu jednog dela uvek koristi privremeni folder:

```powershell
node scripts/erp-izvoz-kvalitet.mjs --deo RTB-001 --out C:\ERP\SPC-proba
```

### 9.5 Izvoz u drugi folder

```powershell
node scripts/erp-izvoz-kvalitet.mjs --out C:\ERP\SPC-ulaz
node scripts/erp-izvoz-kvalitet.mjs --deo RTB-001 --out C:\ERP\SPC-ulaz
```

### 9.6 Automatski izvoz

U **Admin → Auto pravila** uključi:

**ERP dnevni izvoz kvaliteta (outgoing, 06:15)**

Zatim klikni **Sačuvaj pravila**.

Windows task `SPC-ERP-Quality-Izvoz` u 06:15 generiše nova tri fajla. Upis je atomski:
ERP ne treba da pročita polovično napisan CSV.

Ako isključiš Auto pravilo, scheduler ostaje instaliran, ali skripta izlazi bez pisanja
fajlova. Admin status može i dalje prikazivati stari uspešan run — provera mora biti
i timestamp fajlova u `outgoing/`.

Log:

```text
logs/erp-izvoz-kvalitet.log
```

### 9.7 Šta tačno izlazi

`Karakteristike.csv` sadrži:

- šifru karakteristike;
- šifru dela i reviziju;
- operaciju;
- naziv i tip karakteristike;
- nominalu, LSL, USL i jedinicu;
- šifru merila;
- oznaku kritične karakteristike.

`KontrolniPlan.csv` sadrži:

- deo i reviziju;
- operaciju i karakteristiku;
- veličinu uzorka i učestalost;
- reakcioni plan;
- odgovorno lice.

`PFMEA.csv` sadrži:

- deo i operaciju;
- način, posledicu i uzrok otkaza;
- preventivnu i detekcionu kontrolu;
- S, O, D i AP.

Napomene o sadržaju:

- format je UTF-8 sa BOM, separator zarez, CRLF;
- fajlovi se prepisuju pri svakom run-u i nemaju timestamp u imenu;
- PFMEA izvoz trenutno **ne šalje** reviziju dokumenta;
- dry-run „OK” nije dokaz da su fajlovi fizički napisani;
- proveri LSL/USL i broj redova pre nego što ERP preuzme paket.

`outgoing/` je samo predajni folder. SPC ne šalje fajlove ERP-u i ne potvrđuje prijem.
ERP/IT mora spolja organizovati preuzimanje. Ako ERP nije preuzeo prethodni paket pre
06:15, novi run ga prepisuje.

Ova tri izlazna fajla su SPC → ERP ugovor. Nemoj ih automatski vraćati u isti
`erp-drop/incoming/` bez dogovorene petlje, jer može nastati nepotreban kružni sync.

---

## 10. Kompletan primer — novo vozilo sa jednim delom

Za familiju `TV4X4` i deo `RTB-001`:

1. Uvezi `03_TipoviVozila.csv`:
   - `SifraVozila=TV4X4`.
2. Uvezi `04_Delovi.csv`:
   - `SifraDela=RTB-001`;
   - `SifraVozila=TV4X4`;
   - `TipKontrole=deo`.
3. Po potrebi uvezi komplet `FINAL-TV4X4` sa `TipKontrole=vozilo`.
4. Uvezi BOM `FINAL-TV4X4 → RTB-001`.
5. Uvezi operacije za `RTB-001`.
6. Uvezi crtež revizije.
7. Uvezi merila, pa kalibracije.
8. Uvezi karakteristike sa istim `SifraDela`, operacijom i merilom.
9. Uvezi Control Plan i PFMEA.
10. Uvezi RN, zatim lot/serijski broj.
11. U Glavnom unosu veži `vozilo1 → TV4X4`.
12. Ponovi relevantni uvoz ako je veza napravljena tek posle prvog paketa.
13. Proveri `RTB-001` na tabu `vozilo1`.
14. Skeniraj `RTB-001` u Modulu 1 i proveri crtež, RN, pogon i dimenzije.
15. Pokreni:

```powershell
node scripts/erp-izvoz-kvalitet.mjs --deo RTB-001 --dry-run
```

16. Ako su brojevi redova dobri, pokreni pravi izvoz.

---

## 11. Dnevna kontrolna lista administratora

Pre uvoza:

- [ ] ERP je završio pisanje svih fajlova.
- [ ] Imena fajlova odgovaraju SAP/Pantheon presetu.
- [ ] Izabran je pravi preset.
- [ ] Novi masteri su u paketu pre zavisnih redova.
- [ ] Za novo vozilo postoji `SifraVozila`.
- [ ] Svaki deo vozila nosi istu `SifraVozila`.
- [ ] Svaki RN referencira postojeći deo.

Tokom uvoza:

- [ ] Prvo je pokrenut dry-run.
- [ ] Nema nespojenih fajlova.
- [ ] Broj validnih redova je očekivan.
- [ ] Greške referenci su rešene ili dokumentovane.

Posle uvoza:

- [ ] Rezultat nema crveni status.
- [ ] Delovi su u Šifrarniku.
- [ ] Vozilo ima ispravan tip i dijagram.
- [ ] Glavni unos sheet je vezan za tačnu `SifraVozila`.
- [ ] Karakteristike su u odgovarajućem sheetu.
- [ ] Control Plan i PFMEA imaju tačan deo/reviziju.
- [ ] RN i sledljivost pokazuju pravi deo.
- [ ] Probni sken u Modulu 1 radi.

Pre izvoza:

- [ ] PFMEA/Control Plan su pregledani.
- [ ] Dry-run prikazuje očekivane brojeve redova.
- [ ] Posle pravog izvoza timestamp fajlova u `outgoing/` je nov.
- [ ] LSL/USL i broj redova izgledaju ispravno.
- [ ] ERP zna da preuzima fajlove iz `outgoing` pre sledećeg 06:15.
- [ ] Ručni `--deo` nije pisan u produkcioni `outgoing/` bez `--out`.
- [ ] Nema procesa koji vraća izlaz direktno u `incoming`.

---

## 12. Najčešće greške i rešenje

### Fajl je „Nespojen”

Uzrok: ime fajla ne odgovara presetu.

Rešenje: koristi očekivani ili alternativni naziv prikazan u ERP panelu, npr.
`04_Delovi.xlsx`, `delovi.csv` ili naziv definisan u configu.

### RN red je odbijen

Uzrok: `SifraDela` ne postoji.

Rešenje: prvo uvezi `Delovi`, zatim ponovi `RadniNalozi`.

### Deo postoji, ali ga nema u Glavnom unosu

Mogući uzroci:

- nema karakteristika;
- `delovi.sifra_vozila` je prazno;
- ta `SifraVozila` nije vezana ni za jedan sheet;
- nije primenjena migracija 68.

### Deo je u pogrešnom sheetu

Uzrok: pogrešna `SifraVozila` na delu ili pogrešna veza sheeta.

Rešenje: ispravi šifru/vezu i ponovi uvoz. ERP redovi se prematerijalizuju na pravi sheet.

### Celo vozilo se otvara kao običan deo

Uzrok: `tip_kontrole` nije `vozilo` ili `vozilo_katalog_id` ne odgovara kodu tipa.

Rešenje: uskladi oba polja i proveri dijagram u **Celo vozilo → Tipovi vozila**.

### BOM postoji, ali komponenta nije grupisana pod vozilom

Uzrok: BOM i grupisanje u sheet **nisu ista veza**. BOM kaže šta ulazi u šta;
sheet se bira po `SifraVozila` na samom delu.

Rešenje: na komponentu dodaj `SifraVozila` (npr. `TV4X4`), veži sheet
(`vozilo1 → TV4X4`) i po potrebi ponovi uvoz karakteristika. BOM ostaje za
roditelj–komponenta strukturu — vidi §6 „Zašto BOM sam ne raspoređuje…”.

### Nema NOK grešaka na unosu

Uzrok: `greske_katalog` nema red za taj `id_deo`/pogon ili kategoriju vozila.

Rešenje: proveri **Atributivne → Katalog grešaka** ili **Celo vozilo → Defekti vozila**.

### Karakteristika nema merilo

Uzrok: pogrešna `SifraMerila` ili merilo nije prethodno uvezeno.

Rešenje: prvo `Merila`, zatim `Kalibracija`, pa karakteristike.

### Izvoz ne pravi fajlove

Proveri:

- Auto pravilo `ERP dnevni izvoz kvaliteta`;
- Supabase env promenljive;
- `logs/erp-izvoz-kvalitet.log`;
- dozvole pisanja u `erp-drop/outgoing/`;
- da li je pokrenut `--dry-run`, koji namerno ne piše fajlove.

---

## 13. Važne putanje i komande

```text
config/erp/erp-uvoz.config.json       aktivni preset i uključeni entiteti
config/erp/presets/sap.json           SAP imena/kolone i mapiranje
config/erp/presets/pantheon.json      Pantheon imena/kolone i mapiranje
erp-drop/incoming/                    ERP → SPC ulaz
erp-drop/processed/YYYY-MM-DD/        arhiva obrađenih ulaza
erp-drop/outgoing/                    SPC → ERP izlaz kvaliteta
erp-drop/examples/                    primeri, ne produkcioni podaci
logs/erp-uvoz.log                     log server uvoza
logs/erp-izvoz-kvalitet.log           log ERP izvoza
```

```powershell
npm run import:erp-dnevni:dry         # proba uvoza
npm run import:erp-dnevni             # pravi uvoz
npm run erp:izvoz:dry                 # proba izvoza sva tri fajla
npm run erp:izvoz                     # pravi izvoz sva tri fajla
npm run erp:cleanup                   # pregled stare processed arhive
npm run erp:cleanup:apply             # bezbedno retention čišćenje
```

---

## 14. Povezana uputstva

- `UPUTSTVO_ERP_MASTER_V2.md` — tehnički ugovor svih ERP mastera.
- `UPUTSTVO_ERP_KONFIGURACIJA.md` — prilagođavanje preset/config mapiranja.
- `UPUTSTVO_SAP_ERP_DROP.md` — pravila za SAP/IT drop folder.
- `UPUTSTVO_ERP_RADNI_NALOZI.md` — detaljno mapiranje RN.
- `UPUTSTVO_NOVO_VOZILO_SIFARNIK.md` — dijagram, zone i završna kontrola vozila.
- `UPUTSTVO_NOVI_DEO_SIFARNIK.md` — ručni postupak za komponentu.
- `UPUTSTVO_GLAVNI_UNOS.md` — sheetovi i propagacija.

---

*SPC Web — SOP ERP razmena · jul 2026*
