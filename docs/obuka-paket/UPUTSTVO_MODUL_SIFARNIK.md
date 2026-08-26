# Modul 0 — Šifrarnik

**Kompletno uputstvo** — 5 grupa tabova. Unos master podataka, puštanje novog dela, go-live i održavanje.

**Ulaz:** Početni ekran → **Modul 0 — Šifrarnik** (📋) · **Uloge:** kvalitet, šef, admin · **Štampa:** `OBUKA_MODUL_SIFARNIK.html` (sync: `npm run sync:uputstvo`).

---

## Sadržaj

| Deo | Tema |
|-----|------|
| **I** | Brzi start |
| **II** | Načini unosa (app / Glavni unos / ERP CSV) |
| **III** | Pregled grupa |
| **IV** | Referenca tabova |
| **V** | Puštanje i održavanje |
| **VI–VIII** | Uticaj na module · FAQ · Linkovi |
| **IX–X** | Funkcije aplikacije · SYNC za HTML |

---

## I. Brzi start

Centralna baza **pre proizvodnje**: delovi, dimenzije, greške, RN, linije, merila, barkod. Bez šifrarnika nema skeniranja dela ni SPC karata na liniji.

**Preporučeni tok (novi deo):**

```
+ Novi deo → popuni → Objavi u šifrarnik → checklist → greške / crtež / barkod → test Modul 1
```

Detalj: [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md).

**Linije VOZ / PRO:** [UPUTSTVO_LINIJE_VOZ_PRO.md](./UPUTSTVO_LINIJE_VOZ_PRO.md) — **Radim na liniji**, Brzi start, Tipovi linija, folderi crteža.

**Radni režim:** padajući meni **Radim na liniji** na vrhu Modula 0 — fokusira Glavni unos, Brzi start, Delovi (pregled) i globalnu pretragu na jednu `VOZ-XX` / `PRO-XX` liniju.

**Onboarding:** dok nema 5+ dimenzija prikazani su samo **Glavni unos**, **Pogon mapa**, **Liste**. Posle **Objavi u šifrarnik** otvaraju se sve grupe (osim **Napredno** — samo admin).

| Uloga | Modul 0 | Napredno (ERP, Održavanje…) |
|-------|---------|----------------------------|
| Kvalitet, šef | Da | Ne |
| Admin | Da | Da |
| Kontrolor, operater | Ne | Ne |

---

## II. Načini unosa

| Način | Format | Gde |
|-------|--------|-----|
| Tabovi | forma | Modul 0 |
| **Glavni unos** | app / `.xlsx` | Osnovno → **Objavi u šifrarnik** |
| **ERP uvoz** | **samo `.csv`** | Napredno → ERP uvoz (admin) |
| RN brzi uvoz | `.csv` | Radni nalozi |
| Backup | izvoz `.xlsx` | Napredno → Backup (admin) |

**Ne u Modulu 0:** log merenja (Modul 1); `.xlsx` u ERP tabu; master Excel kroz UI.

**ERP + dimenzije:** master preko CSV; **nove dimenzije** kroz Glavni unos (banner u ERP tabu).

Detalji: [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) · [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md).

---

## III. Pregled grupa

| Grupa | Tabovi |
|-------|--------|
| **Osnovno** | Glavni unos · Pogon mapa · Linija↔deo · Liste · Delovi · RN · Kupci · Dobavljači · Linije · Mašine · Smene · Ciljevi · Kontrolna lista · **Barkod** |
| **Atributivne** | Greške · Crtež · Pogoni po delu |
| **Merljive** | Dimenzije · SOP · Merila |
| **Linije proizvoda** | Tipovi linija · Defekti po liniji · Delovi po liniji |
| **Napredno** *(admin)* | Održavanje · SPC alarm % · Moment JOB · Moment ključevi · ERP uvoz · Backup |

Detaljno VOZ/PRO i radni režim: [UPUTSTVO_LINIJE_VOZ_PRO.md](./UPUTSTVO_LINIJE_VOZ_PRO.md).

---

## IV. Referenca tabova

### IV.1 Osnovno

#### IV.1.1 Glavni unos

**Svrha:** Jedan izvor za **komponente** (`tip_kontrole=deo`) i **celo vozilo** (`tip_kontrole=vozilo`) — dimenzije, zaglavlje, RN.

**Gde se čuva (staging):** `glavni_unos_redovi` po sheet-ovima (`opsti_1`, `ham_delovi`, `ham_final`… ili legacy `vozilo1`…).

