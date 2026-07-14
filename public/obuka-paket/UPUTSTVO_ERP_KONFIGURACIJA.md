# ERP uvoz — konfiguracija (Nivo C)

Konfigurabilan dnevni uvoz iz **SAP**, **Pantheon** ili custom ERP-a u Supabase tabele SPC Web-a.

Ti menjaš JSON config — koje tabele, koje kolone, koji fajlovi. Skripta mapira CSV → bazu.

---

## Brzi start

1. U `config/erp/erp-uvoz.config.json` izaberi preset:

```json
{
  "preset": "sap"
}
```

ili za Pantheon:

```json
{
  "preset": "pantheon"
}
```

2. ERP izvozi CSV u `erp-drop/incoming/` (vidi imena fajlova u presetu).

3. Test:

```cmd
npm run import:erp-dnevni:dry
npm run import:erp-dnevni
```

---

## Fajlovi

| Fajl | Namena |
|------|--------|
| `config/erp/erp-uvoz.config.json` | **Tvoja** aktivna konfiguracija (preset + override) |
| `config/erp/presets/sap.json` | SAP kolone (MATNR, AUFNR, KUNNR…) |
| `config/erp/presets/pantheon.json` | Pantheon kolone (Ident, BrojRN…) |
| `erp-drop/incoming/` | Folder gde ERP piše CSV |
| `erp-drop/examples/` | Primeri CSV fajlova |
| `scripts/erp-dnevni-uvoz.mjs` | Cron / Task Scheduler skripta |

---

## Entiteti (tabele)

Redosled uvoza poštuje FK zavisnosti:

| Entitet | Supabase tabela | Podrazumevano | SAP fajl | Pantheon fajl |
|---------|-----------------|---------------|----------|---------------|
| `linije` | `linije` | uključeno | `linije.csv` | `linije.csv` |
| `masine` | `masine` | uključeno | `masine.csv` | `masine.csv` |
| `smene` | `smene` | isključeno | `smene.csv` | `smene.csv` |
| `tipovi_vozila` | `tipovi_vozila` | uključeno | `tipovi_vozila.csv` | `tipovi_vozila.csv` |
| `pogon_linija_mapa` | `pogon_linija_mapa` | isključeno | `pogon_linija_mapa.csv` | `pogon_linija_mapa.csv` |
| `delovi` | `delovi` | uključeno | `delovi.csv` / `sap_materijal.csv` | `delovi.csv` / `artikli.csv` |
| `crtezi_dela` | `crtez_assets` | uključeno | `crtezi_dela.csv` | `crtezi_dela.csv` |
| `greske_katalog` | `greske_katalog` | uključeno | `greske_katalog.csv` | `greske_katalog.csv` |
| `kupci` | `kupci` | uključeno | `kupci.csv` | `kupci.csv` / `partneri.csv` |
| `merila` | `merila` | uključeno | `merila.csv` | `merila.csv` |
| `kalibracije` | `kalibracije` | uključeno | `kalibracije.csv` | `kalibracije.csv` |
| `karakteristike_merljive` | `karakteristike_merljive` | uključeno | `karakteristike_merljive.csv` / `sap_mic.csv` | `karakteristike_merljive.csv` |
| `barkod_profili` | `barkod_profili` | isključeno | `barkod_profili.csv` | `barkod_profili.csv` |
| `radnici` | `radnici` | isključeno | `radnici.csv` | `zaposleni.csv` |
| `radni_nalozi` | `radni_nalozi` | uključeno | `radni_nalozi.csv` / `auftraege.csv` | `radni_nalozi.csv` / `rn.csv` |

---

## Kako prilagoditi config

### Isključi entitet

U `erp-uvoz.config.json`:

```json
{
  "entiteti": {
    "masine": { "ukljuceno": false },
    "linije": { "ukljuceno": false }
  }
}
```

### Promeni naziv CSV fajla

