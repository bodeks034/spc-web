# Obuka — Inženjer kvaliteta i menadžment (Modul 2 — Analitika)

**SPC Kontrola kvaliteta · Modul 2 — Analitika**  
Format: A4 · jun 2026

---

## 1. Ulaz u Modul 2

1. **Prijava** (email + lozinka).
2. Na **početnom ekranu** izaberite **📊 Modul 2 — Analitika** (gore).
3. Zatim karticu:
   - **Atributivne kontrole** — OK/NOK podaci
   - **Varijabilne — ručni / digitalni** — brojčana merenja

> Prebacivanje Modul 1 ↔ 2 radi **samo na početnom ekranu**, ne iz tabova unutar modula.

| Uloga | Modul 2 | Excel uvoz granica | Admin |
|-------|---------|-------------------|-------|
| Inženjer kvaliteta | Da | Da (samo merljive granice) | Ne |
| Šef | Da | Ne (samo izvoz) | Ne |
| Admin | Da | Da (preko Admin panela — pun uvoz) | Da |

---

## 2. Šta je analitika u ovom programu?

**Analitika** = sve što se radi **posle unosa sa linije**:

- Da li proces **stabilan**? (SPC karte)
- Da li proces **sposoban**? (Cp/Cpk)
- **Koje greške dominiraju**? (Pareto)
- Da li trend **pogoršava**? (RTY, DPMO, dashboard)
- **Trag** po delu / seriji (trasabilitet)
- **Korektivne mere** (8D, eskalacije, STANJE)

Podaci dolaze iz **kontrolni_log** (atributivne) i **merenja_varijabilna** (merljive) — unosi operateri u Modulu 1.

---

## 3. Tabovi — Atributivne (Modul 2)

| Tab | Namena | Kada koristiti |
|-----|--------|----------------|
| **UNOS** | Unos sa PC-a | Retko; linija koristi Modul 1 |
| **LOG** | Istorija unosa | Reklamacija, provera unosa |
| **SPC KARTE** | p, np, C, u, Pareto… | Dnevni / nedeljni pregled procesa |
| **DASHBOARD** | Pregled smene/dana | Brzi status linije |
| **STANJE** | Inteligencija procesa | Predikcija, predlog korektivnih mera |
| **ESKALACIJE / 8D** | Problemi i rešenja | Van kontrole, ponavljajuće greške |
| **AQL** | Plan uzorka ISO 2859 | Kontrola serije po AQL pravilima |
| **FOTO** | NOK fotografije | Dokaz, analiza defekta |
| **OEE** | KPI linije | Produktivnost + kvalitet |
| **TRASABILITET** | Trag po delu | Od RN do merenja |
| **EXCEL** | Izvoz / ograničen uvoz | Inženjer: izvoz + uvoz granica |
| **ADMIN** | Admin funkcije | Samo admin |

---

## 4. Tabovi — Merljive (Modul 2)

| Tab | Namena |
|-----|--------|
| **SPC KARTE** | X̄, R, I, MR, Cp/Cpk, heatmap, histogram… |
| **STANJE** | Cp/Cpk po poziciji, predikcija, korektivne mere |
| **SMENA** | Statistika smene |
| **MSA / Gage R&R** | Validacija merila |
| **HEAT MAP** | Koje pozicije najčešće padaju |
| **CILJEVI** | PPM / RTY ciljevi |
| **NALOZI** | Radni nalozi (ručno + CSV ERP) |
| **STABILNOST** | Da li je proces stabilan pre Cp/Cpk |
| **LOG / TRASABILITET** | Istorija merenja |
| **EXCEL** | Izvoz merenja; inženjer uvozi **karakteristike_merljive** |

> **Detaljno o SPC kartama:** [UPUTSTVO_SPC_KARTE_I_ANALITIKA.md](./UPUTSTVO_SPC_KARTE_I_ANALITIKA.md)

---

## 5. Tipičan rad inženjera — dnevno

### Jutro (15 min)