**Tip sheeta** (pri **+ Novi deo** — čarobnjak, korak 2):

| Tip | Bedž na tabu | ERP vozilo |
|-----|--------------|------------|
| 1 Opšti delovi | Opšti delovi | — |
| 2 Komponente projekta | npr. HAM · komponente | HAM, NTV… |
| 3 Final vozilo | npr. HAM · celo vozilo | HAM, NTV… |

**Primarni tok (preporučeno):**

1. **+ Novi deo** — čarobnjak: tip → sheet → automatski otvara grupni/final unos  
2. Popuni zaglavlje + dimenzije  
3. **Objavi u šifrarnik** — validacija, propagacija, **checklist panel** sa linkovima ka tabovima  

**Unos u aplikaciji:**

| Dugme | Za šta |
|-------|--------|
| **+ Novi deo** | Čarobnjak — novi sheet + otvaranje unosa (preporučeno za novi deo) |
| **+ Grupni unos** | Komponenta / opšti deo — više dimenzija odjednom |
| **+ Final vozilo** | Samo na sheetu tipa 3 — celo vozilo, jedan red finalne kontrole |
| **Objavi u šifrarnik** | Snima staging + propagacija (ili ponovo propagira ako nema izmena) |
| **Uvezi .xlsx** | Masovni uvoz (inženjerski format, ne ERP CSV) |

Posle objave prikazuje se **checklist** (klik na stavku otvara tab; opcija **+ Šablon grešaka**). Validacija pre objave blokira npr. merljive bez LSL/USL.

**Propagacija** automatski puni:

| Cilj | Tabela |
|------|--------|
| Dimenzije merljive | `karakteristike_merljive` |
| SOP merljive | `sop_deo_varijabilni` |
| Deo (zaglavlje) | `delovi` |
| Pogon po delu (atr.) | `delovi_atributivni_pogon` |
| Kupac | `kupci` |
| Radni nalog | `radni_nalozi` |

**Posle propagacije ručno:** katalog grešaka, crtež dela; za final — dijagram + defekti po zonama (grupa **Linije proizvoda**). Checklist panel nakon objave vodi na tabove sa **imenom linije** (npr. „Defekti po liniji — VOZ-03“).

**Kompaktan birač sheeta:** kod više linija (VOZ/PRO 01–10+) — dropdown linija + Komponente/Final umesto desetina sheet tabova. Vidi [UPUTSTVO_LINIJE_VOZ_PRO.md](./UPUTSTVO_LINIJE_VOZ_PRO.md) §V.

Puna dokumentacija: [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md).

**Polja po redu dimenzije** (sažeto):

| Polje | Značenje |
|-------|----------|
| ID deo * | Šifra dela (npr. MRAP1) |
| Radni nalog | RN iz proizvodnje |
| Kupac | Ime kupca |
| Naziv dela | Opis |
| Linija / operacija / mašina | Gde se kontroliše |
| Karakteristika | Naziv mere ili kontrole |
| Klasa | Critical / Major / Minor |
| Nominal, LSL, USL | Granice (merljive) |
| Jedinica | mm, Nm… |
| Tip | Merljiva ili Atributivna |
| Instrument | Koji merni instrument |
| Kom za kontrolu n | Veličina uzorka |
| SPC broj merenja | Koliko merenja u seriji |

**Kako radi:** Unos → staging → **Objavi u šifrarnik** → propagacija. Modul 1 posle toga vidi dimenzije pri skeniranju dela.

---

#### IV.1.2 Pogon mapa

**Svrha:** Veza **faze linije** (A–I) sa `linija_id` u bazi.

**Tabela:** `pogon_linija_mapa`

| Polje | Značenje |
|-------|----------|
| linija_faza | Oznaka faze (A, B, C…) |
| linija_id | ID iz tabele linije |
| pogon_kod | Kod pogona (A–I) |

**Zašto je bitno:** Na tabletu operater bira pogon; filter dimenzija i RN zavisi od ove mape.

**Akcije:** + Linija/pogon, Sačuvaj, brisanje (×).

**Audit A–F:** na vrhu taba prikazuje se da li su mapirani pogoni A–F pre go-live (nedostajući / dupli).

---

#### IV.1.3 Linija ↔ deo

**Svrha:** **Pregled** (read-only) — koji delovi su vezani za koju liniju/pogon. Nema unosa.