```json
{
  "entiteti": {
    "radni_nalozi": {
      "fajl": "moj_izvoz_rn.csv",
      "fajl_alternativni": ["proizvodni_nalozi.csv"]
    }
  }
}
```

### Dodaj / promeni mapiranje kolona

Svako DB polje ima listu ERP kolona (`iz`) i opcionu transformaciju:

```json
{
  "entiteti": {
    "delovi": {
      "kolone": {
        "id_deo": {
          "iz": ["MATNR", "SifraArtikla", "moj_ident"],
          "transform": "upper"
        },
        "naziv_dela": {
          "iz": ["MAKTX", "Opis"]
        }
      }
    }
  }
}
```

### Transformacije

| `transform` | Primer ulaza → izlaz |
|-------------|----------------------|
| `upper` | `5502-a` → `5502-A` |
| `int` | `500` → `500` |
| `num` | `10,5` → `10.5` |
| `bool` | `1`, `da`, `true` → `true` |
| `datum` | `01.06.2026` → `2026-06-01` |
| `status` | `open` → `aktivan` |
| `uloga` | `operator` → `operator` |
| `tip_kontrole` | auto: `AUTO-*` → `vozilo` |

---

## CLI opcije

```cmd
node scripts/erp-dnevni-uvoz.mjs --dry-run
node scripts/erp-dnevni-uvoz.mjs --preset pantheon
node scripts/erp-dnevni-uvoz.mjs --entitet radni_nalozi
node scripts/erp-dnevni-uvoz.mjs --config C:\put\do\mog.config.json
```

Env varijable:

```env
ERP_PRESET=sap
ERP_DROP_DIR=erp-drop/incoming
ERP_MIN_AGE_MIN=2
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## merge_nulls (dnevni sync)

Za `delovi`, `kupci`, `radni_nalozi` — ako ERP pošalje prazno polje, **ne briše** postojeću vrednost u bazi. Korisno za dnevni delta izvoz.

Polja koja se uvek čuvaju iz baze (za delove): `karakteristika`, `linija_id`, `masina_id`, `kom_za_kontrolu`, `slika_naziv` — podešava se u `preserve_polja`.

---

## Arhiva

Posle uspešnog uvoza CSV se premešta u:

```
erp-drop/processed/YYYY-MM-DD/
```

Log: `logs/erp-uvoz.log` + tabela `erp_uvoz_log` u Supabase.

---

## Primeri

Kopiraj iz `erp-drop/examples/` u `erp-drop/incoming/` za test:

```cmd
copy erp-drop\examples\sap_radni_nalozi.csv erp-drop\incoming\
copy erp-drop\examples\sap_delovi.csv erp-drop\incoming\delovi.csv
npm run import:erp-dnevni:dry
```

---

## Napomene

- **Radni nalozi** zahtevaju da `id_deo` postoji u `delovi` (uvozi delove pre naloga).
- **Radnici** su podrazumevano isključeni — uključi samo ako ERP šalje pouzdane uloge.
- Za Excel master šifrarnik (stariji tok) i dalje važi `npm run sap:csv-excel` — ovaj Nivo C ide direktno u bazu.
- Detalji samo za RN: vidi i `docs/obuka-paket/UPUTSTVO_ERP_RADNI_NALOZI.md`.

---

## UI u aplikaciji (Šifrarnik)

**Modul 0 → Alati → ERP uvoz**

| Način | Opis |
|-------|------|
| **Upload CSV** | Izaberi CSV fajlove sa diska → direktno u Supabase |
| **Server trigger** | Poziva lokalni API koji čita `erp-drop/incoming/` |

### Server API (trigger iz browsera)

Na firm serveru:

```cmd
npm run erp:api
```

Env u `.env.erp`:

```env
ERP_API_PORT=3921
ERP_API_KEY=tvoj_tajni_kljuc
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

U UI: API URL (npr. `http://127.0.0.1:3921`) + ključ → **Osveži iz foldera**.

Cron i dalje radi nezavisno: `npm run import:erp-dnevni`
