# SPC Web — Roadmap Faza 2 (posle pilota)

**Cilj:** od pilota (~70% zrelosti) do **stabilnog produkcionog sistema** na serveru firme.  
**Prioritet:** shop-floor korist + inženjering kvaliteta, ne „još jedan graf“.

Povezano: `docs/INVESTICIONI_PREGLED_FIRMA.md`, `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md`

---

## Pregled faza

| Faza | Period | Fokus |
|------|--------|-------|
| **0** | Pre starta | Deploy na server firme (bloker) |
| **1** | Nedelje 1–2 | Produkcija + obuka |
| **2** | Nedelje 3–4 | RN/ID + kontrolna lista |
| **3** | Nedelja 5 | SPC baseline UI |
| **4** | Nedelja 6 | Alarm → reakcija + ops |
| **5** | Meseci 2–4 | CAPA, smena PDF, MSA, karantin |

---

## Faza 0 — Deploy (bloker, nije opciono)

| Stavka | Fajlovi / alati | Checklist |
|--------|-----------------|-----------|
| Server + Docker Supabase | `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md` | [ ] |
| SQL migracije 01–21 | `docs/MIGRACIJE.md`, `21_licenca_gate.sql` | [ ] |
| `.env.production` + build | `deploy/env.production.example` | [ ] |
| Nginx + HTTPS | `deploy/nginx-spc.conf.example` | [ ] |
| Backup noćni | `deploy/backup-server-linux.sh` | [ ] |
| IT A4 list | `deploy/IT_A4_POKRETANJE.md` | [ ] |
| Licenca aktivna | `scripts/postavi-licencu.mjs`, `scripts/generisi-licencu.mjs` | [ ] |

**Procena:** 40–80 h (zavisi od IT)

---

## Faza 1 — Nedelje 1–2: Go-live + obuka

### 1.1 Migracija šifrarnika i podataka

| Šta | Gde u kodu / podacima |
|-----|------------------------|
| CSV uvoz | `scripts/import-all-docs.mjs`, `docs/*.csv` |
| Excel master | `src/lib/excelSync.js`, Admin panel u `App.jsx` |
| Storage crteži | `scripts/upload-storage-local.mjs`, bucket `spc-crtezi` |
| Provera šeme | `src/lib/schemaCheck.js`, `SchemaStatusPanel.jsx` |

**Checklist:**
- [ ] `delovi`, `radnici`, `linije`, `masine`, `greske_katalog` uvezeni
- [ ] `karakteristike_merljive` za pilot delove
- [ ] Admin → Status šeme = sve zeleno
- [ ] Test login za 2 operatera + 1 admin

**Procena:** 8–16 h

### 1.2 Obuka (2–4 sata)

| Tema | Gde demonstrirati u app |
|------|-------------------------|
| Linija merljive | `MobilniMerljiviUnos.jsx`, `VarijabilneForma.jsx` |
| Linija atributivne | `MobilniUnos` u `App.jsx` |
| Barkod | `docs/obuka-paket/UPUTSTVO_BARKOD_I_MERILA.md`, `barkod.js` |
| Offline | `src/lib/offlineQueue.js`, `OfflineSyncPanel.jsx` |

**Checklist:**
- [ ] 1 „champion“ operater po liniji
- [ ] Admin zna Excel uvoz i prekid/kalibracija odobrenje

---

## Faza 2 — Nedelje 3–4: RN / ID + kontrolna lista

### 2.1 ERP light — radni nalog bez punog SAP-a

**Poslovni cilj:** −50% grešaka ID/RN (iz investicionog pregleda).

**Šta već postoji:**
- Barkod format `ID|RN|datum|smena` — `src/lib/barkod.js`
- Tabela `radni_nalozi` — `01_supabase_schema.sql`
- Panel nalozi — `RadniNaloziPanel.jsx` (merljive), atributivne admin

**Šta dodati:**