**Akcije:** filter, osveži (↻).

Koristi se za proveru da li je mapiranje ispravno pre puštanja linije.

---

#### IV.1.4 Liste (dropdown)

**Svrha:** Vrednosti za padajuće liste u Glavnom unosu i drugim formama.

**Tabela:** `sifrarnik_liste_vrednosti`

Liste: `karakteristika`, `reakcioni_plan`, `instrument`, `jedinica`.

Fiksno u kodu: **Klasa** (Critical/Major/Minor), **Tip** (Merljiva/Atributivna).

**Akcije:** izbor liste, Dodaj vrednost, brisanje.

---

#### IV.1.5 Delovi (pregled)

**Svrha:** Pregled i ručna izmena delova koji su već u sistemu (iz ERP-a ili propagacije).

**Kompletna procedura za novi deo (komponenta):** `UPUTSTVO_NOVI_DEO_SIFARNIK.md`.  
**Novo celo vozilo:** `UPUTSTVO_NOVO_VOZILO_SIFARNIK.md`.

**Tabela:** `delovi`

| Polje | Značenje |
|-------|----------|
| id_deo | Šifra (PK) |
| naziv_dela | Naziv |
| karakteristika | Opis kontrole |
| tip_kontrole | `deo` ili `vozilo` |
| kom_za_kontrolu | Veličina uzorka (n) |
| aktivan | Da/ne — neaktivan se ne nudi na liniji |
| napomena | Slobodan tekst |

**Akcije:** filter po tipu, filter **Samo DEMO/TEST**, bulk brisanje demo ID (DEMO/TEST/SAMPLE/XXX), + Deo, Sačuvaj, ✎ izmena, **GU (n)** → Glavni unos sa filterom na taj ID (ako nema redova u GU, otvara se čarobnjak), status badge (tooltip: nedostaje GU/greške/crtež), ▦ barkod.

---

#### IV.1.6 Radni nalozi

**Svrha:** Aktivni RN za proizvodnju — operater ih bira posle skena dela.

**Tabela:** `radni_nalozi`

| Polje | Značenje |
|-------|----------|
| broj_naloga | Broj RN |
| id_deo | Deo (mora postojati u `delovi`) |
| kolicina | Planirana količina |
| kupac | Kupac |
| rok_isporuke | Datum |
| pogon_kod | Pogon A–I |
| status | aktivan / završen / arhiviran |
| napomena | Napomena |

**Akcije:**

- **+ Novi RN** — ručni unos
- **📎 CSV uvoz (ERP)** — **samo `.csv`**, brzi uvoz RN iz ERP izvoza
- filter po statusu, arhiviranje

**Pravilo:** `id_deo` mora **već postojati** u šifrarniku delova — inače uvoz pada (FK greška).

Za masovni uvoz svih entiteta koristite **Alati → ERP uvoz**.

---

#### IV.1.7 Kupci

**Tabela:** `kupci` — `naziv`, `aktivan`.

Ručni unos ili ERP CSV (`kupci.csv`).

---

#### IV.1.8 Dobavljači

**Tabela:** `dobavljaci`

Osnovni podaci: šifra, naziv, država, grad i status. Šifra treba da odgovara ERP šifri
dobavljača. Neaktivan dobavljač ostaje u istoriji, ali se ne nudi za novi prijem.

ERP CSV: `dobavljaci.csv`.

#### IV.1.9 Prijemna kontrola — nije u Šifrarniku

Unos prijemne kontrole je u **Modulu 1 — Atributivne → PRIJEM**.
Šifrarnik drži samo master **Dobavljači**. Dugme **Pokreni Ulaznu kontrolu**
otvara atributivni UNOS (pogon A) i vraća OK/NOK u prijem.

Detaljno uputstvo, PPM formula i izveštaj:

[Dobavljači i prijemna kontrola](./UPUTSTVO_DOBAVLJACI_I_PRIJEMNA_KONTROLA.md)

---

#### IV.1.10 Linije

**Tabela:** `linije`

| Polje | Značenje |
|-------|----------|
| linija | Naziv radnog mesta |
| proces | Proces |
| operacija | Operacija |
| greske | Povezane greške (tekst) |

ERP CSV: `linije.csv` (ARBPL, work center…).

---

#### IV.1.11 Mašine

**Tabela:** `masine` — `naziv`, `linija`.

ERP CSV: `masine.csv`.

---

