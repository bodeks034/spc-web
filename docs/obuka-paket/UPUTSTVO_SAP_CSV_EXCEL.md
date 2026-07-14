# SAP CSV → automatski Excel šifrarnik

SAP izvozi CSV → skripta popuni odgovarajuće **Excel tabove** (i `docs\*.csv`) → ti uvezeš u bazu.

## 1. Folder za SAP CSV

```
C:\mix\spc-web\sap-drop\incoming\
```

| Fajl iz SAP-a (bilo koji naziv) | Excel tab | Baza |
|----------------------------------|-----------|------|
| `delovi.csv` ili `sap_materijal.csv` | `delovi` | `delovi` |
| `radni_nalozi.csv` ili `sap_radni_nalozi.csv` | `radni_nalozi` | `radni_nalozi` |
| `kupci.csv` ili `sap_kupci.csv` | `kupci` | `kupci` |

Nepoznati nazivi fajlova se preskaču.

## 2. Pokretanje

```cmd
cd C:\mix\spc-web

REM Provera bez upisa
npm run sap:csv-excel:dry

REM Upiši Excel + docs\*.csv
npm run sap:csv-excel

REM Excel + docs + baza (service role u .env.erp)
npm run sap:csv-excel:import
```

**Excel fajl:** `excel-rad\SPC_master_atributivne.xlsx`  
(Ako ne postoji — kreira se sa praznim tabovima.)

Stari Excel se backup-uje kao `SPC_master_atributivne_pre_sap_<timestamp>.xlsx`.

## 3. Mapiranje SAP kolona

Parser prepoznaje i srpske i SAP nazive.

### Materijal → tab `delovi`

| SAP | Excel |
|-----|-------|
| MATNR, Material | `id dela*` |
| MAKTX, opis | `naziv dela*` |
| WERKS | `pogon kod` |

**Ručna polja** (ostaju iz starog Excela ako već postoje; inače default):

- `linija id*` = 12  
- `masina id*` = 1  
- `kom za kontrolu n*` = 30  
- `karakteristika kontrole*` = Vizuelna kontrola  

### RN → tab `radni_nalozi`

| SAP | Excel |
|-----|-------|
| Auftrag, broj_naloga | `radni nal` |
| MATNR | `id dela*` |
| Menge | `količina` |
| Kunde | `kupac` |

### Kupci → tab `kupci`

| SAP | Excel |
|-----|-------|
| NAME1, kupac | `naziv` |

## 4. Šta SAP NE popunjava

Ovi tabovi **ostaju u Excelu ručno** (nema u SAP standard izvozu):

- `karakteristike_merljive` (LSL/USL) — `SPC_merljive.xlsx`
- `greske_katalog`, `kontrolna_lista_stavke`, `merila`, `linije`…

## 5. Kompletan dnevni tok

```
SAP job (05:00)
  → sap-drop/incoming/*.csv
  → npm run sap:csv-excel:import   (Excel + baza)
  → npm run import:erp-dnevni       (samo RN u erp-drop, ako odvojeno)
  → linija koristi bazu
```

Ili jedan folder `sap-drop\incoming` sa svim CSV pa `sap:csv-excel:import`.

## 6. Provera

- Otvori `excel-rad\SPC_master_atributivne.xlsx` — tabovi ažurirani  
- Admin → Nalozi — poslednji uvoz / broj RN  
- Merljive → unos — predlog RN za ID dela
