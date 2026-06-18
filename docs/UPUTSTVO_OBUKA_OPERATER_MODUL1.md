# Obuka — Operater i kontrolor (Modul 1 — Linija)

**SPC Kontrola kvaliteta · Modul 1 — Linija**  
Format: A4 · ~3 strane · jun 2026

---

## 1. Šta je Modul 1?

Modul 1 je **režim za fabriku** — veliki dugmići, korak-po-korak, tablet ili telefon.

- **Operator** i **kontrolor** uvek rade u Modulu 1 (ne birate Modul 2).
- Na početnom ekranu izaberete **tip kontrole**:
  - **Atributivne** — OK / NOK (vizuelno, defekti)
  - **Merljive — ručni** — kucate brojeve
  - **Merljive — digitalni** — merilo preko USB

> Modul 2 (Analitika) je za kancelariju — SPC karte, izveštaji. Operater ga **ne koristi**.

---

## 2. Prijava

1. Otvorite aplikaciju u **Chrome** ili **Edge**.
2. Unesite **email** i **lozinku** (dobijete od admina).
3. Greške:
   - *Pogrešan email ili lozinka* — proverite unos
   - *Nije u tabeli radnici* — javite adminu
   - *Deaktiviran* — admin mora da aktivira nalog

**Savet:** dodajte stranicu na početni ekran tableta.

---

## 3. Atributivne kontrole — dnevni rad

### Korak A — ID dela

1. Skenirajte **barkod ID dela** ili ukucajte (npr. `NT-001`).
2. Proverite da li se pojavio **naziv dela** i **crtež**.
3. Izaberite **radni nalog** ako ekran traži.

**Ako piše crveno „ID nije u bazi“** — proverite tačan kod (npr. `NM-001`, ne `NM-000`). Javite kontroloru.

### Korak B — Poka-yoke (kontrolna lista)

Morate **čekirati sve stavke**, npr.:

- ID dela tačan
- Radni nalog tačan
- Crtež / etiketa provereni
- Linija / mašina tačna
- Spreman za unos

**Dok nije sve čekirano — ne možete dalje.** To je namerno (sprečava pogrešan unos).

### Korak C — Unos

1. Izaberite **OK** ili **NOK**.
2. Za **NOK**: tip greške, podkategorija; kod vozila — **zona na dijagramu**.
3. Po potrebi **fotografija** NOK dela.
4. Popunite količinu / seriju prema ekranu.

### Korak D — Snimi (kontrolor)

Kontrolor vidi korak **LISTA / SNIMI** — proveri unos i potvrdi u bazu.

---

## 4. Merljive kontrole — dnevni rad

### Korak A — ID / serija

1. Unesite **ID dela** (npr. `NM-001`).
2. Ako ima više pogona — izaberite **pogon** (A, B, …).
3. Radni nalog po potrebi.

### Korak B — Poka-yoke

- ID i RN tačni, crtež OK, instrument spreman.
- Ako merilo **nije kalibrisano** — sistem blokira unos (admin odobrava izuzetak).

### Korak C — Unos merenja

| Način | Kako |
|-------|------|
| **Ručni** | Ukucajte vrednosti po kolonama |
| **Digitalni** | Merilo šalje broj (USB / paste) |

- Unosite vrednosti za svaku **dimenziju / poziciju**.
- Sistem proverava **LSL / USL** — van granice = **NOK**.
- Serije **A / B** ako je tako u uputstvu.

---

## 5. Tabovi koje vidite (Modul 1)

| Uloga | Atributivne | Merljive |
|-------|-------------|----------|
| **Operator** | samo UNOS | samo UNOS |
| **Kontrolor** | UNOS + LOG | UNOS + LOG |

**LOG** = pregled šta je uneto danas (kontrolor proverava, operator ne menja tuđe unose).

---

## 6. Pravila — obavezno zapamtiti

1. **Ne preskačite poka-yoke.**
2. **Tačan ID dela** — pogrešan ID = pogrešan crtež i pogrešna granica.
3. **Ne delite lozinku** — svako ima svoj nalog (trag ko je uneo).
4. **Wi‑Fi prekid** — kratko: unos ide u red, sinhronizuje se posle (offline red).
5. **Prekid serije** — ako ekran traži odobrenje, sačekajte admina.
6. **Kalibracija merila** — istekla = blokada digitalnog unosa.

---

## 7. Kada zvati pomoć

| Problem | Ko zove |
|---------|---------|
| Ne mogu login | Admin |
| ID dela ne postoji u sistemu | Kontrolor → inženjer (šifrarnik) |
| Merilo blokirano (kalibracija) | Admin / metrolog |
| Crveni alarm / prekid serije | Kontrolor → admin |
| Tablet ne otvara kameru | IT (HTTPS na fabričkom URL-u) |

---

## 8. Rezime — jedan dan operatera

```
PRIJAVA
  → Atributivne ILI Merljive (ručni/digitalni)
  → ID dela (+ RN)
  → POKA-YOKE (sve čekirano)
  → UNOS (OK/NOK ili merenja)
  → (Kontrolor: SNIMI / LOG)
  → sledeći deo / serija
```

**Operater ne koristi SPC karte** — to radi inženjer u Modulu 2. Vaš posao je **tačan i kompletan unos na liniji**.

---

*Sledeći dokument za inženjere: [UPUTSTVO_OBUKA_INZENJER_MODUL2.md](./UPUTSTVO_OBUKA_INZENJER_MODUL2.md)*  
*SPC karte detaljno: [UPUTSTVO_SPC_KARTE_I_ANALITIKA.md](./UPUTSTVO_SPC_KARTE_I_ANALITIKA.md)*