#### IV.1.12 Smene

**Tabela:** `smene` — `naziv`, `pocetak`, `kraj` (vreme smene).

Ručno — ERP retko šalje smene (u config-u isključeno po defaultu).

Aplikacija inače automatski određuje smenu po satu (`useAutoSmena`).

---

#### IV.1.13 Ciljevi

**Svrha:** Ciljevi kvaliteta po delu za dashboard i alarme.

**Tabela:** `ciljevi`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| rty_cilj | Ciljni RTY/FPY % |
| dpmo_cilj | Ciljni DPMO |
| p_cilj | Cilj za p-kartu |
| vazi_od | Od kog datuma važi |

Koristi se u analitici i KPI trakama.

---

#### IV.1.14 Kontrolna lista

**Svrha:** Stavke koje kontrolor mora potvrditi **pre početka smene** (poka-yoke na Modulu 1).

**Tabela:** `kontrolna_lista_stavke`

| Polje | Značenje |
|-------|----------|
| kategorija | Grupa stavki |
| stavka | Tekst pitanja |
| redosled | Redosled prikaza |
| aktivna | Da/ne |

Na liniji: bez potvrde liste operater ne ulazi u unos (osim admin).

---

#### IV.1.15 Održavanje

**Svrha:** Mesečna / pre go-live provera — brojevi (delovi, aktivni RN, merila, dimenzije), **duplikati dimenzija** (isti pogon + pozicija), kompletnost šifrarnika i prečice ka tabovima.

**Akcije:** klik na stavku otvara tab (RN, merila, dimenzije, delovi, pogon mapa, Glavni unos). **Objavi sve spremne** — batch propagacija delova sa GU + greškama + crtežom (preview pre potvrde). **Izvezi CSV delimičnih** — delovi koji nisu kompletni.

**Alati panel (inženjeri):** audit log (`sifrarnik_audit`) · upoređivanje dva dela · validacioni CSV · preview propagacije po ID dela.

**Automatizacija:** `npm run auto:sifrarnik-zaglavljeni` — email digest delova zaglavljenih u delimičnom statusu (cron, vidi `GO_LIVE_RUNBOOK.md`).

Admin: link ka **Očisti operativu** (vidi §5).

---

### IV.2 Atributivne

#### IV.2.1 Katalog grešaka

**Svrha:** Lista grešaka za OK/NOK unos na liniji.

**Tabela:** `greske_katalog`

| Polje | Značenje |
|-------|----------|
| kategorija | Glavna kategorija |
| podkategorija | Podgrupa |
| defekt | Naziv defekta |
| id_deo | Opciono — vezano za deo |
| pogon_kod | Opciono — vezano za pogon |

ERP CSV: `greske_katalog.csv`.

Na liniji: operater bira kategoriju → podkategoriju → defekt.

**Brzi unos:** dugme **+ Šablon (5)** — tipične greške za ID iz filtera (opšti deo ili vozilo). Isti šablon dostupan i u checklist panelu posle Glavnog unosa.

#### IV.2.2 Crtež dela

**Svrha:** Slika/crtež za atributivni unos (tab CRTEŽ u Modulu 1).

**Tabela:** `delovi` (polje `slika_naziv`) + Storage bucket `atributivne/`

**Akcije:** izbor dela, upload slike, Sačuvaj.

---

#### IV.2.3 Pogoni po delu

**Svrha:** Koji pogon (A–I) važi za koji deo u atributivnom modulu — kom za kontrolu, RN po pogonu.

**Tabela:** `delovi_atributivni_pogon`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| pogon_kod | A–I |
| radni_nalog | RN za taj pogon |
| kom_za_kontrolu | n za uzorkovanje |
| aktivan | Da/ne |

Popunjava se ručno ili propagacijom iz Glavnog unosa.

---

### IV.3 Merljive

#### IV.3.1 Dimenzije (pregled)

**Svrha:** Sve merljive karakteristike — **srce merljivog modula**.

**Tabela:** `karakteristike_merljive`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| pogon_kod | Pogon A–I |
| pozicija | Oznaka dimenzije (D1, D2…) |
| sifra_merenja | Šifra mere |
| naziv_mere | Naziv |
| nominala, lsl, usl | Granice |
| jedinica | mm, °… |
| merni_instrument | Instrument |
| kom_za_kontrolu_n | Veličina uzorka |
| broj_merenja | Merenja po seriji |
| fai_broj_merenja | Za FAI |
| klasa | Critical/Major/Minor |
| radni_nalog | RN |
| slika | Referenca slike |

