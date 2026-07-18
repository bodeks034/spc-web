# SAP → erp-drop/incoming — šta staviti u folder

**Jedan izvor istine:** ERP izvozi CSV u `erp-drop/incoming/`. Task Scheduler (06:00) pokreće `npm run import:erp-dnevni`.

> **Ne koristiti** stari `sap-drop/` za dnevni uvoz — to je CSV→Excel pomoćni tok. Za produkciju samo `erp-drop/`.

---

## Gde SAP stavlja fajlove

| Putanja na serveru | Ko piše | Ko čita |
|--------------------|---------|---------|
| `erp-drop/incoming/*.csv` | SAP izvoz / IT kopija | `scripts/erp-dnevni-uvoz.mjs` |
| `erp-drop/processed/YYYY-MM-DD/` | Automatski arhiva | IT / revizija |
| `erp-drop/examples/` | Dobavljač (primeri) | Test `import:erp-dnevni:dry` |

Env (`.env.local` ili `.env.erp`):

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ERP_PRESET=sap
ERP_DROP_DIR=erp-drop/incoming
```

---

## Obavezni fajlovi (SAP preset)

| Fajl u `incoming/` | SAP izvor (tipično) | Šta uvozi u SPC |
|--------------------|---------------------|-----------------|
| `delovi.csv` | MM60 / materijali (MATNR) | Tabela `delovi` — **pre RN** |
| `sap_radni_nalozi.csv` | COOIS / AUFNR | `radni_nalozi` |

Alternativni nazivi: `radni_nalozi.csv` — vidi `config/erp/presets/sap.json` → `fajl_alternativni`.

---

## Preporučeni fajlovi (dnevni paket)

| Fajl | SAP izvor | SPC tabela |
|------|-----------|------------|
| `linije.csv` | CRHD / ARBPL (radna mesta) | `linije` |
| `masine.csv` | EQUI / EQUNR | `masine` |
| `tipovi_vozila.csv` | Custom / master vozila | `tipovi_vozila` |
| `crtezi_dela.csv` | DMS putanje DWG/SVG | `crtezi_dela` |
| `greske_katalog.csv` | QM katalog (QMGRP/QMCOD) | `greske_katalog` |
| `kupci.csv` | KNA1 / KUNNR | `kupci` |
| `merila.csv` | Alati / measuring equipment | `merila` |
| `kalibracije.csv` | Kalibracioni zapisi | `kalibracije` (posle merila) |
| `karakteristike_merljive.csv` | MIC / inspekcione karakteristike | `karakteristike_merljive` |

Redosled uvoza: `config/erp/presets/sap.json` → `redosled_uvoza` (linije pre delova, merila pre kalibracija).

---

## Mapa pogon ↔ linija (tablet / šifrarnik)

| Fajl | Kada uključiti | Svrha |
|------|----------------|-------|
| `pogon_linija_mapa.csv` | Kad SAP zna WERKS/ARBPL mapu | `pogon_linija_mapa` — manje grešaka pri izboru dela |

Primer kolona: `linija_faza,linija_id,pogon_kod` — vidi `erp-drop/examples/pogon_linija_mapa.csv`.

U `config/erp/erp-uvoz.config.json` postavi `"pogon_linija_mapa": { "ukljuceno": true }` kad SAP šalje fajl.

---

## Opciono (isključeno u podrazumevanom configu)

| Fajl | Napomena |
|------|----------|
| `barkod_profili.csv` | Profili etiketa po delu |
| `smene.csv` | Smene |
| `radnici.csv` | Zaposleni — pažljivo sa ulogama u aplikaciji |

---

## SAP job — preporuka za IT

1. **Noćni ili ranojutarnji izvoz** (pre 06:00) u `\\server\spc\erp-drop\incoming\` ili lokalni folder koji Task Scheduler vidi.
2. **Jedan fajl = jedna entitet-tabela** — ne spajati u jedan CSV.
3. **UTF-8 sa zaglavljem** — separator `,` ili `;` (auto-detekcija).
4. **Stabilna imena fajlova** — tačno kao u tabeli iznad (ili alternativa iz preset-a).
5. **Atomski drop:** piši u `incoming/.tmp/` pa preimenuj u `incoming/` (izbegni uvoz pola fajla).

---

## Provera pre go-live

```powershell
# Suhi probni uvoz (ne piše u bazu)
npm run import:erp-dnevni:dry

# Pravi uvoz
npm run import:erp-dnevni

# Log
type logs\erp-uvoz.log
```

Admin → **ERP poslednji uvoz** — pregled šta je upsert-ovano danas (bez čitanja log fajla).

Migracije (jednom u Supabase): `62_erp_uvoz_constraints.sql`, `63_erp_uvoz_praksa_constraints.sql`, `64_greske_katalog_erp_upsert.sql`.

---

## Ko zove koga

| Problem | Kontakt |
|---------|---------|
| SAP izvoz ne stiže / pogrešne kolone | SAP tim + IT |
| Uvoz FAIL u adminu | Kvalitet / admin aplikacije |
| UNIQUE / migracija | Dobavljač SPC |
| Licenca | Dobavljač SPC |

---

*Detaljno mapiranje kolona: `config/erp/presets/sap.json` · puni ERP vodič:
`UPUTSTVO_ERP_KONFIGURACIJA.md` · prošireni proizvodni/QMS paket:
`UPUTSTVO_ERP_MASTER_V2.md`*
