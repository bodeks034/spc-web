# SPC Kontrola kvaliteta — pregled i uputstva

**Verzija:** jun 2026 · **Aplikacija:** SPC Web (React + Supabase)

Ovaj dokument povezuje komplet uputstva za obuku. Štampaj A4 dokumente ispod ili prosledi operaterima / inženjerima.

---

## Šta je ovaj program?

| Pitanje | Odgovor |
|---------|---------|
| **Da li je MES?** | **Ne.** Nema planiranja proizvodnje, dispatch-a, BOM routing-a, materijala. |
| **Da li je SPC?** | **Da** — kontrolne karte, granice, Cp/Cpk, Western Electric pravila, stabilnost. |
| **Da li je QMS?** | **Da** — OK/NOK, AQL, 8D, eskalacije, trasabilitet, audit log. |
| **Kako predstaviti firmi?** | **QMS + SPC sistem za kontrolu kvaliteta** sa shop-floor unosom (tablet, barkod, RN). |

---

## Dve dimenzije — ne mešati

### 1) Modul 1 vs Modul 2 (režim rada)

| | Modul 1 — Linija | Modul 2 — Analitika |
|--|------------------|---------------------|
| Gde | Fabrika (tablet) | Kancelarija (PC) |
| Ko | Operator, kontrolor (uvek Modul 1) | Inženjer, šef, admin (biraju na početnom ekranu) |
| UI | Wizard: ID → poka-yoke → unos | Pun meni tabova |

### 2) Atributivne vs Merljive (tip kontrole)

| | Atributivne | Merljive |
|--|-------------|----------|
| Rezultat | OK / NOK | Broj (mm, °, …) |
| SPC | p, np, C, u, Pareto | X̄, R, I, MR, Cp/Cpk |
| Ulaz | Kartica „Atributivne kontrole“ | „Ručni“ ili „Digitalni“ unos |

---

## Uloge

| Uloga | Modul | Tipičan posao |
|-------|-------|---------------|
| Operator | 1 | Unos merenja |
| Kontrolor | 1 | Unos + LOG |
| Inženjer kvaliteta | 1 ili 2 | SPC, granice, 8D, Excel uvoz granica |
| Šef | 1 ili 2 | Dashboard, izveštaji (bez Excel uvoza) |
| Admin | Sve + Admin panel | Radnici, lozinke, pun Excel uvoz |

---

## Dokumenti za obuku (A4)

| Dokument | Za koga | Sadržaj |
|----------|---------|---------|
| **[OBUKA_SPC_KOMPLET.html](./OBUKA_SPC_KOMPLET.html)** | **Svi — jedan PDF** | Komplet obuka aplikacije (Modul 1/2, SPC) |
| **[OBUKA_EXCEL_UNOS.html](./OBUKA_EXCEL_UNOS.html)** | **Inženjer / admin** | Gde se šta unosi u Excelu — tab po tab |
| [UPUTSTVO_EXCEL_UNOS_OBUKA.md](./UPUTSTVO_EXCEL_UNOS_OBUKA.md) | Inženjer / admin | Kratak pregled Excel uvoza |
| [UPUTSTVO_OBUKA_OPERATER_MODUL1.md](./UPUTSTVO_OBUKA_OPERATER_MODUL1.md) | Operater, kontrolor | Prijava, wizard, poka-yoke, unos |
| [UPUTSTVO_OBUKA_INZENJER_MODUL2.md](./UPUTSTVO_OBUKA_INZENJER_MODUL2.md) | Inženjer, šef | Analitika, tabovi, RN, 8D, Excel |
| [UPUTSTVO_SPC_KARTE_I_ANALITIKA.md](./UPUTSTVO_SPC_KARTE_I_ANALITIKA.md) | Inženjer kvaliteta | **Detaljno: SPC karte i analitika** |

---

## Tehnička dokumentacija (IT / admin)

- [UPUTSTVO_SIFARNIK_I_EXCEL.md](./UPUTSTVO_SIFARNIK_I_EXCEL.md) — Excel šifrarnik
- [UPUTSTVO_ERP_RADNI_NALOZI.md](./UPUTSTVO_ERP_RADNI_NALOZI.md) — uvoz RN iz ERP
- [UPUTSTVO_BARKOD_I_MERILA.md](./UPUTSTVO_BARKOD_I_MERILA.md) — barkod i digitalna merila
- [INVESTICIONI_PREGLED_FIRMA.md](./INVESTICIONI_PREGLED_FIRMA.md) — poslovni pregled

---

## Brza navigacija

```
PRIJAVA
  ↓
POČETNI EKRAN
  ├── [Modul 1 — Linija | Modul 2 — Analitika]  ← samo inženjer/šef/admin
  ├── Atributivne kontrole
  ├── Varijabilne — ručni / digitalni
  └── Admin Panel (samo admin)
```

**Modul 1 — koraci unosa**

- Atributivne: ID → POKA-YOKE → UNOS → SNIMI
- Merljive: ID/SERIJA → POKA-YOKE → UNOS MERENJA
