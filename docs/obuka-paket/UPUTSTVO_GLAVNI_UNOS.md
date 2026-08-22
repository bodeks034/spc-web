# Glavni unos → SPC šifrarnik

Inženjer unosi **dimenzije i zaglavlje dela** na jednom mestu; aplikacija propagira u merljive tabele, delove, radne naloge i SOP.

**Primarni način:** Modul 0 → **Osnovno → Glavni unos** (u aplikaciji).  
**Masovni / arhiva:** Excel `glavni unos.xlsx` + `npm run sync:glavni-unos` (opciono).

Detalji za **novi deo (komponenta):** [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md)  
Detalji za **celo vozilo:** [UPUTSTVO_NOVO_VOZILO_SIFARNIK.md](./UPUTSTVO_NOVO_VOZILO_SIFARNIK.md)

---

## Dva tipa delova (oba u istom modulu)

| Tip | Primer ID | `tip_kontrole` posle propagacije | Kako unosiš |
|-----|-----------|----------------------------------|-------------|
| **Komponenta / opšti deo** | `5501-A`, `HAM-NM-001` | **`deo`** | **+ Grupni unos (deo)** |
| **Deo projekta vozila** | `RTB-001` na HAM projektu | **`deo`** (+ ERP veza `HAM`) | Sheet tip **2** + grupni unos |
| **Celo vozilo (final)** | `HAM-001`, `MRAP-001` | **`vozilo`** | **+ Final vozilo** ili red „Finalna vizuelna kontrola celog vozila“ |

**Važno:** deo koji pripada vozilu (nosač, lim…) **nije** celo vozilo — i dalje je `tip_kontrole = deo`.  
Samo finalna kontrola celog komada postaje `vozilo` (dijagram + zone).

---

## Organizacija sheet tabova (preporuka)

Jedan sheet = **jedna grupa** delova, ne „svaki red = vozilo“.

| Sheet (primer) | Tip pri kreiranju (+ Novi sheet) | ERP vozilo | Sadržaj |
|----------------|----------------------------------|------------|---------|
| `opsti_1` | **1 — Opšti delovi** | — | Zavrtnji, lim, dobavljač — nije vezano za vozilo |
| `ham_delovi` | **2 — Komponente projekta** | `HAM` | Delovi HAM projekta |
| `ham_final` | **3 — Final / celo vozilo** | `HAM` | Samo `HAM-001` finalna kontrola |
| `ntv_delovi` | **2** | `NTV` | Drugi projekat |

Stari nazivi `vozilo1`, `vozilo2` mogu ostati — aplikacija na tabu prikazuje bedž (**Opšti delovi**, **HAM · komponente**, **HAM · celo vozilo**).

Pomoćni podaci (ne unosiš svaki dan):

- **Pogon mapa** (Modul 0) — Linija → pogon A–H  
- U Excel-u: tab **`pogon_kod`** (ako koristiš sync sa diska)

---

## Rad u aplikaciji (korak po korak)

### A) Nova komponenta (preporučeno)

1. Izaberi ili kreiraj sheet (**+ Novi sheet** → tip **1** ili **2**).
2. Klik **+ Grupni unos (deo)**.
3. Popuni **zaglavlje jednom:** ID deo, naziv, linija, RN, kom za kontrolu…
4. U tabeli dimenzija unesi sve mere (Tip Merljiva / Atributivna, LSL/USL…).
5. **Sačuvaj i propagiraj** — piše checklist šta još treba ručno.
6. Dopuni u Modulu 0:
   - **Atributivne → Katalog grešaka**
   - **Atributivne → Crtež dela**
7. **Alati → Barkod** → test skena na Modul 1.

### B) Novo celo vozilo

1. Sheet tip **3** (npr. `ham_final`) + ERP `HAM`.
2. Klik **+ Final vozilo** — predložena linija Završna i jedan red finalne kontrole.
3. ID npr. `HAM-001`, **Sačuvaj i propagiraj**.
4. Modul 0 → **Celo vozilo:**
   - Tip vozila + dijagram (`public/vozilo/dijagrami/`)
   - Defekti po zonama
5. Test atributivnog unosa (dijagram + zone).

### C) Dorada jednog dela

