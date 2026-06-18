# SPC — šifrarnik paket (jedan folder)

Generisano: scripts/pakuj-sifrarnik-folder.mjs

## Gde unosiš šta — aplikacija vs Excel

| Podatak | Gde POPUNJAVAŠ (Excel/CSV) | Gde koristi aplikacija |
|---------|---------------------------|------------------------|
| **ID dela** | `delovi` tab / delovi.csv | Unos: skeniraš/kucaš ID; baza: delovi |
| **RN (radni nalog)** | `radni_nalozi` + `sop_deo_varijabilni` | Unos: polje RN ili barkod; auto iz baze po delu |
| **Kontrolor** | `radnici` (ime, email, uloga) | **Ne kucaš** — uzima se od prijavljenog korisnika |
| **Kom za kontrolu (N)** | `delovi` kolona *kom za kontrolu n* | Atributivne: koliko merenja u seriji |
| **USL / LSL** | `karakteristike_merljive` | **Samo merljive** — pri unosu merenja |
| **Greške OK/NOK** | `greske_katalog` | Atributivne: dropdown pri unosu |
| **Ček lista** | `kontrolna_lista_stavke` | Pre unosa na liniji |

### Tok rada

1. **Izmeni Excel** u ovom folderu (ili CSV pa ponovo pokreni pakuj skriptu).
2. **Uvezi u bazu:** Admin Panel → Uvezi iz Excela  
   - Atributivne: `SPC_master_atributivne.xlsx`  
   - Merljive: `SPC_merljive.xlsx`
3. **Ili CSV:** `npm run import:docs` (iz docs/ u korenu projekta)
4. **Svakodnevni unos** — u aplikaciji (modul Atributivne / Merljive), ne u Excelu.

---

## Excel fajlovi u ovom folderu

| Fajl | Tabovi | Namena |
|------|--------|--------|
| **SPC_master_atributivne.xlsx** | 9 tabova | Linije, mašine, delovi, RN, radnici, greške, ček lista |
| **SPC_merljive.xlsx** | 3 taba | SOP dela, **karakteristike_merljive** (jedini izvor), istorija merenja |
| **SPC_merljive_demo_5501_5503.xlsx** | demo | Primer merljivog unosa (ako postoji) |

## CSV kopije (isti sadržaj)

- linije.csv
- masine.csv
- smene.csv
- greske_katalog.csv
- katalog_gresaka_vozilo.csv
- delovi.csv
- ciljevi.csv
- radnici.csv
- radni_nalozi.csv
- kupci.csv
- kontrolna_lista_stavke.csv
- merila.csv
- kalibracije.csv
- sop_deo_varijabilni.csv
- karakteristike_merljive.csv
- merenja_varijabilna.csv
- ciljevi.csv
- kupci.csv
- merila.csv
- kalibracije.csv
- barkodi_sadrzaj.csv
- erp_radni_nalozi.example.csv
- deo_rucni.csv

## Tačni nazivi tabova (mora biti isto!)

Atributivne: linije, masine, smene, greske_katalog, katalog_gresaka_vozilo, delovi, radnici, radni_nalozi, kontrolna_lista_stavke

Merljive: sop_deo_varijabilni, karakteristike_merljive, merenja_varijabilna

### karakteristike_merljive — jedini izvor (popuni meta na prvom redu grupe po pogonu)
id, id_deo, pogon_kod, sifra_merenja, radni_nalog, faza_naziv, linija_faza, linija_id, masina_id, naziv_dela, slika, ukupno_kom, kom_za_kontrolu_n, nivo_kontrole, fai_broj_merenja, broj_merenja, pozicija, klasa, naziv_mere, nominala, usl, lsl, merni_instrument, jedinica, napomena

**Pravilo:** kolona `merni_instrument` = Vizuelno / Dokumentacija → automatski u **atributivne**; ostalo → **merljive**.

## Kolone koje te zanimaju

### radni_nalozi (RN)
radni nal, id dela, naziv dela, količina, kupac, status

### radnici (kontrolor)
ime i prezime, uloga=kontrolor, email (isti kao Supabase Auth)

### delovi (deo + kom za kontrolu)
id dela, naziv dela, linija id, masina id, kom za kontrolu n

### karakteristike_merljive (USL / LSL)
id_deo, pozicija, nominala, usl, lsl, usl_text, lsl_text, jedinica

### sop_deo_varijabilni (RN + kontrolor po delu — merljive)
id_deo, radni_nalog, kontrolor_ime, broj_merenja

---

Detaljnije: docs/UPUTSTVO_SIFARNIK_I_EXCEL.md