**Akcije:**

- filter po delu/pogonu
- **Propagiraj iz Osnovnog** — povuci iz `glavni_unos_redovi`
- + Dimenzija, Sačuvaj, brisanje

ERP CSV: `karakteristike_merljive.csv`.

**Na liniji:** posle skena dela učitavaju se redovi za taj `id_deo` + `pogon_kod` → kolone za kucanje merenja.

---

#### IV.3.2 SPC alarm %

**Svrha:** Globalni pragovi za SPC alarme po klasi greške.

**Čuva se u:** `app_podesavanja` (ključevi `spc_alarm_prag_*`)

Procenat odstupanja od centra procesa za alarm (default / Critical / Major / Minor).

**Akcija:** Sačuvaj pragove — važi za celu aplikaciju.

---

#### IV.3.3 SOP po delu (pregled)

**Svrha:** Operativni podaci za merljivi unos — slika SOP, mašina, linija, broj merenja.

**Tabela:** `sop_deo_varijabilni`

| Polje | Značenje |
|-------|----------|
| id_deo, pogon_kod | Ključ |
| slika | SOP slika |
| masina, linija | Lokacija |
| broj_merenja | Plan merenja |
| kontrolor_ime | Podrazumevani kontrolor |

**Propagiraj iz Osnovnog** — iz Glavnog unosa.

---

#### IV.3.4 Merila / kalibracija

**Svrha:** Registar mernih instrumenata i kalibracija.

**Tabele:** `merila`, `kalibracije`

**Merilo:**

| Polje | Značenje |
|-------|----------|
| naziv | Naziv instrumenta |
| serijski_broj | SN |
| tip | Tip merila |
| lokacija | Gde se nalazi |
| opseg | Mereni opseg |
| kategorija | npr. digitalno merilo |
| aktivno | Da/ne |

**Kalibracija:**

| Polje | Značenje |
|-------|----------|
| datum_kal | Datum kalibracije |
| sledeca_kal | Sledeća kalibracija |
| izvrsio | Ko je radio |
| sertifikat_br | Broj sertifikata |
| rezultat | OK/NOK |

ERP CSV: `merila.csv`, `kalibracije.csv`.

Na liniji: digitalna merila se vezuju preko vendor profila; istekla kalibracija blokira unos.

---

### IV.4 Linije proizvoda

Za **tip linije** (VOZ/PRO ili legacy MRAP…) — dijagram, defekti finalne kontrole, delovi `tip_kontrole=vozilo`.

**Kompletna procedura za novo vozilo:** `UPUTSTVO_NOVO_VOZILO_SIFARNIK.md` (dijagram → tip → deo → defekti → pogon F → test).

**VOZ/PRO model:** [UPUTSTVO_LINIJE_VOZ_PRO.md](./UPUTSTVO_LINIJE_VOZ_PRO.md).

#### IV.4.1 Tipovi linija

**Tabela:** `tipovi_vozila`

| Polje | Značenje |
|-------|----------|
| kod | Kod tipa |
| naziv | Naziv modela |
| prefiks_id_deo | Prefiks šifre delova |
| dijagram_src / slika_sop | Slike |
| aktivan | Da/ne |

ERP CSV: `tipovi_vozila.csv`.

---

#### IV.4.2 Defekti po liniji

**Tabela:** `katalog_gresaka_vozilo`

Kategorija / podkategorija / defekt **po tipu vozila**.

Koristi se u vozilo-modu atributivnog unosa (zona na dijagramu).

---

#### IV.4.3 Delovi po liniji

**Tabela:** `delovi` gde `tip_kontrole = 'vozilo'`

Delovi vezani za tip vozila — ID, naziv, slika, kom za kontrolu.

---

### IV.5 Napredno *(samo admin)*

Tabovi: **Održavanje** · **SPC alarm %** · **Moment JOB** · **Moment ključevi** · **ERP uvoz** · **Backup**.

Inženjer (kvalitet, šef) vidi **4 grupe** — Osnovno, Atributivne, Merljive, Linije proizvoda.

#### IV.5.1 Održavanje

Statistika kompletnosti, batch objava delova, duplikati dimenzija, CSV delimičnih delova, audit alati. Panel **Folderi crteža (VOZ/PRO)** — kreiranje `public/sifrarnik/linije/` preko lokalnog API-ja (`npm run linije-crtezi:api`).

