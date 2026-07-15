# Uputstvo — novo vozilo u Šifrarniku (Celo vozilo)

Kompletna procedura za **inženjera / kvalitet** kako da uvede novi tip vozila u SPC (Modul 0 → Celo vozilo), da bi na **atributivnom unosu** radio dijagram sa zonama K/M/T/I/E/F i završna kontrola (**pogon F**).

Primer kroz celo uputstvo: **HAM** (civilni hamer). Za novi model zameni `HAM` svojim kodom (npr. `PICKUP`, `SUV2`).

---

## Šta dobijaš na kraju

| Stavka | Rezultat |
|--------|----------|
| Tip vozila | Red u `tipovi_vozila` (kod, dijagram, opciono SOP) |
| Deo za sken | `delovi` sa `tip_kontrole = vozilo` |
| Defekti | Katalog po zonama |
| Unos (Modul 1) | Sken ID → slika + zone → NOK po zoni → snimanje na **pogon F** |

---

## Brzi redosled (5 koraka)

1. Pripremi **dijagram** (PNG/SVG) → `public/vozilo/dijagrami/`
2. **Tipovi vozila** → novi tip + putanja dijagrama
3. **Osnovno → Delovi** → novi deo (`tip_kontrole = vozilo`)
4. **Defekti vozila** → greške po zonama (ili Excel uvoz)
5. Test u **Atributivne** sa ID dela

---

## Korak 1 — Dijagram (silueta)

### Pravila

- U fajlu ide **samo oblik vozila** (bočni prikaz).
- **Bez** krugova K/M/T i bez legende — to crta aplikacija.
- **viewBox** za SVG: `0 0 682 520` (da zone ostanu na mestu).
- PNG: preporuka ~1364×1040 px, svetla pozadina.

### Gde sačuvati

```
public/vozilo/dijagrami/ham.png
```

(ili `moj-tip.svg` / `moj-tip.png`)

Detalji: `public/vozilo/dijagrami/CITAJ_ME.md`.

### Mapiranje u kodu (opciono, ali korisno)

U `src/lib/voziloDijagramConfig.js` dodaj:

```js
HAM: "/vozilo/dijagrami/ham.png",
HAMER: "/vozilo/dijagrami/ham.png",
"AUTO-HAM": "/vozilo/dijagrami/ham.png",
"HAM-001": "/vozilo/dijagrami/ham.png",
```

**Prioritet učitavanja:** statička mapa u kodu → `tipovi_vozila.dijagram_src` → podrazumevana limuzina.

> Ako fajl nije na serveru/Vercelu, deploy-uj `public/` zajedno sa kodom.

---

## Korak 2 — Tipovi vozila (Modul 0)

**Put:** Modul 0 — Šifrarnik → grupa **Celo vozilo** → tab **Tipovi vozila** → **+ Novi tip**

| Polje u UI | Obavezno | Primer HAM | Napomena |
|------------|----------|------------|----------|
| **Kod \*** | Da | `HAM` | Velika slova; ovo je ključ tipa |
| **Naziv \*** | Da | `Civilni hamer` | Prikaz u listama |
| **Prefiks ID dela** | Ne | `HAM` | Za sugestije ID-ova |
| **Dijagram (silueta)** | Da (za unos) | `/vozilo/dijagrami/ham.png` | Ili uvezi PNG/SVG |
| **SOP crtež** | Ne | — | Poseban SOP dokument/slika; **nije** dijagram sa zonama |
| **Napomena** | Ne | `Završna kontrola celog vozila` | Referenca u šifrarniku |

**Sačuvaj.**

### Šta je „SOP crtež“?

- **Dijagram** = slika na liniji + zone kontrole.
- **SOP crtež** = opciono uputstvo/crtež procedure (Storage `atributivne/`). Za rad zona **nije potreban**.

---

## Korak 3 — Deo za kontrolu (`tip_kontrole = vozilo`)

