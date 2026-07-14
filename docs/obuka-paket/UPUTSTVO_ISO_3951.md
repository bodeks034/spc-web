# Uputstvo — ISO 3951 kalkulator (merljive)

**Putanja u aplikaciji:** Merljive → Analitika → Kvalitet → **ISO 3951**

Za atributivne (OK/NOK) koristi **ISO 2859** u atributivnom modulu.

---

## 1. Šta radi ovaj kalkulator?

Procenjuje da li se **lot prihvata ili odbija** na osnovu **merljive** karakteristike (mm, Nm, itd.), prema **ISO 3951-1** (s-metod, Form k).

Pretpostavke:

- proces je pod statističkom kontrolom;
- merenja su približno normalno raspoređena;
- unete su ispravne granice LSL/USL sa crteža.

---

## 2. Koraci

### Korak 1 — Lot i plan

1. Unesi **veličinu lota** (broj komada u seriji / na RN).
2. Izaberi **nivo inspekcije** (obično **II — normalan**).
3. Izaberi **AQL %** iz ugovora (npr. 1,5%).

Aplikacija prikazuje:

| Polje | Značenje |
|-------|----------|
| **KOD** | Slovo uzorka (ISO 2859-1 Table I) |
| **n (plan)** | Koliko komada izmeriti |
| **k** | Konstanta prihvatanja |
| **% lota** | Udeo uzorka u lotu |

### Korak 2 — Granice

- **Dvostrano:** unesi LSL i USL.
- **Samo gornja:** samo USL (npr. maks. moment).
- **Samo donja:** samo LSL.

Nominala je opciona (informativno).

### Korak 3 — Merenja

Izmeri **n komada** (minimum iz plana). Unesi vrednosti u polje — razmak, zarez ili novi red:

```
10,02 10,01 9,99 10,00 10,03
```

Minimum **2 merenja** za statistiku; preporučeno punih **n** iz plana.

### Korak 4 — Odluka

| Rezultat | Značenje |
|----------|----------|
| **PRIHVATI LOT** | Svi Q ≥ k |
| **ODBACI LOT** | Bar jedan Q &lt; k |

- **Qu** = (USL − x̄) / s  
- **Ql** = (x̄ − LSL) / s  

---

## 3. Primer

| Parametar | Vrednost |
|-----------|----------|
| Lot | 100 |
| Nivo | II |
| AQL | 1,5% |
| Plan | kod F, n=15, k≈1,46 |
| LSL / USL | 9,8 / 10,2 |
| Merenja | 15 vrednosti npr. 10,02 10,01 9,99 10,00 … (ne sve iste) |

Ako su Qu i Ql ≥ 1,46 → **PRIHVATI**.

> **s=0:** Ako su sva merenja identična, s=0 — odluka ide po tome da li je x̄ unutar LSL/USL. Koristi zarez kao decimalu: `10,02` ne `10.02` (oba rade).

> **Napomena:** Kod slova zavisi od veličine lota (ista Table I kao ISO 2859). Za lot **500** (nivo II) plan je **H, n=35**, ne F.

---

## 4. Napomene

- Ne mešaj sa **ISO 2859** (brojanje NOK defekata).
- Za audit čuvaj zapis: lot, n, merenja, x̄, s, odluka.
- Ako ima manje od n merenja, prikazuje se upozorenje — dopuni uzorak pre konačne odluke.