| # | Zadatak | Fajlovi za izmenu / novi |
|---|---------|--------------------------|
| 1 | Dnevni CSV/Excel uvoz naloga iz ERP | `scripts/import-radni-nalozi.mjs`, `src/lib/radniNaloziUvoz.js`, `docs/obuka-paket/UPUTSTVO_ERP_RADNI_NALOZI.md` |
| 2 | Pri skenu ID — automatski predloži RN iz `radni_nalozi` | `VarijabilneForma.jsx`, `App.jsx` (mobilni ID korak), `fetchPlaniranoKomZaDeo` pattern u `zajednickiDashboard.js` |
| 3 | Validacija: RN mora postojati u šifrarniku (opciono upozorenje) | `src/lib/radniNalogValidacija.js` (novi) |
| 4 | Dokumentacija barkod etikete sa RN | `docs/obuka-paket/UPUTSTVO_PRAVLJENJE_BARKODOVA.md` — primer `5502-A\|RN-12345` |
| 5 | Admin: poslednji uvoz naloga, broj aktivnih | `RadniNaloziPanel.jsx` proširenje |

**SQL:** verovatno nije potrebno (tabela postoji). Opciono kolona `aktivan`, `kolicina_plan` u `22_radni_nalozi_erp.sql`.

**Checklist:**
- [x] CSV uvoz iz ERP (`import:radni-nalozi`, panel Nalozi)
- [ ] Pilot delovi imaju RN u bazi
- [x] Barkod sa RN radi na liniji merljive i atributivne (`radniNalog.js`, prioritet barkod > baza > SOP)
- [x] Operater vidi upozorenje ako RN nije u šifrarniku (`proveriRadniNalogUpozorenje` pri snimanju)

**Procena:** 16–24 h

---

### 2.2 Obavezna kontrolna lista pre smene

**Poslovni cilj:** pravi poka-yoke na početku smene.

**Šta već postoji:**
- `KontrolnaLista` — `src/lib/kontrolaSesije.jsx`
- Tabele `kontrolna_lista_stavke`, `kontrolna_lista_log` — `04_kontrolna_lista_policies.sql`
- Bypass: link **„Nastavi bez liste →“** (linija ~105 u `kontrolaSesije.jsx`)

**Šta dodati:**

| # | Zadatak | Fajlovi |
|---|---------|---------|
| 1 | Ukloniti ili sakriti „Nastavi bez liste“ za `operator`/`kontrolor` | `kontrolaSesije.jsx` |
| 2 | Ako nema stavki u bazi — blokada + poruka adminu | `kontrolaSesije.jsx`, seed u `04_…sql` |
| 3 | Podešavanje `app_podesavanja`: `kontrolna_lista_obavezna=1` | `17_notifikacije.sql` seed, `NotifikacijePodesavanja.jsx` ili admin |
| 4 | Merljive: ne dozvoli `linijaKorak=3` dok lista nije OK | `VarijabilneForma.jsx`, `MobilniMerljiviUnos.jsx` |
| 5 | Atributivne: već `listaOk` gate u `App.jsx` — proveriti da ne zaobilazi | `App.jsx` (~3947) |

**Checklist:**
- [x] Uklonjeno „Nastavi bez liste“ (`kontrolaSesije.jsx`)
- [x] Provera iz baze po smeni (`src/lib/kontrolaLista.js`)
- [x] Merljive: blok koraka 3 + ponovna lista pri promeni smene (`VarijabilneForma.jsx`)
- [x] Atributivne: `kontrolnaListaOk` iz baze (`GlavnaForma` u `App.jsx`)
- [ ] Min. 5 stavki kontrolne liste u bazi (seed `04_kontrolna_lista_policies.sql`)
- [ ] Log kontrolne liste vidljiv adminu (opciono tab)

**Procena:** 8–12 h

---

## Faza 3 — Nedelja 5: SPC baseline UI

**Poslovni cilj:** zamrznute granice posle kvalifikacije procesa (PPAP).

**Šta već postoji:**
- Tabela `spc_baseline` — `07_spc_views_and_alarms.sql` (tipovi p, np, c, u, nc)
- Grafovi koriste dinamičke granice — `src/lib/spcStats.js`, `SpcKontrolnaGraf.jsx`
- **Nema UI** za unos/izmenu baseline-a

**Šta dodati:**

| # | Zadatak | Fajlovi |
|---|---------|---------|
| 1 | SQL: proširi `spc_baseline` za merljive (xbar, r, pozicija) ako treba | `22_spc_baseline_merljive.sql` (novi) |
| 2 | Komponenta admin: lista, unos CL/UCL/LCL, `vazi_od` | `src/components/SpcBaselinePanel.jsx` (novi) |
| 3 | Tab u admin merljive + atributivne | `VarijabilneForma.jsx`, `App.jsx` admin sekcija |
| 4 | Graf: ako postoji baseline za deo+tip → koristi umesto auto granica | `spcStats.js`, `varijabilneSpcStats.js`, `SpcKontrolnaGraf.jsx` |
| 5 | Revizija: ko je uneo (`kreirao_id`) | već u tabeli |