- Filter po punom **ID deo** → **+ Dimenzije za {ID}** ili ✎ na redu.
- **Propagiraj {ID}** — samo taj deo (posle save).

---

## Šta propagacija radi automatski

| Cilj | Tabela |
|------|--------|
| Dimenzije merljive | `karakteristike_merljive` |
| SOP merljive | `sop_deo_varijabilni` |
| Master deo | `delovi` (+ `tip_kontrole` iz sadržaja redova) |
| Pogon po delu | `delovi_atributivni_pogon` |
| Kupac | `kupci` |
| Radni nalog | `radni_nalozi` |

**Ne propagira (uvek ručno):** katalog grešaka, crtež dela, dijagram vozila, defekti po zonama, barkod etiketa.

---

## Kolone (po redu dimenzije)

| Kolona / polje | Ide u |
|----------------|--------|
| `id_deo` | sve tabele |
| `Naziv dela`, `Slika`, `Radni_nalog`, `Kupac` | delovi, SOP, RN, kupci |
| `Linija`, `Operacija` | **Linija** → `pogon_kod`; operacija → serija merenja |
| `Karakteristika` | pozicija / naziv mere |
| `Nominal`, `USL`, `LSL`, `Jedinica` | merljive granice |
| `Instrument`, `Tip` | merljiva vs atributivna |
| `Ukupno_kom` | ukupan broj komada na RN |
| `Kom_za_kontrolu_n` | veličina uzorka (AQL) — **nije** SPC broj merenja |
| `Klasa` | Critical / Major / Minor — prag SPC alarma |
| `Tip` | **Merljiva** → SPC; **Atributivna** → OK/NOK |
| `Nivo_kontrole FAC`, `FAC broj` | FAI |
| `SPC broj merenja po dimenziji` | koliko puta meriš istu dimenziju (Merljiva; prazno → **5**) |

### Prag SPC alarma (NOK u seriji)

| Klasa | Alarm |
|-------|-------|
| **Critical** | ≥ 20% |
| **Major** | ≥ 30% |
| **Minor** | ≥ 40% |
| *(prazno)* | ≥ 20% (kao Critical) |

---

## Excel + npm (opciono — masovni uvoz / backup)

| Fajl | Ko popunjava |
|------|----------------|
| `excel rad izmenjen/glavni unos.xlsx` | Inženjer — tabovi `vozilo*` ili isti sadržaj kao u app |
| `excel rad izmenjen/sifrarnik-paket/SPC_merljive.xlsx` | Automatski posle sync |
| `excel rad izmenjen/sifrarnik-paket/SPC_atributivne.xlsx` | Automatski posle sync |

```cmd
cd C:\mix\spc-web
npm run sync:glavni-unos:dry
npm run sync:glavni-unos
npm run sync:glavni-unos:import
```

Ili u aplikaciji: **Uvezi .xlsx** na tabu Glavni unos.

Delovi **van** trenutnog sheeta **ostaju** u šifrarniku — sync ih ne briše.

---

## Checklist posle propagacije

| Tip | Još uradi u Modulu 0 |
|-----|----------------------|
| **Deo (komponenta)** | Katalog grešaka · Crtež · Barkod · test Modul 1 |
| **Celo vozilo** | Tip vozila + dijagram · Defekti po zonama · test dijagrama |

---

## Napomene

- **`Tip = Atributivna`** → obično instrument Vizuelno (atributivni modul).
- **`Tip = Merljiva`** → SPC granice na liniji.
- Finalni red: karakteristika **„Finalna vizuelna kontrola celog vozila“** → `tip_kontrole = vozilo`.
- Greške, merila, linije (master) — tabovi u Modulu 0 ili ERP CSV.

---

## Povezana uputstva

| Dokument | Tema |
|----------|------|
| [UPUTSTVO_MODUL_SIFARNIK.md](./UPUTSTVO_MODUL_SIFARNIK.md) | Svi tabovi Modula 0 |
| [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md) | Novi deo — komponenta |
| [UPUTSTVO_NOVO_VOZILO_SIFARNIK.md](./UPUTSTVO_NOVO_VOZILO_SIFARNIK.md) | Novo celo vozilo |
| [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md) | ERP CSV (paralelno sa glavnim unosom) |