#### IV.5.2 Barkod *(u grupi Osnovno)*

**Svrha:** Profili etiketa za štampu barkoda po delu.

**Tabela:** `barkod_profili`

| Polje | Značenje |
|-------|----------|
| id_deo | Deo |
| format | id / id_rn / puna |
| tip_koda | QR, Code128… |
| sadrzaj_barkoda | Šta je u kodu |
| radni_nalog | Opciono RN u kodu |

**Akcije:** pregled, Sačuvaj profil, **Štampaj**.

Detalji: [UPUTSTVO_PRAVLJENJE_BARKODOVA.md](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md).

#### IV.5.3 Moment ključ

#### IV.5.3.1 Šifrarnik JOB

Unutrašnji pod-tabovi:

| Pod-tab | Tabela | Svrha |
|---------|--------|-------|
| Jedan list | — | Brz unos jednog lista |
| JOB-ovi | `moment_job` | Posao momentiranja po delu |
| Koraci sekvence | `moment_korak` | Redosled, ciljni Nm, tolerancije |
| Pozicije | `moment_pozicija` | Brojevi pozicija na crtežu |
| Ključevi na liniji | `merila` (`kategorija: momentni_kljuc`) | Digitalni ključevi |

**Akcije:** Učitaj kompletan šifrarnik, Export JSON, Uvezi protokol (CSV/TXT/LOG/XML/JSON iz ključa).

Na liniji (Modul 1 → tab MOMENT): operater prati sekvencu koraka sa ključem.

---

#### IV.5.3.2 Ključevi / kalibracija

Isti panel kao **Merila / kalibracija** — opšti registar merila uključujući moment ključeve.

Za **konfiguraciju sekvence** koristite pod-tab **Šifrarnik JOB**.

---

#### IV.5.4 ERP uvoz ⭐ (CSV)

**Svrha:** Masovni dnevni uvoz iz SAP / Pantheon — **bez Excela**.

**Tabele i tipični CSV fajlovi** (preset SAP):

| Entitet | CSV fajl | Supabase tabela |
|---------|----------|-----------------|
| Linije | `linije.csv` | `linije` |
| Mašine | `masine.csv` | `masine` |
| Tipovi vozila | `tipovi_vozila.csv` | `tipovi_vozila` |
| Delovi | `delovi.csv`, `sap_delovi.csv` | `delovi` |
| Crteži | `crtezi_dela.csv` | `crtez_assets` |
| Greške | `greske_katalog.csv` | `greske_katalog` |
| Kupci | `kupci.csv` | `kupci` |
| Merila | `merila.csv` | `merila` |
| Kalibracije | `kalibracije.csv` | `kalibracije` |
| Dimenzije | `karakteristike_merljive.csv` | `karakteristike_merljive` |
| Radni nalozi | `radni_nalozi.csv`, `sap_radni_nalozi.csv` | `radni_nalozi` |

**Kako radi:**

1. Izaberi **preset** (SAP ili Pantheon)
2. **Upload CSV** — izaberi jedan ili više `.csv` fajlova
3. **Preview** — dry-run, vidi greške pre upisa
4. **Uvezi u bazu** — upis u Supabase
5. **Server trigger** (opciono) — čita folder `erp-drop/incoming/` preko API-ja

**Ograničenja:**

