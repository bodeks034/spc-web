# Obuka — Inženjer kvaliteta / šef (Modul 2 + šifrarnik)

**Za koga:** kvalitet, šef, admin (kada radi analitiku).  
**Cilj:** znati gde ulaziš u Modul 2, šta radi svaka grupa tabova, i kako rešavaš probleme sa linije.

---

## 1. Početni ekran — tvoja polazna tačka

Na početku (posle prijave) vidiš:

| Blok | Šta radiš ovde |
|------|----------------|
| **Predaja smene · danas** | KPI, alarmi, pregled po pogonima, PDF predaje |
| **Pregled proizvodnje** | Prioritet smene, zajednički dashboard |
| **KPI dorada / škart** | Unos / korekcija agregata (nije LOG!) |
| Prekidač **Modul 1 / Modul 2** | Linija ↔ Analiza |
| Kartice | Atributivne, Merljive, **Modul 0 Šifrarnik**, Admin (admin) |

**Prebacivanje M1↔M2 samo ovde** — ne unutar forme.

---

## 2. Modul 2 — struktura

Ulaz: **Modul 2 — Analiza** → Atributivne ili Merljive.  
Podrazumevani tab: **PREGLED**.

### Grupe (atributivne)

| Grupa | Tabovi | Svrha |
|-------|--------|-------|
| **Pregled** | PREGLED | Brzi snimak stanja |
| **Analitika** | DASHBOARD · KONTROLNE KARTE · STANJE · OC KRIVA · STABILNOST · MSA / MERILA · KONTROLNI PLAN | SPC i sposobnost |
| **Kvalitet** | ODOBRENJA · NCR / CAPA · 8D · PFMEA / CP · ESKALACIJE · ISO 2859 · KUPAC · TRASABILITET | Akcije + dokumenti |
| **Operativa** | SMENA · OEE · CILJEVI · NALOZI | Smena, OEE, ciljevi, RN |
| **Alati** | EXCEL | Izvoz (uvoz ograničen) |

### Merljive — isto +

| Dodatno | Nema u Modulu 2 |
|---------|-----------------|
| HEAT MAP · ISO 3951 · FAI | UNOS · LOG · CRTEŽ · FOTO |

---

## 3. Dnevni tok (preporuka)

| # | Korak |
|---|--------|
| 1 | Predaja smene / PREGLED — šta je kritično |
| 2 | ODOBRENJA — alarmi, prekidi, kalibracija |
| 3 | KONTROLNE KARTE / STANJE |
| 4 | NCR / 8D po potrebi |
| 5 | SMENA — PDF predaje pred kraj |

---

## 4. Tab po tab — jedna rečenica

| Tab | Jedna rečenica |
|-----|----------------|
| PREGLED / DASHBOARD | „Šta danas gori?“ |
| KONTROLNE KARTE | Grafici p / X̄/R … — da li je proces u kontroli |
| STANJE | Predlog sledeće akcije (inteligencija) |
| OC KRIVA | OC kriva uzorkovanja |
| STABILNOST | Stabilnost perioda |
| HEAT MAP | Toplinska mapa merljivih (mer) |
| MSA / MERILA | Analiza merila / MSA |
| KONTROLNI PLAN | Veza plan kontrole |
| ODOBRENJA | Odobri SPC alarm, prekid, kalibraciju |
| NCR / CAPA | Nesaglasnost + CAPA |
| 8D | Formalni 8D izveštaj |
| PFMEA / CP | FMEA + kontrolni plan |
| ESKALACIJE | Lanac i status eskalacija |
| ISO 2859 | AQL atributivno |
| ISO 3951 | Uzorkovanje merljivo |
| FAI | Odobrenja prve kontrole (mer) |
| KUPAC | PDF/izveštaj za kupca |
| TRASABILITET | Trag po delu / RN / sesiji |
| SMENA | Predaja, pogoni A–I, PDF |
| OEE | OEE / KPI panel |
| CILJEVI | Ciljevi RTY/DPMO |
| NALOZI | Pregled radnih naloga |
| EXCEL | Izvoz; uvoz granica samo kvalitet (ograničeno) |

---

## 5. Od problema do alata

| Signal | Korak |
|--------|-------|
| Alarm na liniji / karantin | **ODOBRENJA** → pa NCR ako treba |
| OOC / trend na karti | **KONTROLNE KARTE** → **STANJE** → NCR / **8D** |
| Istekla kalibracija | **ODOBRENJA** ili Modul 0 Merila |
| Loš deo / nema dimenzija | **Modul 0** |
| Predaja smene | **SMENA** ili početni panel |
| Kupac traži dokaz | **KUPAC** / **TRASABILITET** |

---

## 6. Modul 0 — šta moraš znati

Šifrarnik puni **sve što linija koristi**. Ti (kvalitet) održavaš:

| # | Stavka |
|---|--------|
| 1 | Delove, dimenzije, greške, RN |
| 2 | Pogon mapu A–I |
| 3 | Merila / kalibraciju |
| 4 | Barkod profile |
| 5 | Kontrolnu listu smene |
| 6 | Moment JOB (ako ima digitalnih ključeva) |

**ERP uvoz = CSV samo** (Alati → ERP uvoz).  
**Štampa:** [OBUKA_INZENJER_MODUL2.html](./OBUKA_INZENJER_MODUL2.html) · [OBUKA_MODUL_SIFARNIK.html](./OBUKA_MODUL_SIFARNIK.html)

### Glavni unos

Inženjerski unos dimenzija + **Propagiraj** → merljive / delovi / RN.  
Može `.xlsx` posebnog formata — **nije** ERP master Excel.

---

## 7. Excel — košta šta sme

| Uloga | Excel u M2 / Admin |
|-------|---------------------|
| Kvalitet | Izvoz; uvoz karakteristika ograničen |
| Šef | Izvoz (bez full uvoza) |
| Admin | Pun Excel alat u Admin panelu |

**Nikad:** menjanje LOG-a preko Excela. LOG nastaje na liniji.

---

## 8. Relacija sa linijom

Kada radiš **Modul 1**, tabovi su kao kontrolor (UNOS, LOG, FAI/MOMENT po tipu) — ne puni M2 meni.  
Za analizu se vrati na početni → **Modul 2**.

---

## 9. Checklist kvaliteta — dnevno

| ☐ | Stavka |
|---|--------|
| ☐ | Predaja / PREGLED — alarmi |
| ☐ | ODOBRENJA prazna / obrađena |
| ☐ | Karte kritičnih delova |
| ☐ | Otvoreni NCR / 8D status |
| ☐ | Predaja smene (PDF) pred kraj |

---

## 10. Gde dalje

- Komplet za sve: [OBUKA_SPC_KOMPLET.html](./OBUKA_SPC_KOMPLET.html)  
- SPC detaljno: [UPUTSTVO_SPC_KARTE_I_ANALITIKA.md](./UPUTSTVO_SPC_KARTE_I_ANALITIKA.md)  
- Operater: [OBUKA_OPERATER_MODUL1.html](./OBUKA_OPERATER_MODUL1.html)  
- ISO: [UPUTSTVO_ISO_2859.md](./UPUTSTVO_ISO_2859.md), [UPUTSTVO_ISO_3951.md](./UPUTSTVO_ISO_3951.md)

*Verzija: jul 2026*
