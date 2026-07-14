# SPC Kontrola kvaliteta — korišćenje aplikacije

**Verzija:** jul 2026 · **Aplikacija:** SPC Web (React + Supabase)

Ovaj dokument je **indeks**. Za obuku štampaj ili otvori HTML/Markdown ispod.

---

## Šta je ovaj program?

| Pitanje | Odgovor |
|---------|---------|
| **Da li je MES?** | **Ne.** Nema planiranja proizvodnje, BOM-a, materijala. |
| **Da li je SPC?** | **Da** — kontrolne karte, granice, Cp/Cpk, alarmi. |
| **Da li je QMS?** | **Da** — OK/NOK, AQL, 8D, NCR, trasabilitet. |
| **Kako reći firmi?** | **QMS + SPC** za kontrolu kvaliteta (tablet, barkod, RN). |

---

## Tri modula (ne mešati)

| Modul | Gde | Ko | Šta |
|-------|-----|----|-----|
| **0 Šifrarnik** | Kancelarija | Kvalitet, šef, admin | Delovi, dimenzije, greške, RN, ERP CSV, barkod |
| **1 Unos (linija)** | Fabrika / tablet | Operater, kontrolor (uvek); ostali po izboru | Merenja, LOG, FAI, MOMENT |
| **2 Analiza** | Kancelarija / PC | Kvalitet, šef, admin | Karte, odobrenja, NCR, 8D, predaja smene |

Prekidač Modul 1 ↔ 2: **samo na početnom ekranu**.

### Dve kontrole

| | Atributivne | Merljive |
|--|-------------|----------|
| Rezultat | OK / NOK | Broj (mm, °…) |
| Kartica | Atributivne kontrole | Ručni ili Digitalni unos |
| SPC | p, C, u… | X̄/R, Cp/Cpk |

---

## Uloge (sažeto)

| Uloga | Tipičan dan |
|-------|-------------|
| Operater | Prijava → kartica → POKA-YOKE → UNOS → Snimi |
| Kontrolor | Isto + LOG (+ FAI / MOMENT kod merljivih) |
| Kvalitet | Modul 2: Pregled, Odobrenja, NCR; Modul 0 po potrebi |
| Šef | Dashboard, predaja smene, izveštaji |
| Admin | Sve + radnici, licenca, ERP, Excel alati |

---

## Dokumenti za obuku (redosled)

### 1) Za sve — počni ovde

| Dokument | Format | Sadržaj |
|----------|--------|---------|
| **[OBUKA_SPC_KOMPLET.html](./OBUKA_SPC_KOMPLET.html)** | HTML A4 | **Cela aplikacija** — uloge, M0/M1/M2, problem→rešenje |
| **[OBUKA_OPERATER_MODUL1.html](./OBUKA_OPERATER_MODUL1.html)** | HTML A4 | Operater / kontrolor — Modul 1 (zlatna pravila, checklist) |
| **[OBUKA_INZENJER_MODUL2.html](./OBUKA_INZENJER_MODUL2.html)** | HTML A4 | Inženjer / šef — Modul 2 |

### 2) Modul 0 — Šifrarnik

| Dokument | Format |
|----------|--------|
| **[OBUKA_MODUL_SIFARNIK.html](./OBUKA_MODUL_SIFARNIK.html)** | HTML A4 štampa |
| [UPUTSTVO_MODUL_SIFARNIK.md](./UPUTSTVO_MODUL_SIFARNIK.md) | MD, svi tabovi + ERP CSV |

### 3) Specijalistički

| Dokument | Tema |
|----------|------|
| [UPUTSTVO_SPC_KARTE_I_ANALITIKA.md](./UPUTSTVO_SPC_KARTE_I_ANALITIKA.md) | SPC karte detaljno |
| [UPUTSTVO_BARKOD_I_MERILA.md](./UPUTSTVO_BARKOD_I_MERILA.md) | Sken, digitalna merila |
| [UPUTSTVO_PRAVLJENJE_BARKODOVA.md](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md) | Etikete |
| [UPUTSTVO_ISO_2859.md](./UPUTSTVO_ISO_2859.md) | AQL atributivne |
| [UPUTSTVO_ISO_3951.md](./UPUTSTVO_ISO_3951.md) | Uzorkovanje merljive |
| [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) | Propagacija glavnog unosa |

### 4) IT / Admin

- [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md) — ERP CSV  
- [UPUTSTVO_SAP_ERP_DROP.md](./UPUTSTVO_SAP_ERP_DROP.md) — drop folder  
- [UPUTSTVO_ERP_RADNI_NALOZI.md](./UPUTSTVO_ERP_RADNI_NALOZI.md) — RN  
- [UPUTSTVO_TESTIRANJE_I_DEPLOY.md](./UPUTSTVO_TESTIRANJE_I_DEPLOY.md), [GO_LIVE_RUNBOOK.md](./GO_LIVE_RUNBOOK.md), [UPUTSTVO_AUTOMATIZACIJA.md](./UPUTSTVO_AUTOMATIZACIJA.md)

U aplikaciji: **Početni ekran → 📘 Uputstvo** (dokumenti filtrirani po ulozi).

---

## Brza mapa ekrana

```
PRIJAVA
  ↓
POČETNI EKRAN
  ├── Predaja smene / KPI     (kvalitet+)
  ├── Modul 0 — Šifrarnik
  ├── [Modul 1 | Modul 2]     (kvalitet+)
  ├── Atributivne / Merljive
  └── Admin                   (admin)
```

**Modul 1:** Kontrolna lista → ID → POKA-YOKE → UNOS → Snimi → (LOG / FAI / MOMENT)  
**Modul 2:** PREGLED → ODOBRENJA / KARTE → NCR / 8D → SMENA  

---

## Zapamti

1. Linija **unosi**, šifrarnik **priprema**, analiza **reaguje**.  
2. ERP masovni uvoz = **CSV**, ne Excel u ERP tabu.  
3. LOG nije u Modulu 2.  
4. Problem: alarm → Odobrenja → NCR → 8D.
