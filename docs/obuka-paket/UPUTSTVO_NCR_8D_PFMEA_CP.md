# Radno uputstvo — Upravljanje neusaglašenostima (NCR) i rešavanje problema (8D)

**Verzija:** 1.0 · **Datum:** 2026  
**Predmet:** Postupak od uočavanja greške do trajnog otklanjanja uzroka kroz ažuriranje PFMEA i Plana kontrole.  
**Primenjuje se na:** Sve pogone i sektore (do ~500 zaposlenih).  
**Cilj:** Brza izolacija loše robe i efikasno rešavanje problema **bez suvišne administracije**.

**Povezani dokumenti u aplikaciji:**

| Dokument | Gde u aplikaciji |
|----------|------------------|
| NCR Registar + Obrazac | Modul 2 → **NCR** (tab Registar / Obrazac) |
| NCR sa linije | Modul 1 → tab **UNOS** → dugme **NCR** |
| 8D izveštaj | Modul 2 → **8D** |
| PFMEA / Control Plan | Modul 2 → **PFMEA / CP** |
| Folder dokumentacije | Modul 2 → NCR → tab **Folder kvaliteta** |

**Folder na računaru:** `KONTROLA_KVALITETA/` (Excel NCR, Word 8D, PFMEA/CP po procesu).

---

## Brzi rezime — ko šta radi

| Uloga | Odgovornost |
|-------|-------------|
| **Operater / magacioner** | Uočava grešku → obaveštava kontrolora → pomaže pri fizičkom karantinu |
| **Kontrolor kvaliteta** | Otvara **NCR** → karantin → containment → učestvuje u dispoziciji |
| **Rukovodilac proizvodnje / Kvalitet** | Dispozicija robe → odluka da li ide **8D** → zatvaranje NCR |
| **Inženjer kvaliteta / Tehnolog** | Vodi **8D** (D4–D6) → ažurira **PFMEA** i **Control Plan** (D7) |
| **Rukovodilac kvaliteta** | Odobrava zatvaranje **8D** (D8) nakon verifikacije efikasnosti |

---

## TOK POSTUPKA (pregled)

```
Greška uočena
    ↓
KORAK 1 — NCR + karantin (hitno)
    ↓
KORAK 2 — Dispozicija (škart / dorada / odstupanje)
    ↓
    ├─ Izolovani slučaj? → Zatvori NCR (KRAJ)
    └─ Okidač 8D? → KORAK 3
              ↓
KORAK 4 — 8D izveštaj (D1–D8)
              ↓
KORAK 5 — PFMEA + Control Plan (D7)
              ↓
KORAK 6 — Verifikacija i zatvaranje
```

---

## KORAK 1 — Detekcija greške i otvaranje NCR-a („Gašenje požara“)

Svaka neusaglašenost — na **ulaznoj kontroli**, u **proizvodnji** ili **pre isporuke** — mora se odmah evidentirati.

### Ko radi

- Kontrolor kvaliteta (primarno)
- Operater ili magacioner koji je uočio grešku (obaveštava kontrolora i pomaže pri izolaciji)

### Hitna mera — karantin

1. Loši komadi se **odmah fizički odvajaju** od ispravne robe.
2. Na njih se lepi **crvena nalepnica „KARANTIN“** (ili označavanje prema internom standardu).
3. Roba u karantinu **ne sme** ići dalje u proces, montažu ili ka kupcu dok se ne donese dispozicija.

> U aplikaciji: alarm / karantin na liniji → tab **ODOBRENJA** (Modul 2) ili direktno **NCR**.

### Evidencija — NCR obrazac

Otvara se **NCR obrazac** i popunjava minimum:

| Polje | Šta upisati |
|-------|-------------|
| ID deo | Šifra dela |
| Pogon / linija / mašina | Gde je greška uočena |
| Opis | Šta nije u redu (konkretno, merljivo) |
| Količina | Proizvedena / sumnjiva / neispravna |
| Detektovao | Ko je uočio |
| Containment mere | Šta je odmah urađeno (karantin, stop linije…) |
| Status | **OPEN** → zatim **CONTAINMENT** |

