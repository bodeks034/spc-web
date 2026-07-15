# Uputstvo — novi deo u Šifrarniku (komponenta)

Kompletna procedura za **inženjera / kvalitet** kako da uvede **novi deo** (`tip_kontrole = deo`) u SPC, da bi na **Modul 1** radio sken ID-a, atributivni OK/NOK (i/ili merljive dimenzije), crtež i radni nalog.

Primer kroz uputstvo: **`5501-A`** (zavrtanj / limeni deo).  
Za **celo vozilo** (`tip_kontrole = vozilo`) koristi: [`UPUTSTVO_NOVO_VOZILO_SIFARNIK.md`](./UPUTSTVO_NOVO_VOZILO_SIFARNIK.md).

---

## Šta dobijaš na kraju

| Stavka | Rezultat |
|--------|----------|
| Master deo | Red u `delovi` (`tip_kontrole = deo`, aktivan) |
| Greške | Redovi u `greske_katalog` (po delu / pogonu) |
| Crtež | `slika_naziv` + fajl u Storage `atributivne/` |
| Pogon | Mapiranje linije ↔ A–I + opcioni red u `delovi_atributivni_pogon` |
| Merljive (ako treba) | Dimenzije u `karakteristike_merljive` (LSL/USL) |
| RN | Aktivan radni nalog za taj `id_deo` |
| Unos (Modul 1) | Sken ID → kontrola → Zapiši |

---

## Tri puta unosa (izaberi jedan)

| Put | Kad | Gde |
|-----|-----|-----|
| **A — Ručno u UI** | Jedan–par delova, brza korekcija | Osnovno → Delovi → **+ Deo** |
| **B — Glavni unos** | Više dimenzija / pogona odjednom | `glavni unos.xlsx` → Propagiraj / sync |
| **C — ERP CSV** | SAP/Pantheon dnevni uvoz | Alati → ERP uvoz (`delovi.csv`…) |

Ovo uputstvo detaljno pokriva **put A** i šta dopuniti posle **B/C**.  
Detalji za B: [`UPUTSTVO_GLAVNI_UNOS.md`](./UPUTSTVO_GLAVNI_UNOS.md). ERP: [`UPUTSTVO_ERP_KONFIGURACIJA.md`](./UPUTSTVO_ERP_KONFIGURACIJA.md).

---

## Brzi redosled (ručni put)

1. **Osnovno → Delovi** → **+ Deo** (`tip_kontrole = deo`)
2. **Atributivne → Katalog grešaka** → greške za taj ID (i pogon)
3. **Atributivne → Crtež dela** → slika (preporuka)
4. **Pogon mapa** + **Pogoni po delu** (ako kontrolišeš na više faza)
5. (Opciono) **Merljive → Karakteristike** ako ima USL/LSL
6. **Radni nalozi** → aktivan RN
7. **Barkod** etiketa → test skena na **Modul 1**

---

## Korak 1 — Master deo (Delovi pregled)

**Put:** Modul 0 — Šifrarnik → grupa **Osnovno** → tab **Delovi (pregled)** → **+ Deo**

| Polje u UI | Obavezno | Primer `5501-A` | Napomena |
|------------|----------|-----------------|----------|
| **ID deo \*** | Da | `5501-A` | Ovo se **skenira / kuca** na liniji; ne menja se posle snimanja |
| **Naziv \*** | Da | `Zavrtanj M8×25` | Prikaz u zelenoj kutiji |
| **Karakteristika** | Ne | `Ulazna vizuelna kontrola` | Opis kontrole (kratko, jasno) |
| **TIP KONTROLE** | Da | **`deo`** | Ne stavi `vozilo` za komponentu |
| **VOZILO KATALOG ID** | Ne | *(prazno)* | Samo za celo vozilo |
| **KOM ZA KONTROLU** | Preporuka | `30` | Cilj / n uzorka (AQL) — podrazumevano 30 |
| **Aktivan** | Da | DA | NE = deo se ne nudi na liniji |

**Sačuvaj.**

### Filteri u listi

- **TIP:** `Delovi (komponente)` / `Celo vozilo` / Svi  
- **PRETRAGA:** ID, naziv, karakteristika  
- Dugme **▦** → prebacuje na štampu barkoda za taj deo  

### Pravila ID-a

- Jedinstven u `delovi` (PK).  
- Isti string koji će biti na etiketi / ERP materijalu.  
- Posle snimanja **ID se ne menja** u formi izmene — novi ID = novi deo.

---

## Korak 2 — Katalog grešaka (atributivne)