- Samo **`.csv`** — `.xlsx` se ne prihvata
- Imena fajlova moraju odgovarati config-u (inače „Nespojeni fajl")
- Redosled uvoza: prvo delovi, pa radni nalozi
- `radni_nalozi` zahteva postojeći `id_deo` u `delovi`
- Kolone ERP-a se automatski mapiraju (MATNR → id_deo, AUFNR → radni_nalog…)

**Log:** tabela `erp_uvoz_log` — poslednji uvozi vidljivi u panelu.

Primeri CSV: folder `erp-drop/examples/`.

---

#### IV.5.5 Backup

**Samo izvoz** — preuzima `SPC_sifrarnik_backup_{datum}.xlsx`.

**Nema uvoza** — za unos koristite tabove ili ERP CSV.

---

## V. Puštanje i održavanje

Korak-po-korak: [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md) · Go-live: [GO_LIVE_RUNBOOK.md](./GO_LIVE_RUNBOOK.md).

### V.1 Sa ERP-om

1. **Alati → ERP uvoz** — delovi, greške, RN (CSV)
2. **Glavni unos** — dimenzije → **Objavi u šifrarnik**
3. **Pogon mapa** (audit A–F) · Crtež · Barkod · Kontrolna lista
4. Test Modul 1

### V.2 Bez ERP-a

1. Linije, Mašine, Kupci
2. **+ Novi deo** → **Objavi u šifrarnik** → checklist
3. Greške, Pogon mapa, RN, Barkod
4. Test Modul 1

### V.3 Go-live

| Korak | Akcija |
|-------|--------|
| Backup | `npm run backup:db` · `npm run backup:storage` |
| Operativa | Admin → **Očisti operativu** ili `npm run db:ocisti-operativu -- --potvrdi` |
| Demo delovi | Delovi → filter DEMO → bulk obriši |
| Storage | obriši mirror `spc-excel-sync` |
| Tableti | offline red + Ctrl+F5 |

### V.4 Mesečno (tab Održavanje)

Neaktivni RN · istekle kalibracije · duplikati dimenzija · brojevi delova/RN/merila · **audit log** · batch objava spremnih delova · validacioni izveštaj · digest zaglavljenih delova (`auto:sifrarnik-zaglavljeni`).

---

## VI. Uticaj na module

| Šifrarnik tab | Modul 1 (linija) | Modul 2 (analitika) |
|---------------|------------------|---------------------|
| Delovi | Sken ID dela | Filter po delu |
| Karakteristike merljive | Kolone merenja, LSL/USL | X̄/R, Cp/Cpk |
| Greške katalog | OK/NOK izbor | Pareto, DPMO |
| Radni nalozi | Izbor RN posle dela | Trasabilitet |
| Ciljevi | — | KPI alarmi |
| Kontrolna lista | Blokada unosa | — |
| Merila/kalibracija | Digitalni unos | MSA tab |
| Barkod | Sken | — |
| Moment JOB | Tab MOMENT | — |
| SPC alarm % | Alarm na unosu | SPC alarmi panel |

---

## VII. Česta pitanja

| Problem | Rešenje |
|---------|---------|
| Operater ne vidi deo | `delovi.aktivan`, pogon mapa, licenca |
| Nema dimenzija posle skena | Nema redova u `karakteristike_merljive` za `id_deo` + `pogon_kod` — **Objavi u šifrarnik** |
| CSV uvoz RN pada | `id_deo` ne postoji — prvo `delovi.csv` |
| Excel u ERP tabu? | **Ne** — samo CSV |
| Log u šifrarniku? | **Ne** — Modul 1 (Zapiši) |

---

## VIII. Povezana uputstva

| Dokument | Tema |
|----------|------|
| [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md) | Novi deo — korak po korak |
| [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) | Glavni unos (app + Excel) |
| [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md) | ERP CSV, cron |
| [GO_LIVE_RUNBOOK.md](./GO_LIVE_RUNBOOK.md) | Go-live checklist |
| [UPUTSTVO_NOVO_VOZILO_SIFARNIK.md](./UPUTSTVO_NOVO_VOZILO_SIFARNIK.md) | Novo vozilo |
| [UPUTSTVO_PRAVLJENJE_BARKODOVA.md](./UPUTSTVO_PRAVLJENJE_BARKODOVA.md) | Barkod etikete |

---

## IX. Funkcije u aplikaciji (implementirano)

| Funkcija | Gde |
|----------|-----|
| **Objavi u šifrarnik** + checklist | Glavni unos |
| **+ Novi deo** (čarobnjak) | Glavni unos |
| Pogon audit A–F | Pogon mapa |
| Validacija pre objave | Glavni unos |
| **GU (n)** + status badge (klik) + DEMO bulk delete | Delovi |
| **+ Šablon (5)** grešaka | Checklist / Greške |
| Tab **Održavanje** + duplikati dimenzija | Održavanje |
| Onboarding mod (auto-off posle objave) | Modul 0 hub |
| Očisti operativu | Admin + `db:ocisti-operativu` + API |
| OBUKA HTML sync | `patch-obuka-sifrarnik-html.mjs` |

---

## X. SYNC — OBUKA HTML (automatski)

Sadržaj ispod ažurira `OBUKA_MODUL_SIFARNIK.html` pri `npm run sync:uputstvo`. Ne brišite markere.

<!-- SYNC:GRUPA_OSNovNO -->
Glavni unos · Pogon mapa · Linija↔deo · Liste · Delovi · RN · Kupci · Linije · Mašine · Smene · Ciljevi · Kontrolna lista · **Održavanje**
<!-- /SYNC:GRUPA_OSNovNO -->

<!-- SYNC:ERP_TOK_FLOW -->
ERP izvozi CSV
    ↓
Alati → ERP uvoz (delovi, RN, greške…)
    ↓
Glavni unos → **Objavi u šifrarnik** (dimenzije)
    ↓
Crtež, barkod, kontrolna lista
    ↓
Modul 1 — operateri
<!-- /SYNC:ERP_TOK_FLOW -->

<!-- SYNC:NOVI_DEO_TOK -->
+ Novi deo → grupni unos → **Objavi u šifrarnik** → checklist → greške / crtež / barkod
<!-- /SYNC:NOVI_DEO_TOK -->

<!-- SYNC:GLAVNI_UNOS_CELL -->
ID deo, RN, kupac, dimenzije (nominal/LSL/USL), klasa, instrument. **Objavi u šifrarnik** — Snima staging + propagacija (ili ponovo propagiraj ako nema izmena). **+ Novi deo** (čarobnjak), grupni unos, final vozilo. Uvezi .xlsx (inženjerski format).
<!-- /SYNC:GLAVNI_UNOS_CELL -->

<!-- SYNC:POGON_MAPA_CELL -->
Faza linije A–I ↔ linija_id. Operater bira pogon na tabletu. **Audit A–F** na vrhu taba pre go-live (nedostajući / dupli pogoni).
<!-- /SYNC:POGON_MAPA_CELL -->

<!-- SYNC:ODRZAVANJE_CELL -->
Brojevi + **kompletnost %** + CSV delimičnih + **Objavi sve spremne** (GU+greške+crtež). Duplikati dimenzija. Mesečna provera pre produkcije.
<!-- /SYNC:ODRZAVANJE_CELL -->

<!-- SYNC:DELOVI_CELL -->
filter po tipu, **Samo delimični**, bulk DEMO brisanje, status badge (klik → meni), empty state **+ Novi deo u GU**, **Globalna pretraga ID** u hub-u.
<!-- /SYNC:DELOVI_CELL -->

<!-- SYNC:ERP_CSV_ROWS -->
| linije.csv | linije | ARBPL / work center |
| masine.csv | masine | Equipment |
| tipovi_vozila.csv | tipovi_vozila | Product group |
| delovi.csv / sap_delovi.csv | delovi | MATNR → id_deo |
| crtezi_dela.csv | crtez_assets | Crteži |
| greske_katalog.csv | greske_katalog | Greške |
| kupci.csv | kupci | Kupci |
| merila.csv | merila | Merila |
| kalibracije.csv | kalibracije | Kalibracije |
| karakteristike_merljive.csv | karakteristike_merljive | Dimenzije LSL/USL |
| radni_nalozi.csv | radni_nalozi | AUFNR — posle delovi! |
<!-- /SYNC:ERP_CSV_ROWS -->

<!-- SYNC:FAQ_ROWS -->
| Operater ne vidi deo | `delovi.aktivan`, pogon mapa, licenca |
| Nema dimenzija posle skena | Nema redova u `karakteristike_merljive` za `id_deo` + `pogon_kod` — **Objavi u šifrarnik** |
| CSV uvoz RN pada | `id_deo` ne postoji — prvo `delovi.csv` |
| Excel u ERP tabu? | **Ne** — samo CSV |
| Log u šifrarniku? | **Ne** — Modul 1 (Zapiši) |
<!-- /SYNC:FAQ_ROWS -->

<!-- SYNC:ERP_UVOZ_CELL -->
Masovni **CSV** uvoz (SAP/Pantheon): preset → Upload → Preview → **dry-run upozorenje delovi bez GU** → Uvezi → banner sledeći korak GU. Dimenzije kroz **Glavni unos**.
<!-- /SYNC:ERP_UVOZ_CELL -->

<!-- SYNC:HUB_BANNERI_CELL -->
**Nastavi checklist** (sledeći delimični deo, Ne sada), **Go-live SQL** banner (RPC 77–79), **Globalna pretraga ID dela**. Admin: automatski GO-LIVE STATUS panel.
<!-- /SYNC:HUB_BANNERI_CELL -->

---

*Verzija: avg 2026 · Modul 0 — Šifrarnik · SPC Web*
