# Obuka — paket materijala

Izvor: `docs/obuka-paket/` · u aplikaciji: `/obuka-paket/` · sync: `npm run sync:uputstvo`

U aplikaciji: **Početni ekran → 📘 Uputstvo → Obuka paket**.

---

## Počni ovde

| Ko | Dokument | Format |
|----|----------|--------|
| **Svi (pregled)** | `OBUKA_SPC_KOMPLET.html` | HTML / štampa |
| **Inženjer / kvalitet — Modul 0** | **`UPUTSTVO_MODUL_SIFARNIK.md`** | Markdown — **glavno uputstvo** |
| **Isti sadržaj — štampa A4** | `OBUKA_MODUL_SIFARNIK.html` | auto iz MD §X (SYNC blokovi) |
| **Novi deo korak-po-korak** | `UPUTSTVO_NOVI_DEO_SIFARNIK.md` | procedura |
| **Linije VOZ / PRO** | `UPUTSTVO_LINIJE_VOZ_PRO.md` | **Radni režim** (dnevni sto), Hub fokus, Brzi start, folderi crteža |
| **Operater — Modul 1** | `OBUKA_OPERATER_MODUL1.html` | HTML |

### Struktura `UPUTSTVO_MODUL_SIFARNIK.md`

| Deo | Šta čitaš |
|-----|-----------|
| **I–III** | Brzi start · **Radni režim**, načini unosa, pregled tabova |
| **IV** | Referenca — svaki tab (detaljno) |
| **V** | Puštanje, go-live, održavanje |
| **VI–VIII** | Uticaj na module, FAQ, linkovi |
| **IX–X** | Funkcije aplikacije + SYNC za HTML |

---

## Modul 0 — povezano

| Dokument | Tema |
|----------|------|
| [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) | Glavni unos (app + Excel) |
| [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md) | Novi deo |
| [UPUTSTVO_NOVO_VOZILO_SIFARNIK.md](./UPUTSTVO_NOVO_VOZILO_SIFARNIK.md) | Novo vozilo |
| [GO_LIVE_RUNBOOK.md](./GO_LIVE_RUNBOOK.md) | Go-live |

## Modul 1 / 2 / ERP

| Dokument | Tema |
|----------|------|
| `OBUKA_OPERATER_MODUL1.html` | Operater |
| `OBUKA_INZENJER_MODUL2.html` | Modul 2 |
| `UPUTSTVO_ERP_KONFIGURACIJA.md` | ERP CSV |
| `UPUTSTVO_NCR_8D_PFMEA_CP.md` | NCR / 8D |

---

## Ažuriranje

```powershell
npm run sync:uputstvo
```

Kopira `docs/obuka-paket/` → `public/obuka-paket/` i pokreće `patch-obuka-sifrarnik-html.mjs` (SYNC blokovi iz §X u MD).

**Štampa:** označite dokumente → **Štampaj izabrano**, ili HTML → Ctrl+P / Save as PDF.