1. Modul 2 → **DASHBOARD** ili **STANJE**
2. Proverite **alarme** / crvene indikatore
3. Otvorite **SPC KARTE** za delove koji su bili problem juče

### Tokom dana

- **LOG / TRASABILITET** — reklamacija od kupca → pronađite seriju
- **8D / eskalacije** — otvorite ili ažurirajte korektivne mere
- **AQL** — ako je serija na granici odluke

### Nedeljno

- **Pareto** — top 3 greške (atributivne i merljive)
- **Gage R&R** — merilo koje sumnjate
- **OEE / smena** — sastanak sa šefom linije
- **STABILNOST + Cp/Cpk** — kapabilitet pre izveštaja kupcu

---

## 6. Radni nalozi

**Tab NALOZI** (oba modula):

- Ručni unos RN
- **CSV uvoz (ERP)** — automatski predlog RN pri skenu ID dela

Detalji: [UPUTSTVO_ERP_RADNI_NALOZI.md](./UPUTSTVO_ERP_RADNI_NALOZI.md)

---

## 7. Excel i šifrarnik

| Ko | Šta |
|----|-----|
| **Inženjer** | Tab EXCEL → izvoz merenja; uvoz **samo granica** (karakteristike_merljive) |
| **Admin** | Admin panel → pun uvoz master Excela (delovi, radnici, RN…) |

**Pravilo šifrarnika:**

- `merni_instrument = Vizuelno` → atributivne kontrole
- Ostalo sa LSL/USL → merljive kontrole

Detalji: [UPUTSTVO_SIFARNIK_I_EXCEL.md](./UPUTSTVO_SIFARNIK_I_EXCEL.md)

**Važno:** Excel uvoz **ne deaktivira** radnike automatski — kolona `aktivan` menja status samo ako piše eksplicitno DA ili NE.

---

## 8. 8D i eskalacije — kada?

| Situacija | Akcija |
|-----------|--------|
| Tačka van kontrole na SPC karti (Western Electric) | Proveri uzrok → eskalacija |
| Pareto: ista greška 3+ dana zaredom | Otvori 8D |
| Cp/Cpk < 1.0 | Korektivna mera + verifikacija na karti |
| Reklamacija kupca | TRASABILITET → 8D |

Tab **STANJE** može predložiti korektivnu meru i eskalaciju inženjeru.

---

## 9. Šef / menadžment

- Isti tabovi kao inženjer **osim** Excel uvoza i Admin panela
- Fokus: **DASHBOARD**, **OEE**, **SPC KARTE** (Pareto, RTY), **8D** pregled
- Ne menja granice — to radi inženjer kvaliteta

---

## 10. Modul 1 vs Modul 2 — kada šta?

| Situacija | Modul |
|-----------|-------|
| Obilazak linije, brza provera unosa | Modul 1 — Linija |
| Analiza trenda, izveštaj, Cp/Cpk | Modul 2 — Analitika |
| Obuka operatera | Modul 1 (poka-yoke, unos) |
| Obuka inženjera | Modul 2 + [SPC uputstvo](./UPUTSTVO_SPC_KARTE_I_ANALITIKA.md) |

---

## 11. Rezime

```
INŽENJER — tipičan dan
  Modul 2 → Analitika → (Atributivne ili Merljive)
  → STANJE / DASHBOARD (alarmi)
  → SPC KARTE (trend, van kontrole)
  → Pareto / 8D (korektivno)
  → TRASABILITET (ako reklamacija)
  → EXCEL izvoz (izveštaj)
```

**Vaš cilj nije samo „gledati karte“** — karte pokazuju **kada** i **gde** proces odstupa; vi donosite odluku i pokrećete korektivne mere.

---

*Detaljno SPC karte: [UPUTSTVO_SPC_KARTE_I_ANALITIKA.md](./UPUTSTVO_SPC_KARTE_I_ANALITIKA.md)*  
*Operateri: [UPUTSTVO_OBUKA_OPERATER_MODUL1.md](./UPUTSTVO_OBUKA_OPERATER_MODUL1.md)*