Bez ovoga operater može snimiti OK, ali **NOK dropdown** bude prazan ili samo opšte greške.

**Put:** Modul 0 → **Atributivne** → **Katalog grešaka** → dodaj red

| Polje | Primer | Napomena |
|-------|--------|----------|
| **Kategorija \*** | `POVRŠINA` | Obavezno |
| Podkategorija | `Oštećenje` | |
| Defekt | `Udubljenje` | Ono što bira operater |
| Opis | opciono | |
| **ID deo** | `5501-A` | Prazno = greška važi šire; sa ID = filter za taj deo |
| **Pogon** | `A` | Prazno = svi pogoni; sa kodom = samo ta faza |

**Preporuka:** bar 3–5 tipičnih defekata vezanih za `id_deo` + pogon na kojem se kontroliše (npr. A).

ERP CSV: `greske_katalog.csv`.

---

## Korak 3 — Crtež dela

**Put:** Modul 0 → **Atributivne** → **Crtež dela**

| Polje | Značenje |
|-------|----------|
| ID deo | Mora već postojati u Delovi |
| Naziv / karakteristika | Može se dopuniti |
| **Crtež / slika** (`slika_naziv`) | Fajl u Storage **`atributivne/`** |
| Kom za kontrolu | Može uskladiti sa masterom |

Na Modul 1: tab **CRTEŽ** prikazuje ovu sliku.  
Bez crteža kontrola i dalje radi — operater nema vizuelni referent.

> **Ne mešati** sa dijagramom celog vozila (`/vozilo/dijagrami/…`). Crtež dela = komponenta.

---

## Korak 4 — Pogon mapa i Pogoni po delu

### 4.1 Pogon mapa (linija / faza ↔ slovo)

**Put:** Osnovno → **Pogon mapa**

Primer: `Ulazna` → **A**, `Preseraj` → **B**, … `Završna` → **F**.

Na unosu se prikazuje npr. **A — Ulazna kontrola**.

### 4.2 Pogoni po delu (atributivno)

**Put:** Atributivne → **Pogoni po delu**

| Polje | Primer |
|-------|--------|
| ID deo | `5501-A` |
| Pogon | `A` |
| Radni nalog | opciono / veza na RN |
| Kom za kontrolu | `30` |
| Aktivan | DA |

Potrebno kad isti deo ide na **više faza** ili kad Glavni unos / ERP nije napunio mapu.  
Ako deo radi samo ulaznu (A) i mapa postoji — često dovoljan je master + RN sa `pogon_kod = A`.

---

## Korak 5 — Merljive dimenzije (samo ako ima SPC)

Ako je kontrola **samo** OK/NOK atributivna — **preskoči** ovaj korak.

**Put:** Modul 0 → grupa merljivih → **Karakteristike merljive** (ili preko Glavnog unosa / ERP)

| Polje | Primer |
|-------|--------|
| ID deo | `5501-A` |
| Pogon | `A` |
| Pozicija / naziv mere | `Ø12.0` |
| Nominal / LSL / USL | granice crteža |
| Jedinica | `mm` |
| Klasa | Critical / Major / Minor (prag alarma) |

Bez redova ovde → posle skena **nema kolona merenja** (samo atributivni deo ako je podešen).

Detalji kolona Glavnog unosa: `UPUTSTVO_GLAVNI_UNOS.md`.

---

## Korak 6 — Radni nalozi

**Put:** Osnovno → **Radni nalozi** → **+ Novi RN** (ili CSV uvoz)

| Polje | Važno |
|-------|--------|
| Broj naloga | Jedinstven |
| **ID deo** | **Mora već postojati** u `delovi` — inače uvoz/unos pada |
| Pogon kod | A–I gde se radi |
| Status | **aktivan** |
| Količina / kupac / rok | po planu |

**Pravilo:** prvo deo, pa RN — nikad obrnuto za novi materijal.

---

## Korak 7 — Barkod (etiketa)

**Put:** Alati / tab **Barkod** (ili ▦ pored reda u Delovi)

1. Profil štampe (veličina, printer).  
2. Štampaj ID = `5501-A`.  
3. Provera skenerom na Modul 1.

Vidi: [`UPUTSTVO_PRAVLJENJE_BARKODOVA.md`](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md).

---

## Korak 8 — Ostalo što često zatreba

| Tab | Kad |
|-----|-----|
| **Linija ↔ deo** | Deo sme samo na određenim linijama |
| **Kontrolna lista** | Blokada unosa ako smena nije checklista |
| **Kupci / Linije / Mašine** | Ako RN / izveštaji traže master |
| **Ciljevi** | KPI za Modul 2 |
| **Liste (dropdown)** | Ako UI koristi custom liste |

