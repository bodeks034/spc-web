# Praktična vežba — ručni unos dela HAM-NM-001

Ovo je kompletna vežba ručnog unosa jednog dela u SPC Šifrarnik preko **Glavnog unosa**
(propagacija sama pravi master dela) do šest merljivih karakteristika na tri linije.

> **TRENING PRIMER — NIJE ZA PROIZVODNJU.** Dimenzije, tolerancije, materijal i plan
> kontrole su izmišljeni radi obuke. Ne koristiti za izradu ili prihvatanje stvarnog dela
> bez odobrenog konstrukcionog crteža i Control Plan-a.

## 1. Deo koji unosimo

| Polje | Vrednost |
|---|---|
| ID dela | `HAM-NM-001` |
| Naziv | Nosač modula akumulatora — HAM |
| Familija vozila | `HAM` |
| Tip kontrole | `deo` |
| Broj crteža | `HAM-NM-001` |
| Revizija | `A` |
| Materijal | S355, debljina 4 mm |
| Uzorak za vežbu | 5 komada |

Tehnički crtež za vežbu (trening, nije za proizvodnju):

| Gde | Putanja |
|---|---|
| Glavni crtež (upload u Glavni unos) | `public/slike/merljive/HAM-NM-001_tehnicki_crtez_trening_sr.png` |
| Crtež dela (revizija A) | `public/crtezi/prikaz/deo/HAM-NM-001/revA.png` |
| Uz uputstvo | `docs/obuka-paket/crtezi/HAM-NM-001_tehnicki_crtez_trening_sr.png` |
| K4 pomoć (obe rupe) | `public/slike/merljive/HAM-NM-001_K4_obe_rupe_trening.png` |

Crtež prikazuje L-nosač 180 × 80 mm, prirubnicu visine 30 mm, dve montažne rupe i
šest oznaka K1–K6. U Glavnom unosu, polje **Slika**, uploaduj fajl iz
`public/slike/merljive/`.

---

## 2. Šest kontrolnih karakteristika

Granice su apsolutne vrednosti koje se unose u aplikaciju — ne unosi se samo `±`.

| Oznaka | Linija / pogon | Operacija | Karakteristika | Nominal | LSL | USL | Jedinica | Instrument | Klasa | SPC n |
|---|---|---|---|---:|---:|---:|---|---|---|---:|
| K3 | A — Ulazna kontrola | `OP-ULAZ` | K3 Debljina materijala | 4.00 | 3.90 | 4.10 | mm | Mikrometar 0–25 mm | Critical | 5 |
| K1 | B — Preseraj | `OP-PRES` | K1 Ukupna dužina | 180.00 | 179.50 | 180.50 | mm | Pomično merilo 0–300 mm | Major | 5 |
| K2 | B — Preseraj | `OP-PRES` | K2 Ukupna širina | 80.00 | 79.70 | 80.30 | mm | Pomično merilo 0–150 mm | Major | 5 |
| K5 | B — Preseraj | `OP-PRES` | K5 Razmak centara rupa | 140.00 | 139.80 | 140.20 | mm | Pomično merilo 0–300 mm | Critical | 5 |
| K6 | B — Preseraj | `OP-PRES` | K6 Ugao savijanja | 90°00′00″ | 89°00′00″ | 91°00′00″ | ° | Digitalni uglomer | Critical | 5 |
| K4 | E — Montaža | `OP-MON` | K4 Prečnik montažnih rupa (obe) | 10.50 | 10.35 | 10.65 | mm | Kalibar / pomično merilo | Critical | 10 |

Zašto su raspoređene ovako:

- **A — Ulazna:** proverava se materijal pre obrade;
- **B — Preseraj:** proveravaju se sečenje, probijanje i savijanje;
- **E — Montaža:** funkcionalno se potvrđuje da montažni vijak prolazi kroz obe rupe.

Ako u dropdownu nema instrumenta ili operacije, prvo ga dodaj u odgovarajući šifrarnik:

- **Osnovno → Linije** za liniju/operaciju;
- **Merljive → Merila / kalibracija** za instrument;
- **Osnovno → Liste (dropdown)** za dozvoljene liste gde je primenljivo.

---

## 3. Pre početka

Proveri:

1. **Celo vozilo → Tipovi vozila** sadrži aktivan tip `HAM`.
2. **Osnovno → Glavni unos** ima sheet vezan za `HAM`, npr. `vozilo2 · HAM`.
3. Linije A, B i E postoje.
4. Merila postoje i imaju važeću kalibraciju.
5. Imaš ulogu kvalitet, šef ili admin.

Ako HAM nema sheet:

1. Otvori **Osnovno → Glavni unos**.
2. Klikni **+ / Veži sheet**.
3. Naziv: npr. `vozilo2`.
4. ERP šifra vozila: `HAM`.
5. Proveri da tab prikazuje `vozilo2 · HAM`.

---

## 4. Korak 1 — unesi sve u Glavni unos (master nastaje propagacijom)

**Ne moraš** prvo ručno da praviš deo u **Delovi (pregled)**.

Za merljive karakteristike dovoljno je:

1. uneti sve dimenzije u **Osnovno → Glavni unos** (na sheetu `… · HAM`);
2. kliknuti **Sačuvaj i propagiraj**.

Aplikacija tada sama:

- napravi / ažurira master u `delovi` (ID, naziv, tip `deo`, šifra vozila sa sheeta, broj crteža…);
- upiše dimenzije u `karakteristike_merljive`;
- pripremi SOP / pogone / RN po potrebi.

### Zašto uputstvo ranije tražilo „master prvo“?

To je bilo **opciono** radi preglednosti u listi Delovi pre unosa dimenzija.  
Nije tehnički uslov — propagacija već radi FK upsert u `delovi`.

### Opciono: ručni master pre unosa

Ako želiš da deo vidiš odmah u **Delovi** pre propagacije:

**Modul 0 → Osnovno → Delovi (pregled) → + Deo**

| Polje u formi | Vrednost |
|---|---|
| ID deo | `HAM-NM-001` |
| Naziv | `Nosač modula akumulatora — HAM` |
| Karakteristika | `Merljiva kontrola nosača K1–K6` |
| Tip kontrole | `deo` |
| Vozilo katalog ID | ostavi prazno — ovo nije kompletno vozilo |
| Šifra vozila / familija | `HAM` |
| Broj crteža | `HAM-NM-001` |
| Revizija | `A` |
| Kom za kontrolu | `5` |

Klikni **Sačuvaj**.

Važna razlika:

- `tip_kontrole=deo` = komponenta bez dijagrama zona celog vozila;
- `sifra_vozila=HAM` = veza na familiju/sheet HAM (pri propagaciji se šifra uzima i sa sheeta);
- `vozilo_katalog_id` ostaje prazno jer nije zapis kompletnog vozila.

---

## 5. Korak 2 — unesi K3 na liniji A

Put:

**Osnovno → Glavni unos → izaberi tab `… · HAM`**

1. U filter upiši `HAM-NM-001`.
2. Klikni **+ Grupni unos**.
3. Popuni zaglavlje:

| Polje | Vrednost |
|---|---|
| ID deo | `HAM-NM-001` |
| Naziv dela | Nosač modula akumulatora — HAM |
| Broj crteža | `HAM-NM-001` |
| Linija | A — Ulazna kontrola |
| Operacija | `OP-ULAZ` |
| Kom za kontrolu n | `5` |
| Slika | upload `HAM-NM-001_tehnicki_crtez_trening_sr.png` |
| Ukupno kom / RN / kupac | opciono za ovu vežbu |

4. U tabeli dimenzija popuni samo prvi red:

| Polje | Vrednost |
|---|---|
| Karakteristika | `K3 Debljina materijala` |
| Tip | `Merljiva` |
| Klasa | `Critical` |
| Jedinica | `mm` |
| Nom | `4` |
| LSL | `3.9` |
| USL | `4.1` |
| Instrument | Mikrometar 0–25 mm |
| SPC n | `5` |

5. Prazne dodatne redove možeš obrisati sa **×**.
6. Klikni **Sačuvaj sve dimenzije (1)**.

Ovo je red dodat na radnu listu sheeta, ali još nije konačno propagiran.

---

## 6. Korak 3 — unesi K1, K2, K5 i K6 na liniji B

Filter i dalje treba da bude `HAM-NM-001`.

1. Klikni **+ Dimenzije za HAM-NM-001**.
2. Zaglavlje se kopira sa postojećeg reda.
3. Promeni:
   - Linija: **B — Preseraj**
   - Operacija: `OP-PRES`
4. Unesi četiri reda:

| Karakteristika | Tip | Klasa | Jed. | Nom | LSL | USL | Instrument | SPC n |
|---|---|---|---|---:|---:|---:|---|---:|
| K1 Ukupna dužina | Merljiva | Major | mm | 180 | 179.5 | 180.5 | Pomično merilo 0–300 mm | 5 |
| K2 Ukupna širina | Merljiva | Major | mm | 80 | 79.7 | 80.3 | Pomično merilo 0–150 mm | 5 |
| K5 Razmak centara rupa | Merljiva | Critical | mm | 140 | 139.8 | 140.2 | Pomično merilo 0–300 mm | 5 |
| K6 Ugao savijanja | Merljiva | Critical | ° | 90°00′00″ | 89°00′00″ | 91°00′00″ | Digitalni uglomer | 5 |

Za K6 prvo izaberi jedinicu `°`, pa unesi nominalu i granice u formatu
`D°M′S″`. Nemoj uneti `90`, `1` i `-1`; LSL/USL su apsolutno `89°` i `91°`.

Klikni **Sačuvaj sve dimenzije (4)**.

---

## 7. Korak 4 — unesi K4 na liniji E

1. Klikni ponovo **+ Dimenzije za HAM-NM-001**.
2. Promeni:
   - Linija: **E — Montaža**
   - Operacija: `OP-MON`
3. Unesi:

