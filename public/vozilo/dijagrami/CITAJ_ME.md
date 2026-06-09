# Dijagrami vozila (siluete)

## Važno — šta je šta

| Šta | Gde | Ko menja |
|-----|-----|----------|
| **Silueta vozila** (auto, kamion…) | Ovaj folder `public/vozilo/dijagrami/*.svg` | Ti — zameni fajl |
| **Zone K, M, T…** (krugovi, legenda) | U kodu — `src/lib/voziloZoneConfig.js` | Samo ako pomeriš tačke na novom crtežu |
| **Katalog grešaka** | Supabase `katalog_gresaka_vozilo` | Excel / Studio |

**U SVG stavi samo oblik vozila** — bez krugova zona i bez teksta K/M/T (to crta aplikacija preko slike).

**viewBox mora ostati:** `0 0 682 520` (da zone ostaju na mestu).

---

## Fajlovi

| Fajl | Tip vozila | Povezuje se preko |
|------|------------|-------------------|
| `auto-limuzina.svg` | Limuzina / auto | `vozilo katalog id` = FINAL-001, AUTO-001 |
| `suv.svg` | SUV | SUV, AUTO-SUV |
| `kamion.svg` | Kamion | KAMION, AUTO-KAMION |
| `dzip.svg` | Džip | DZIP, AUTO-DZIP |
| `kombi.svg` | Kombi | KOMBI, AUTO-KOMBI |

Mapiranje u kodu: `src/lib/voziloDijagramConfig.js`

---

## Kako zameniš sliku

1. Nacrtaj siluetu u Inkscape / Illustrator / Figma (bočno vozilo).
2. Izvezi kao **SVG** ili **PNG** (1364×1040 px za PNG).
3. Sačuvaj preko postojećeg fajla, npr. `suv.svg`.
4. Refresh aplikacije (Ctrl+F5).
5. U aplikaciji unesi **AUTO-SUV** (ili deo sa `vozilo katalog id` = SUV).

### Novi tip vozila

1. Dodaj `public/vozilo/dijagrami/moj-tip.svg`
2. U `voziloDijagramConfig.js` dodaj:
   ```js
   MOJ_TIP: "/vozilo/dijagrami/moj-tip.svg",
   AUTO-MOJ: "/vozilo/dijagrami/moj-tip.svg",
   ```
3. U `delovi` (Excel/Supabase): `AUTO-MOJ`, tip=vozilo, `vozilo katalog id` = MOJ_TIP

### PNG umesto SVG

U `voziloDijagramConfig.js` stavi putanju `.png` — radi isto.

---

## Referenca (stari fajlovi)

- `public/vozilo/vehicle_diagram_full.svg` — pun primer sa zonama (referenca)
- `sifarnik celo vozilo/vehicle_quality_zones_diagram.svg` — referenca dizajna (ne učitava se u app)

Radna kopija paketa: `excel-rad/vozilo-dijagrami-paket/`