**Checklist:**
- [x] Admin može uneti baseline za pilot deo (`SpcBaselinePanel.jsx`, Admin + merljive admin tab)
- [x] SPC karta prikazuje baseline linije (`spcBaseline.js` → `SPCKarte`, `MerljiveSpcKarte`)
- [x] Stari podaci pre `vazi_od` ne menjaju istoriju (bira se najnoviji `vazi_od <= datum`)

**Procena:** 20–32 h

---

## Faza 4 — Nedelja 6: Alarm → reakcija + operativna pouzdanost

### 4.1 Workflow kad SPC izađe iz kontrole

**Šta već postoji:**
- `spc_alarmi` — `07_spc_views_and_alarms.sql`
- `upisiSpcAlarm`, `kreirajAutoEskalaciju` — `src/lib/spcStats.js`
- Western Electric u grafikonima — `App.jsx`, `MerljiveSpcKarte.jsx`
- Zahtev prekid serije — `prekidi_zahtevi`, `ZahtevPrekid` u `kontrolaSesije.jsx`

**Šta dodati:**

| # | Zadatak | Fajlovi |
|---|---------|---------|
| 1 | SQL: `spc_reakcije` ili proširi `spc_alarmi` status + `obavezna_akcija` | `23_spc_reakcije.sql` (novi) |
| 2 | Modal na liniji kad otvoren alarm za aktivan `id_deo` | `src/components/SpcAlarmBlokada.jsx` (novi), hook u `VarijabilneForma.jsx` / `App.jsx` |
| 3 | Akcije: „Potvrdi“, „Karantin“, „Zahtev prekid“ (već postoji) | povezati sa `eskalacije` |
| 4 | Notifikacija adminu (browser + Teams) | `notifikacije.js`, `useAdminZahtevNotifikacije.js` proširiti za `spc_alarmi` INSERT |
| 5 | Ukloniti tihi catch `/* spc_alarmi možda nije migriran */` — log u toast | `App.jsx`, `MerljiveSpcKarte.jsx` |

**Checklist:**
- [ ] Simuliran alarm → operater vidi blokadu ili obavezan dialog
- [ ] Admin vidi alarm u panelu + notifikaciju
- [ ] Zatvaranje alarma zahteva komentar

**Procena:** 24–40 h

### 4.2 Operativna pouzdanost

| # | Zadatak | Fajlovi |
|---|---------|---------|
| 1 | Ispraviti „Reset smene“ (implementirati ili ukloniti dugme) | `App.jsx` ~4387 `resetSmenu` |
| 2 | Health endpoint / admin stranica „status servera“ | `src/components/StatusServera.jsx` (novi) — ping RPC + licence |
| 3 | Proširiti `schemaCheck.js` na sve 22 migracije | `schemaCheck.js`, `MIGRACIJE_LISTA` |
| 4 | Smoke test skripta | `scripts/smoke-test.mjs` (novi) — login, select, rpc |
| 5 | Cron backup dokumentovan | `deploy/backup-server-linux.sh` |

**Checklist:**
- [ ] Nema zbunjujućih admin dugmadi
- [ ] Smoke test prolazi posle svakog deploy-a
- [ ] Mesečni test restore dokumentovan

**Procena:** 12–20 h

---

## Faza 5 — Meseci 2–4 (po feedbacku sa linije)

### 5.1 CAPA / NCR modul

| Šta postoji | `eskalacije`, `osmd_izvestaji` (8D), `kreirajAutoEskalaciju` |
| Šta dodati | Tabela `ncr_capa` (broj NCR, rok, uzrok, korektivna, verifikacija) |
| Fajlovi | `24_ncr_capa.sql`, `src/components/NcrCapaPanel.jsx`, tab u admin/kvalitet |
| Procena | 32–48 h |

### 5.2 Karantin lota (HOLD)

| Šta dodati | `karantin_lotovi` (id_deo, rn, razlog, do_datuma) |
| Fajlovi | `25_karantin.sql`, provera pri `potvrdiIdDeo` u `VarijabilneForma.jsx` / `App.jsx` |
| UI | Crveni banner + blok unosa ili samo upozorenje (podesivo) |
| Procena | 16–24 h |