### Kako u aplikaciji

| Situacija | Put |
|-----------|-----|
| **Modul 1 — unos na liniji** | Tab **UNOS** → dugme **NCR** (prefill iz trenutnog dela/RN/linije) |
| **Modul 2 — kancelarija** | Tab **NCR** → **+ Novi NCR** ili izbor reda u **Registru** |
| **Iz SPC alarma** | **ODOBRENJA** → Kreiraj NCR / Otvori NCR |
| **Prazan obrazac za štampu** | NCR → **🖨 Prazan obrazac** (ručno popunjavanje na papiru) |

**Jedan unos = Registar + Obrazac.** Podaci se ne unose dvaput — čuvanjem NCR-a ažurira se i Excel `NCR_Registar_i_Obrazac.xlsx` u folderu (ako je folder povezan).

---

## KORAK 2 — Donošenje odluke o robi (Dispozicija)

Unutar NCR-a, ovlašćeno lice (**Rukovodilac proizvodnje** ili **Kvalitet**) donosi konačnu odluku šta raditi sa izolovanom robom.

| Opcija | Opis | NCR status |
|--------|------|------------|
| **A — Škart** | Roba je nepopravljiva → otpad, otpis sa stanja | → **CLOSED** |
| **B — Dorada** | Popravka po instrukciji → ponovna kontrola → puštanje ako OK | → **CLOSED** |
| **C — Odstupanje** | Van specifikacije, ali funkcionalna → **pismeno odobrenje** Inženjeringa ili Kupca | → **CLOSED** |

Polja u obrascu: **Dispozicija**, **Odobrio dispoziciju**, **Datum zatvaranja** (kada je završeno).

### Kada se ovde završava (bez 8D)

Ako je greška:

- **Izolovana** (jednokratna),
- **Bez uticaja na kupca**,
- **Bez aktiviranog okidača za 8D** (vidi Korak 3),

→ NCR se zatvara nakon dispozicije. **Ne otvara se 8D** — nema suvišne administracije.

---

## KORAK 3 — Filter: Kada se pokreće 8D izveštaj?

Problem se podiže na viši nivo (**8D**) samo ako je ispunjen **bar jedan** od **4 okidača** (aplikacija ih automatski proverava i prikazuje na NCR obrascu).

| # | Okidač | Pravilo (aplikacija) |
|---|--------|----------------------|
| **1** | **Eksterna reklamacija kupca** | Upisan broj reklamacije **ili** „Uticaj na kupca = DA“ → **8D obavezan 100 %** |
| **2** | **Ponovljeni NCR / sistemska greška** | Isti deo + ista linija **ili** sličan opis u poslednjih **45 dana** (prethodni NCR u registru) |
| **3** | **Finansijski trošak ili velika količina** | Trošak škarta **≥ 500 €**, **ili** neispravna količina **≥ 50 kom**, **ili** sumnjiva **≥ 100 kom** |
| **4** | **SC / CC karakteristika** | Greška na **Specijalnoj (SC)** ili **Kritičnoj (CC)** karakteristici (bezbednost / funkcija proizvoda) |

### Pravilo u NCR obrascu

- Kolona **„8D pokrenut“** = **DA** kada je bar jedan okidač aktivan.
- Aplikacija nudi dugme **„Primeni preporuku“** — automatski postavlja 8D pokrenut = DA i upisuje razlog.
- **NCR se ne može zatvoriti** dok je 8D obavezan a nije povezan 8D izveštaj.

### SC / CC — posebna pažnja

Ako je greška na karakteristici označenoj u tehničkoj dokumentaciji kao **SC** (Specijalna) ili **CC** (Kritična):

- Rizik za bezbednost vozila/proizvoda ili funkciju celog sistema je prevelik.
- **Odmah se pokreće 8D** — nije dovoljno samo otpisati u NCR-u.