---

## Korak 9 — Provera na liniji

1. Otvori **Modul 1 — Atributivne** (i/ili Merljive).  
2. Skeniraj / unesi **`5501-A`**.  
3. Očekivano:
   - naziv dela i karakteristika,
   - **pogon** (npr. A — Ulazna),
   - greške u NOK (ako ima katalog),
   - crtež na tabu CRTEŽ (ako ima sliku),
   - izbor RN ako ima aktivnih,
   - merenja ako ima karakteristike.
4. Snimi probe OK i jedan NOK → proveri da se vidi u logu / Modulu 2.

---

## Put B — kratko (Glavni unos)

1. U `glavni unos.xlsx` na `voziloN` tabu popuni redove sa `id_deo`, naziv, Linija, Tip (Merljiva/Atributivna), granice, `Kom_za_kontrolu_n`…  
2. Propagiraj u UI **ili** `npm run sync:glavni-unos:import`.  
3. Dopuni **Katalog grešaka** i **Crtež** ako sync nije uneo.  
4. Test skena.

---

## Put C — kratko (ERP)

1. U folder / Alati → ERP: `delovi.csv`, po potrebi `greske_katalog.csv`, `karakteristike_merljive.csv`, RN CSV.  
2. **Proveri** da `id_deo` u RN postoji u delovima.  
3. Dopuni crtež / pogon mapu ručno ako CSV nema slike.  
4. Test skena.

---

## Primer jedne kartice (`5501-A`)

```
Delovi
  id_deo         = 5501-A
  naziv_dela     = Zavrtanj M8×25
  tip_kontrole   = deo
  kom_za_kontrolu = 30
  aktivan        = DA

Greske katalog (primer)
  id_deo=5501-A  pogon=A  kategorija=POVRŠINA  defekt=Udubljenje

Crtež
  slika_naziv = 5501-A.png   (Storage atributivne/)

Pogon / RN
  pogon_kod = A
  RN npr. RN-2026-5501-A-A  status=aktivan

Unos
  sken 5501-A → Ulazna (A) → OK/NOK → Zapiši
```

---

## Česte greške

1. **Deo nije aktivan** → operater „ne vidi“ / ne može sken.  
2. **RN uvezen pre dela** → FK greška; prvo `delovi`.  
3. **`tip_kontrole = vozilo` greškom** → otvara se režim celog vozila / zone.  
4. **Nema grešaka u katalogu** → NOK lista prazna.  
5. **Nema karakteristika** a očekuje se SPC → prazne dimenzije.  
6. **Pogrešan pogon** (deo na A, greške samo na B) → filter sakrije defekte.  
7. **Crtež u pogrešnom bucketu** ili samo lokalni fajl bez uploada → prazan CRTEŽ tab.  
8. **ID na etiketi ≠ `id_deo`** → sken ne pogađa.  
9. **Kontrolna lista** blokira unos — nije podešen deo, nego smena/check.  
10. Mešanje **kom za kontrolu (n uzorka)** sa **SPC brojem merenja** po dimenziji (to su dve različite stvari u Glavnom unosu).

---

## Checklist pre go-live

- [ ] Deo u `delovi`: ID, naziv, `tip_kontrole=deo`, aktivan  
- [ ] Bar jedna greška u katalogu (sa ID ili opšta)  
- [ ] Crtež uploadovan (ako linija zahteva)  
- [ ] Pogon mapa / pogon na RN tačan  
- [ ] (Ako merljivo) LSL/USL za taj ID + pogon  
- [ ] Aktivan RN  
- [ ] Barkod sken radi  
- [ ] Probe OK + NOK na Modul 1  

---

## Povezana dokumentacija

| Fajl | Sadržaj |
|------|---------|
| `UPUTSTVO_MODUL_SIFARNIK.md` §6.5, §7, §12 | Pregled tabova i redosled |
| `UPUTSTVO_NOVO_VOZILO_SIFARNIK.md` | Novo **celo vozilo** |
| `UPUTSTVO_GLAVNI_UNOS.md` | Excel propagacija dimenzija |
| `UPUTSTVO_PRAVLJENJE_BARKODOVA.md` | Etikete |
| `UPUTSTVO_ERP_KONFIGURACIJA.md` | CSV uvoz |
| `UPUTSTVO_SIFARNIK_I_EXCEL.md` | Legacy Excel paket |

---

*SPC Web — Modul 0 Šifrarnik · Novi deo · jul 2026*
