# ERP master podaci v2 — SAP / Pantheon → SPC

Ovaj ugovor proširuje postojeći dnevni SAP CSV uvoz. Ne pravi WMS/MRP unutar SPC
aplikacije: skladišta, lokacije, BOM, lotovi i serijski brojevi služe kvalitetu,
sledljivosti i izboru tačnih podataka pri kontroli.

## Preduslov

U Supabase SQL Editoru pokrenuti:

```text
67_erp_master_podaci.sql
68_erp_glavni_unos_sheetovi.sql
```

Zatim proveriti Admin → Provera šeme → **ERP master podaci v2**.

## Pravila CSV ugovora

- CSV encoding se detektuje automatski: UTF-8, Windows-1250, ISO-8859-2 ili Windows-1252.
- Prihvaćeni su `.csv`, `.xlsx` i `.xls`; prvi sheet Excel fajla predstavlja entitet.
- Separator može biti `,`, `;` ili TAB.
- Podržani su `CamelCase`, `snake_case`, razmaci i srpska slova u zaglavlju.
- Numerisani nazivi (`04_Delovi.xlsx`) i nenumerisani (`delovi.csv`) su prihvaćeni.
- Jedan entitet ide u jedan fajl; redosled obrade je u SAP/Pantheon presetu.
- Stabilne ERP šifre su ključevi. Naziv nije ključ kada postoji ERP šifra.
- Prazno ERP polje ne briše ručno održavana SPC polja na delu.
- `LVORM/LOEVM = X` deaktivira zapis; više ga ne aktivira greškom.
- Duplikat istog poslovnog ključa u fajlu: poslednji red važi i zapisuje se upozorenje.
- Nepostojeće reference (deo, dobavljač, skladište, lot...) odbacuju samo loš red i
  upisuju razlog u `erp_uvoz_reject`.

## Paket koji ima smisla u praksi

### Osnovni masteri

1. `01_Kupci.csv`
2. `02_Dobavljaci.csv`
3. `03_TipoviVozila.csv`
4. `04_Delovi.csv`
5. `05_Crtezi.csv`
6. `07_Linije.csv`
7. `08_RadniCentri.csv`
8. `09_Masine.csv`
9. `11_Operateri.csv` — opciono; podrazumevano isključeno zbog Auth/uloga/PIN veze
10. `12_Smene.csv` — opciono
11. `13_Materijali.csv`
12. `16_Merila.csv`
13. `17_Kalibracija.csv`

### Proizvodnja i sledljivost

1. `06_Sastavnica.csv`
2. `10_Operacije.csv`
3. `18_RadniNalozi.csv`
4. `19_Serije.csv`
5. `20_SerijskiBrojevi.csv`
6. `14_Skladista.csv`
7. `15_Lokacije.csv`

Skladišta/lokacije ne vode stanje zaliha u SPC-u. Uvoze se samo identiteti lokacija
potrebni za HOLD/karantin i sledljivost.

### Kvalitet

1. `Karakteristike.csv`
2. `KontrolniPlan.csv`
3. `PFMEA.csv`
4. `greske_katalog.csv` (postojeći QM katalog defekata)

Control Plan i PFMEA se grupišu po delu i reviziji u dokumente `ERP Control Plan`
i `ERP PFMEA`. Stavke dobijaju stabilan `erp_kljuc`, pa ponovni uvoz ažurira isti
red umesto pravljenja duplikata.

## Šta se namerno ne radi automatski

- Nestanak reda iz dnevnog fajla ne deaktivira zapis. Za to ERP mora eksplicitno
  poslati status/delete flag ili se mora ugovoriti `full snapshot`.
- Operateri se ne povezuju automatski sa Supabase Auth nalogom.
- ERP ne prepisuje PIN, app ulogu, SPC granice koje nisu poslate, fotografije ni
  ručne komentare.
- PFMEA/Control Plan uvoz ne znači automatsko odobrenje dokumenta.

## Provera pre pravog uvoza

```powershell
npm run erp:primeri:v2
npm run import:erp-dnevni:dry
```

U aplikaciji: Šifrarnik → ERP uvoz → izabrati CSV. Preview sada prikazuje broj
ukupnih/validnih redova i prve greške pre upisa.

Za pravi server uvoz:

```powershell
npm run import:erp-dnevni
```

Svaki pravi uvoz dobija `batch_id`. Sažetak je u `erp_uvoz_batch`, a odbijeni
redovi sa razlogom u `erp_uvoz_reject`.

## Drop folderi i dnevni izvoz

- `erp-drop/incoming/` — ERP ostavlja CSV/XLSX za uvoz.
- `erp-drop/processed/YYYY-MM-DD/` — obrađeni ulazni fajlovi (audit arhiva).
- `erp-drop/outgoing/` — SPC svakog dana u 06:15 atomski generiše
  `Karakteristike.csv`, `KontrolniPlan.csv` i `PFMEA.csv`.
- `erp-drop/examples/` — samo primeri/test paketi; nisu stvarni izvozi.

Komande:

```powershell
npm run erp:izvoz:dry
npm run erp:izvoz
npm run erp:cleanup                 # dry-run, retention 90 dana
npm run erp:cleanup:apply           # eksplicitno brisanje kandidata
```

Cleanup nikada ne dira `incoming`, `outgoing` ni `examples`, ne dira današnje
arhive, nepoznate nazive i uvek čuva najmanje najnoviju kopiju po entitetu.

## Pantheon v2

`config/erp/presets/pantheon.json` ima isti obim od 26 entiteta kao SAP v2:
masteri, BOM, operacije, radni nalozi, skladišta/lokacije, lot/serijski brojevi,
Control Plan i PFMEA. Prihvata tipične Pantheon nazive `Ident`, `Sifra`, `Naziv`,
`RN`, `Partner` i `RadnoMesto`, uz iste stabilne ključeve i referencijalne provere.

## Primeri

Postojeći SAP primeri: `erp-drop/examples/`.

Novi v2 primeri:

```text
erp-drop/examples/v2/
```

Ponovno generisanje:

```powershell
npm run erp:primeri:v2
```
