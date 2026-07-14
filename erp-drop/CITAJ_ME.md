# ERP drop folder



ERP sistem svakodnevno izvozi CSV u `incoming/`. Task Scheduler (06:00) pokreće `npm run import:erp-dnevni`.



**SAP vodič (šta tačno staviti):** `docs/obuka-paket/UPUTSTVO_SAP_ERP_DROP.md`



## Očekivani fajlovi (SAP preset)



| Fajl | Šta uvozi | Obavezno |

|------|-----------|----------|

| `linije.csv` | Proizvodne linije / radna mesta | Preporučeno |

| `masine.csv` | Mašine / oprema | Preporučeno |

| `tipovi_vozila.csv` | Tipovi vozila (MRAP, NTV…) | Preporučeno |

| `delovi.csv` | Artikli / materijali | **Da** (pre RN) |

| `crtezi_dela.csv` | Crteži dela (DWG + SVG putanje) | Preporučeno |

| `greske_katalog.csv` | Katalog defekata (QM / atributivne) | Preporučeno |

| `kupci.csv` | Kupci | Preporučeno |

| `merila.csv` | Merna oprema / alati | Preporučeno |

| `kalibracije.csv` | Kalibracije merila (posle `merila.csv`) | Preporučeno |

| `karakteristike_merljive.csv` | Kontrolne dimenzije / MIC (LSL, USL) | Preporučeno |

| `sap_radni_nalozi.csv` | Proizvodni nalozi | **Da** |



### Mapa linija (tablet / šifrarnik)



| Fajl | Šta uvozi |

|------|-----------|

| `pogon_linija_mapa.csv` | Mapa linija faza → pogon (WERKS) — uključi u config kad SAP šalje |



### Opciono (isključeno u configu)



| Fajl | Šta uvozi |

|------|-----------|

| `barkod_profili.csv` | Sadržaj barkod etikete po delu |

| `smene.csv` | Smene |

| `radnici.csv` | Zaposleni (pažljivo sa ulogama) |



Alternativni nazivi: vidi `config/erp/presets/sap.json` → `fajl_alternativni` (npr. `radni_nalozi.csv`, `sap_mic.csv`).



## Primeri



Kopije za test: `erp-drop/examples/`



## Posle uvoza



Uspešni fajlovi idu u `processed/YYYY-MM-DD/`.  

Admin → **ERP diff** prikazuje šta je upsert-ovano danas.



## Ručno



```powershell

npm run import:erp-dnevni:dry

npm run import:erp-dnevni

```



Migracije UNIQUE: `62_erp_uvoz_constraints.sql`, `63_erp_uvoz_praksa_constraints.sql`, `64_greske_katalog_erp_upsert.sql` (jednom u Supabase).



> **Napomena:** Stari folder `sap-drop/` je za CSV→Excel tok (`npm run sap:csv-excel`). Za dnevni uvoz koristi samo `erp-drop/`.