---

## KORAK 4 — Rešavanje problema kroz 8 disciplina (8D)

Kada je okidač aktivan, Rukovodilac kvaliteta nalaže pokretanje **8D izveštaja** (zamenjuje klasični CAPA dokument).

### Faze 8D

| Disciplina | Sadržaj | Tipični nosioci |
|------------|---------|-----------------|
| **D1 — Tim** | Voditelj, članovi (Proizvodnja, Kvalitet, Tehnologija) | Ruk. kvaliteta |
| **D2 — Opis problema** | 5W: ko, šta, gde, kada, koliko | Tim |
| **D3 — Privremena akcija** | Hitne mere na liniji (100 % kontrola, stop, sortiranje…) | Proizvodnja + Kvalitet |
| **D4 — Uzrok** | 5×Zašto, Ishikawa (6M), potvrđeni koren | Tehnologija / Inženjer |
| **D5 — Korektivna akcija** | Trajna rešenja (softverska blokada, Poka-Yoke, promena postupka…) | Tehnologija |
| **D6 — Implementacija** | Plan ko / šta / do kada | Tim |
| **D7 — Prevencija** | PFMEA + Control Plan (Korak 5) | Inženjer kvaliteta |
| **D8 — Zaključak** | Validacija, zatvaranje, potpis | Ruk. kvaliteta |

### Kako u aplikaciji

1. Iz NCR obrasca: **Otvori 8D** (prefill iz NCR podataka).
2. Modul 2 → tab **8D** → **+ Novi 8D** ili izbor postojećeg.
3. Popuniti sekcije D1–D8 → **Sačuvaj**.
4. **Štampaj / Word / PDF** — Word se automatski snima u `KONTROLA_KVALITETA/02_8D_Izvestaji/` (ako je folder povezan).
5. **Prazan obrazac:** dugme **🖨 Prazan obrazac** na listi 8D (za radionicu / ručno popunjavanje).

### Veza NCR ↔ 8D

- U NCR obrascu: polja **8D pokrenut**, **8D broj**.
- Nakon snimanja 8D, NCR i 8D su povezani u bazi (workflow veza).

---

## KORAK 5 — Sistemska preventiva (PFMEA i Control Plan)

**Ključni korak za ISO audit.** 8D se **ne zatvara** dok se ne uradi **D7 — Sprečavanje ponavljanja**.

### 5.1 Izmena PFMEA

1. Otvoriti **PFMEA** za proces/pogon gde je greška nastala.
2. Modul 2 → **PFMEA / CP** → izabrati deo i proces.
3. Ako greška **nije bila predviđena** — dodati novi red (mod neusaglašenosti, uzrok, posledica).
4. Ako **jeste predviđena** — podići ocenu **učestalosti (O)** ili **detekcije (D)** → preračunati **RPN**.
5. Definisati **preporučenu kontrolu** (nova metoda, učestalost, odgovornost).

### 5.2 Izmena Control Plan-a

Na osnovu izmene PFMEA:

1. Otvoriti **Control Plan** za isti proces.
2. Uvesti **novu ili strožu** kontrolu na operaciji (npr. 100 % umesto uzorka, dodatna mera, Poka-Yoke provera).
3. Usaglasiti sa **Kontrolnim planom** u Modulu 2 → **KONTROLNI PLAN** (SPC karakteristike).

### 5.3 Prenos iz 8D u PFMEA/CP (aplikacija)

- U editoru 8D: dugme **Otvori PFMEA/CP** — prefill iz D4/D5/D6 u PFMEA i Control Plan redove.
- Dokumenti se čuvaju u modulu **PFMEA / CP** i u folderu `03_Inzenjering_Kvaliteta/Proces_{pogon}/`.

### Referenca u 8D

U sekciji **PFMEA ref** i **Control Plan ref** upisati broj revizije ažuriranih dokumenata.

---

## KORAK 6 — Praćenje efektivnosti i zatvaranje