### 5.3 PDF predaja smene

| Šta postoji | `fetchSmenaStat`, tab SMENA, `trasabilitetIzvestaj.js` |
| Šta dodati | `src/lib/izvestajSmenePdf.js` — škart, NOK, otvoreni alarmi, kalibracije |
| Fajlovi | dugme u tab SMENA (`MerljiveOplTabovi.jsx`, atributivne smena) |
| Procena | 16–24 h |

### 5.4 MSA / kalibracija kalendar

| Šta postoji | `GageRRPanel.jsx`, `merila` + `kalibracije`, `meriloStatus.js` |
| Šta dodati | `merilo_plan_msa` (datum sledeće studije), podsetnik u dashboard + email |
| Fajlovi | `26_msa_plan.sql`, `ZajednickiDashboard.jsx`, `operativniAlarmi.js` |
| Procena | 12–20 h |

### 5.5 Kontrolni plan (light)

| Šta dodati | Tabela `kontrolni_plan` (id_deo, pozicija, metoda, učestalost, reakcija) |
| Fajlovi | `27_kontrolni_plan.sql`, import iz Excel taba, prikaz u poka-yoke |
| Procena | 40–60 h (veći modul — Faza 5b) |

### 5.6 Email (SMTP) umesto samo webhook

| Šta postoji | `notifikacije.js` — Teams + generički webhook |
| Šta dodati | Edge funkcija `send-email` ili SMTP u firmi |
| Fajlovi | `supabase/functions/send-email/`, `NotifikacijePodesavanja.jsx` |
| Procena | 16–24 h (zavisi od IT mail servera) |

### 5.7 Dashboard za menadžment

| Šta postoji | `ZajednickiDashboard.jsx`, OEE tab |
| Šta dodati | Jedna stranica „Danas“ — OK/NOK, Pareto top3, otvoreni 8D, OEE, kalibracije |
| Fajlovi | `src/components/MenadzmentDashboard.jsx`, uloga `sef` u `uloge.js` |
| Procena | 20–30 h

---

## Mapa: šta dirati prvo (brzi pregled)

```
Prioritet 1 (ned 3–4)
  barkod.js ──────────────┐
  VarijabilneForma.jsx    ├── RN automatski + validacija
  App.jsx                 │
  kontrolaSesije.jsx ─────┴── obavezna kontrolna lista

Prioritet 2 (ned 5)
  07_spc_views...sql
  SpcBaselinePanel.jsx (novi)
  SpcKontrolnaGraf.jsx ─── baseline linije

Prioritet 3 (ned 6)
  spcStats.js
  SpcAlarmBlokada.jsx (novi)
  App.jsx / VarijabilneForma.jsx
  schemaCheck.js, smoke-test.mjs
```

---

## Ukupna procena Faza 2–4 (bez Faze 0)

| Blok | Sati |
|------|------|
| RN / ERP light | 16–24 |
| Kontrolna lista | 8–12 |
| SPC baseline UI | 20–32 |
| Alarm workflow | 24–40 |
| Ops / testovi | 12–20 |
| **Ukupno** | **~80–130 h** |

Faza 5 (meseci 2–4): **+100–200 h** zavisno od obima.

---

## KPI posle Faze 4 (provera uspeha)

| KPI | Cilj |
|-----|------|
| Greške ID/RN | −50% vs pilot start |
| Vreme unosa serije | −20% |
| % serija u sistemu | ≥80% |
| Otvoreni alarmi bez reakcije >24h | 0 |
| Backup restore test | 1× uspešno u poslednjih 90 dana |

---

## Šta namerno NIJE na roadmap-u (sada)

- Pun SAP bidirekcionalni  
- Multi-fabrika tenancy  
- CMM / OPC-UA  
- ISO validacioni paket (osim ako audit traži)  
- Još 5 tipova SPC grafikona  

---

## Sledeći korak (akcija)

1. Zatvori **Fazu 0** (deploy na server firme).  
2. Izaberi **1 pilot liniju + 2 dela**.  
3. Kreni redom: **2.2 kontrolna lista** → **2.1 RN barkod** (najmanji otpor, najveći efekat).  

---

*Ažuriraj ovaj dokument posle pilota — šta je fabrika zaista tražila vs šta smo planirali.*
