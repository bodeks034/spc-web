# Uputstvo — ISO 2859 AQL kalkulator (atributivne)

**Putanja u aplikaciji:** Atributivne → Analitika → Kvalitet → **ISO 2859**

Za merljive dimenzije (mm, Nm…) koristi **ISO 3951** u merljivom modulu.

---

## 1. Šta radi ovaj kalkulator?

Procenjuje **prihvatanje ili odbijanje lota** na osnovu **broja NOK defekata** po klasama (Critical / Major / Minor), prema **ISO 2859-1** / ANSI Z1.4.

Na **unosu atributivnih** isti AQL radi automatski (lot iz RN, NOK iz liste). Ovaj tab je za **ručni proračun** i „what-if“ analizu.

---

## 2. Koraci

### Korak 1 — Lot i inspekcija

1. Unesi **veličinu lota** (komada u seriji).
2. Izaberi **nivo inspekcije** (obično **II**).
3. Izaberi **tip inspekcije:**
   - **Normalna** — standardni uzorak
   - **Pojačana** — veći uzorak / strožiji Ac/Re
   - **Smanjena** — manji uzorak (Table II-C); posebno pravilo †

Prikazuje se **kod slova** (Table I) i referentni **n**.

### Korak 2 — Klase defekata

Za svaku klasu (Critical, Major, Minor):

| Polje | Značenje |
|-------|----------|
| **AQL %** | Nivo kvaliteta za tu klasu |
| **Kod / n** | Veličina uzorka za tu klasu |
| **Ac / Re** | Prihvati ako NOK ≤ Ac; odbaci ako NOK ≥ Re |
| **Pronađeno NOK** | Broj defekata u uzorku |

**Critical AQL 0** = 100% inspekcija, nijedan defekt nije dozvoljen.

### Korak 3 — Odluka po klasi

- **PRIHVATI** — NOK ≤ Ac  
- **ODBACI** — NOK ≥ Re  
- Između Ac i Re — zona granične odluke (smanjena inspekcija ima posebno pravilo †)

### Korak 4 — Konačna odluka lota

Lot je **ODBACI** ako bilo koja klasa padne. Inače **PRIHVATI** (ili granična zona po pravilima).

---

## 3. Primer

| Parametar | Vrednost |
|-----------|----------|
| Lot | 5 000 |
| Nivo | II |
| Tip | Normalna |
| Kod | L |
| Major AQL | 2,5% |
| Major n / Ac / Re | n=200, Ac=10, Re=11 |

Ako u uzorku od 200 komada imaš **8 Major NOK** → Major **PRIHVATI**.  
Ako ukupno sve klase prolaze → lot **PRIHVATI**.

---

## 4. Veza sa unosom

| Gde | Šta |
|-----|-----|
| **Unos atributivnih** | AQL panel — lot iz RN, NOK iz liste u realnom vremenu |
| **Tab ISO 2859** | Ručni kalkulator bez ID dela |
| **Excel** | `docs/AQL_Kalkulator.xlsm` — ista logika |

---

## 5. Napomene

- Mapiranje greške na klasu (C/M/m) ide po kategoriji u šifrarniku.
- Za dimenzije i merne vrednosti koristi **ISO 3951**, ne ovaj kalkulator.
- Strelica ↑↓ u planu znači da se kod slova pomera prema Table II (kao u Excel VBA modulu).