| Korak | Ko | Šta |
|-------|-----|-----|
| 1 | Tim | Prati proces kroz **naredne 3 serije** ili **30 dana** |
| 2 | Kvalitet | Proverava da li se greška **nije ponovila** |
| 3 | Inženjer | Potvrđuje da su **PFMEA i CP** odobreni i u produkciji |
| 4 | Ruk. kvaliteta | Popunjava **D8 — Zaključak**, status 8D → **Završen** |
| 5 | Kvalitet | Zatvara **NCR** (status **CLOSED**, verifikacija efikasnosti) |

### Kriterijumi zatvaranja

- [ ] D1–D8 popunjeni
- [ ] PFMEA revidiran i odobren
- [ ] Control Plan ažuriran
- [ ] Verifikacija: **0 ponavljanja** u dogovorenom periodu
- [ ] Lesson Learned distribuiran timu (opciono interno)

---

## Statusi NCR u aplikaciji

| Status | Značenje |
|--------|----------|
| **OPEN** | NCR otvoren, opis i osnovni podaci |
| **CONTAINMENT** | Karantin / privremene mere aktivne |
| **DISPOSITION** | Doneta odluka o robi (škart/dorada/odstupanje) |
| **VERIFICATION** | Provera efikasnosti mera |
| **8D IN PROGRESS** | 8D izveštaj u toku |
| **CLOSED** | Zatvoren — arhiva |

---

## Folder KONTROLA_KVALITETA (dokumentacija na disku)

```
KONTROLA_KVALITETA/
├── 01_NCR_Sistem/
│   └── NCR_Registar_i_Obrazac.xlsx    ← jedan fajl, svi pogoni
├── 02_8D_Izvestaji/
│   └── 8D_YYYY_NNN_Opis.doc            ← zasebni Word po 8D
└── 03_Inzenjering_Kvaliteta/
    └── Proces_{pogon}/
        ├── PFMEA_{pogon}.xlsx
        └── Control_Plan_{pogon}.xlsx
```

**Povezivanje:** Modul 2 → NCR → tab **Folder kvaliteta** → **Kreiraj / poveži folder** (Chrome/Edge).

---

## Česta pitanja (FAQ)

**Da li svaki NOK na liniji mora imati NCR?**  
Ne mora formalni NCR za svaku pojedinačnu meru u LOG-u, ali **svaka značajna neusaglašenost** (količina, ponavljanje, rizik) mora imati NCR.

**Može li NCR bez 8D?**  
Da — ako nijedan okidač nije aktivan i dispozicija je završena.

**Ko sme zatvoriti NCR kada je 8D obavezan?**  
Samo kada je 8D izveštaj kreiran/povezan i popunjen do D8. Aplikacija blokira zatvaranje.

**Gde štampati prazan obrazac?**  
NCR → **🖨 Prazan obrazac** · 8D → **🖨 Prazan obrazac** · Folder kvaliteta → prečice za oba.

---

## Checklist — brza provera pre zatvaranja

### NCR (bez 8D)

- [ ] Karantin izvršen i dokumentovan
- [ ] Dispozicija doneta i odobrena
- [ ] Containment mere zapisane
- [ ] Status → CLOSED

### NCR + 8D

- [ ] Bar jedan okidač dokumentovan
- [ ] 8D pokrenut = DA, broj 8D upisan
- [ ] D1–D8 kompletan
- [ ] PFMEA i CP revidirani (D7)
- [ ] Verifikacija 3 serije / 30 dana
- [ ] NCR i 8D zatvoreni

---

## Revizije dokumenta

| Verzija | Datum | Izmene |
|---------|-------|--------|
| 1.0 | 2026 | Inicijalno — usklađeno sa SPC Web modulom NCR/8D/PFMEA/CP |

**Odobrio:** _________________________  **Datum:** ___________

**Distribucija:** Kvalitet · Proizvodnja · Tehnologija · Svi kontrolori