Panel **Celo vozilo → Delovi vozila** **ne kreira** nove delove (samo filtrira/uređuje).  
Novi deo praviš ovde:

**Put:** Modul 0 → **Osnovno** → **Delovi (pregled)** → **+ Deo**

| Polje | Primer HAM | Zašto |
|-------|------------|--------|
| **ID deo \*** | `HAM-001` ili `AUTO-HAM` | Ovo se skenira / kuca na unosu |
| **Naziv \*** | `Hamer komplet` | Naslov u zelenoj kutiji |
| **Karakteristika** | `Završna vizuelna kontrola celog vozila` | Bolje nego „Ulazna kontrola“ |
| **TIP KONTROLE** | **`vozilo`** | Bez ovoga nema dijagrama sa zonama |
| **VOZILO KATALOG ID** | **`HAM`** | Mora biti **isti** kao Kod tipa |
| **Kom za kontrolu** | npr. `1` ili `5` | Cilj komada u seriji |
| **Slika / crtež** | opciono | Crtež dela; dijagram zone ide iz tipa |

**Sačuvaj**, zatim po želji:

**Celo vozilo → Delovi vozila** → izaberi tip `HAM` → proveri listu / barkod / crtež.

### Prepoznavanje „celog vozila“ u aplikaciji

Režim vozila se pali ako je:

- `tip_kontrole = vozilo`, **ili**
- ID / katalog počinje sa poznatim tipom (`HAM`, `HAM-001`, `AUTO-…`, `MRAP`…), **ili**
- u nazivu/karakteristici stoji „celo vozilo“ / „celog vozila“.

**Preporuka:** uvek eksplicitno stavi `tip_kontrole = vozilo` i `vozilo_katalog_id = HAM`.

---

## Korak 4 — Defekti / greške po zonama

**Put:** Modul 0 → **Celo vozilo** → **Defekti vozila**

Bez ovoga zone rade, ali **dropdown grešaka** bude prazan ili pogrešan.

### 6 zona (fiksno u aplikaciji)

| Zona ID | Dugme | Naziv |
|---------|-------|--------|
| `KAROS-001` | K | Karoserija |
| `MOTOR-001` | M | Motor |
| `TRANS-001` | T | Transmisija |
| `INT-001` | I | Enterijer |
| `EL-001` | E | Elektrika |
| `FINAL-001` | F | Finalna |

### Kako vezati redove kataloga

`vozilo_id` **ne sme** biti samo `HAM` (tip). Koristi:

| Format | Primer | Upotreba |
|--------|--------|----------|
| Zajedničke zone | `KAROS-001` | Isti katalog za sva vozila |
| Po modelu | `HAM-KAROS-001` | Katalog samo za HAM |

Kategorije moraju da se poklope sa očekivanim nazivima (npr. `EKSTERIJER (Karoserija i Limarija)`, `ENTERIJER (Kabina)`…) — vidi `src/lib/voziloZoneConfig.js` i `UPUTSTVO_SIFARNIK_I_EXCEL.md`.

### Excel put (masovno)

1. Pripremi sheetove / CSV po uzoru na `katalog_gresaka_vozilo`.
2. Uvoz u bazu (Admin / `import:docs` — **pažnja: masovni uvoz može obrisati postojeći katalog**).
3. Provera: Defekti vozila → filter tip `HAM`.

---

## Korak 5 — Pogon F (Završna kontrola)

| Kod | Naziv |
|-----|--------|
| **A** | Ulazna kontrola |
| **F** | **Završna kontrola** |

Za celo vozilo aplikacija na unosu:

- forsira **pogon F**,
- prikazuje **Kontrola: Završna kontrola**,
- napomena prikaza: **F — Završna kontrola**.

### Šta još podesiti (preporuka)

1. **Osnovno → Pogon mapa** — linija „Završna“ ↔ kod **F** (ako već nema).
2. **Radni nalozi** — aktivan RN za deo `HAM-001` sa `pogon_kod = F` (ako koristite RN lock).
3. **Atributivne → Pogoni po delu** (ako koristite mapu) — `HAM-001` + **F**.