| Polje | Vrednost |
|---|---|
| Karakteristika | `K4 Prečnik montažnih rupa (obe)` |
| Tip | `Merljiva` |
| Klasa | `Critical` |
| Jedinica | `mm` |
| Nom | `10.5` |
| LSL | `10.35` |
| USL | `10.65` |
| Instrument | Kalibar / pomično merilo |
| SPC n | `10` |

Klikni **Sačuvaj sve dimenzije (1)**.

K4 ima `SPC n=10` jer se na uzorku od 5 komada mere obe rupe: 5 × 2 = 10 rezultata.
Obe rupe moraju biti unutar 10.35–10.65 mm; nemoj upisati samo „bolju” rupu.

Sada lista treba da ima ukupno šest redova za `HAM-NM-001`.

---

## 8. Korak 5 — konačno čuvanje i propagacija

Pre čuvanja proveri u tabeli:

- 1 red na A;
- 4 reda na B;
- 1 red na E;
- ukupno 6 karakteristika;
- LSL < nominala < USL;
- K6 koristi jedinicu stepen.

Klikni **Sačuvaj i propagiraj**.

Aplikacija treba da:

- sačuva šest redova u `glavni_unos_redovi` na HAM sheetu;
- napravi/ažurira šest redova u `karakteristike_merljive`;
- **napravi ili ažurira master dela** u `delovi` (uključujući `sifra_vozila=HAM` sa sheeta);
- poveže crtež/SOP za merljivi unos;
- pripremi karakteristike za Modul 1.

Ako si već sačuvao sheet, a želiš ponovni sync, klikni **Propagiraj**.

---

## 9. Korak 6 — proveri rezultat u Šifrarniku

### Master dela

**Osnovno → Delovi** → traži `HAM-NM-001`.

Proveri: tip `deo`, vozilo `HAM`, aktivan, uzorak 5.

### Dimenzije

**Merljive → Dimenzije (pregled)** → filter `HAM-NM-001`.

Očekivano: šest redova sa pogonima A, B i E i tačnim granicama.

### SOP/crtež

**Merljive → SOP po delu (pregled)** → `HAM-NM-001`.

Otvori sliku i vizuelno uporedi oznake K1–K6.

### Merila

**Merljive → Merila / kalibracija**.

Proveri da su mikrometar, pomična merila i uglomer aktivni i kalibrisani.

---

## 10. Korak 7 — probni unos na liniji

1. Otvori **Modul 1 — Merljive**.
2. Unesi ili skeniraj `HAM-NM-001`.
3. Izaberi odgovarajući pogon/liniju.
4. Očekivano:
   - A prikazuje K3;
   - B prikazuje K1, K2, K5 i K6;
   - E prikazuje K4.
5. Otvori crtež i proveri da se oznake poklapaju.
6. Za probu unesi nominalne vrednosti:
   - K3 = 4.00
   - K1 = 180.00
   - K2 = 80.00
   - K5 = 140.00
   - K6 = 90°
   - K4 = 10.50 za obe rupe svakog komada (ukupno 10 rezultata)
7. Snimi samo kao obučni/test zapis u dogovorenom test okruženju.

Ne pravi namerno NOK u produkcionim podacima. Za proveru alarma koristi test okruženje.

---

## 11. Kontrolna lista

- [ ] Tip vozila `HAM` postoji.
- [ ] HAM je vezan za jedan Glavni unos sheet.
- [ ] Unos je urađen u Glavnom unosu (ručni Delovi master nije obavezan).
- [ ] Posle propagacije master `HAM-NM-001` postoji sa `tip_kontrole=deo` i `SifraVozila=HAM`.
- [ ] Broj crteža `HAM-NM-001` (revizija A po potrebi dopuni u Delovi).
- [ ] Crtež je označen kao trening primer.
- [ ] K1–K6 su uneti tačno jednom.
- [ ] Raspored je A:1, B:4, E:1.
- [ ] LSL < nominala < USL za svih šest karakteristika.
- [ ] Instrumenti postoje i kalibracija važi.
- [ ] Sačuvaj i propagiraj je uspešan.
- [ ] Modul 1 prikazuje samo karakteristike izabrane linije.

---

## 12. Najčešće greške

### Deo je na HAM sheetu, ali u masteru nema HAM

Posle **Sačuvaj i propagiraj** šifra sa sheeta (`HAM`) treba da uđe u master.
Ako i dalje fali: proveri da je sheet vezan sa ERP šifrom `HAM`, ponovo propagiraj,
ili otvori **Delovi → ✎** i dopuni polje.

### Svih šest mera se prikazuje na svakoj liniji

Linija/pogon nije ispravno postavljen pre propagacije. Proveri svaki red u Glavnom unosu
i ponovo propagiraj.

### Ugao je sačuvan kao pogrešan mali broj

Za K6 izaberi jedinicu `°` pre unosa granica i koristi format `90°00′00″`.

### Nema instrumenta u dropdownu

Dodaj merilo u **Merljive → Merila / kalibracija**, zatim osveži Glavni unos.

### Slika se ne prikazuje

Ponovo uploaduj PNG kroz polje **Slika**. Lokalna putanja sa računara nije javna putanja
u aplikaciji.

---

*SPC Web — trening primer ručnog unosa HAM-NM-001 · jul 2026*
