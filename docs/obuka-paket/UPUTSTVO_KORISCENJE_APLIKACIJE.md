# SPC Kontrola kvaliteta — indeks uputstava

**Verzija:** avg 2026 · **Aplikacija:** SPC Web (React + Supabase)

Ovaj fajl je **kratki indeks**. Detalje traži u dokumentima ispod — ne dupliraj Modul 0 uputstvo ovde.

U aplikaciji: **Početni ekran → 📘 Uputstvo** (filtrirano po ulozi).

---

## Počni ovde

| Ko | Dokument |
|----|----------|
| **Svi** | [CITAJ_ME.md](./CITAJ_ME.md) — mapa celog paketa obuke |
| **Pregled aplikacije (A4)** | [OBUKA_SPC_KOMPLET.html](./OBUKA_SPC_KOMPLET.html) |
| **Operater — Modul 1** | [OBUKA_OPERATER_MODUL1.html](./OBUKA_OPERATER_MODUL1.html) |
| **Inženjer — Modul 2** | [OBUKA_INZENJER_MODUL2.html](./OBUKA_INZENJER_MODUL2.html) |
| **Šifrarnik — Modul 0** | [UPUTSTVO_MODUL_SIFARNIK.md](./UPUTSTVO_MODUL_SIFARNIK.md) (+ [OBUKA_MODUL_SIFARNIK.html](./OBUKA_MODUL_SIFARNIK.html) za štampu) |

---

## Tri modula (kratko)

| Modul | Ko | Šta |
|-------|-----|-----|
| **0 Šifrarnik** | Kvalitet, šef, admin | Delovi, dimenzije, greške, RN, ERP CSV, barkod |
| **1 Unos** | Operater, kontrolor | Merenja, LOG, FAI, MOMENT na liniji |
| **2 Analiza** | Kvalitet, šef, admin | Karte, NCR, 8D, predaja smene |

Prekidač Modul 1 ↔ 2: **samo na početnom ekranu**.

---

## Specijalistički i IT

| Tema | Dokument |
|------|----------|
| Novi deo | [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md) |
| Glavni unos | [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) |
| ERP CSV | [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md) |
| NCR / 8D | [UPUTSTVO_NCR_8D_PFMEA_CP.md](./UPUTSTVO_NCR_8D_PFMEA_CP.md) |
| Go-live | [GO_LIVE_RUNBOOK.md](./GO_LIVE_RUNBOOK.md) |
| Deploy / test | [UPUTSTVO_TESTIRANJE_I_DEPLOY.md](./UPUTSTVO_TESTIRANJE_I_DEPLOY.md) |

---

## Sync u aplikaciju

```powershell
npm run sync:uputstvo
```

Kopira `docs/obuka-paket/` → `public/obuka-paket/` i ažurira AUTO blokove u OBUKA HTML iz §X u `UPUTSTVO_MODUL_SIFARNIK.md`.

---

## Zapamti

1. Linija **unosi**, šifrarnik **priprema**, analiza **reaguje**.
2. ERP masovni uvoz = **CSV** (ne Excel u ERP tabu).
3. LOG nastaje u **Modulu 1**, ne u šifrarniku.