---

## Korak 6 — Provera na liniji

1. Otvori **Modul 1 — Atributivne**.
2. Unesi / skeniraj **`HAM-001`** (ili tvoj ID).
3. Očekivano:
   - levo: naziv dela, **Kontrola = Završna kontrola**, **Napomena = F — Završna kontrola** (bez „A — Ulazna…“),
   - veliki **dijagram** sa zonama,
   - klik zone → kategorije/defekti za tu zonu,
   - OK/NOK → snimanje.
4. Poređenje: običan deo (`5501-A`) **nema** ovaj dijagram; koristi običan katalog grešaka.

---

## Primer jedne kartice (HAM)

```
Tipovi vozila
  kod          = HAM
  naziv        = Civilni hamer
  dijagram_src = /vozilo/dijagrami/ham.png

Delovi
  id_deo             = HAM-001
  tip_kontrole       = vozilo
  vozilo_katalog_id  = HAM
  karakteristika     = Završna vizuelna kontrola celog vozila

Defekti (primer)
  vozilo_id = HAM-KAROS-001   (ili KAROS-001)
  …

Unos
  ID = HAM-001  →  pogon F  →  zone na ham.png
```

---

## Česte greške

1. **`tip_kontrole` ostao `deo`** → nema vozilo moda / dijagrama zona.
2. **`vozilo_katalog_id` ≠ kod tipa** (npr. tip `HAM`, katalog `HAMER`) → loš ili prazan dijagram/katalog.
3. **Deo pravljen samo u „Delovi vozila“** → nema „+“; ide se na **Osnovno → Delovi**.
4. **Defekti sa `vozilo_id = HAM` samo** → zone ne filtriraju greške; koristi `KAROS-001` ili `HAM-KAROS-001`.
5. **Karakteristika „Ulazna kontrola“** → zbunjuje operatera; stavi završnu.
6. **Dijagram sa already nacrtanim K/M/T** → dupli krugovi / pomerene zone.
7. **Samo SOP, bez dijagrama** → SOP nije dijagram unosa.
8. **Fajl u `public/` lokalno, nema na Vercelu** → zone postoje, slika nestaje → deploy.
9. Očekivanje da ERP CSV sam postavi dijagram — u tipičnom CSV često **nema** `dijagram_src`; stavi preko UI.
10. Statička mapa u `voziloDijagramConfig.js` **pobedi** DB putanju za isti ključ — drži ih usklađene.

---

## Checklist pre go-live

- [ ] Fajl dijagrama u `public/vozilo/dijagrami/`
- [ ] Tip vozila snimljen, `dijagram_src` tačan
- [ ] Deo: `tip_kontrole=vozilo`, `vozilo_katalog_id` = kod tipa
- [ ] Defekti za bar jednu zonu (npr. K) rade na unosu
- [ ] Test skena ID-a → F / Završna / zone
- [ ] (Opciono) RN + barkod etiketa za taj ID
- [ ] Deploy sa novim PNG/SVG-om

---

## Povezana dokumentacija

| Fajl | Sadržaj |
|------|---------|
| `public/vozilo/dijagrami/CITAJ_ME.md` | Format siluete, viewBox, zamena fajla |
| `UPUTSTVO_MODUL_SIFARNIK.md` §9 | Tipovi / Defekti / Delovi vozila |
| `UPUTSTVO_NOVI_DEO_SIFARNIK.md` | Novi **deo** (komponenta), ne vozilo |
| `UPUTSTVO_SIFARNIK_I_EXCEL.md` | Excel katalog 9 komponenti / zone |
| `UPUTSTVO_PRAVLJENJE_BARKODOVA.md` | Etikete za ID dela |

---

*SPC Web — Modul 0 Šifrarnik · Celo vozilo · jul 2026*
