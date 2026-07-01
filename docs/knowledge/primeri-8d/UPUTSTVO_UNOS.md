# Uputstvo — 10 Word 8D → šabloni u aplikaciji

Tvoji gotovi 8D iz Word-a ubacujemo u **`src/data/primeri-8d.json`**. Asistent ih automatski koristi pri „Generiši nacrt 8D“ (prioritet ispred ugrađenih šablona).

## Šta mi pošalji

Jedan od sledeća:

1. **10 Word fajlova** (.docx) — anonimizovani (bez imena kupaca, internih brojeva serija)
2. **Ili** popunjen **`primeri-8d.json`** (kopiraj demo unos 10 puta i izmeni)

## Mapiranje Word → JSON

| Word / 8D sekcija | JSON polje |
|-------------------|------------|
| Naziv defekta / D2 Šta | `problem`, `kljucevi[]` |
| D2 (5W1H) | `d2.inicijalni`, `d2.sta`, `d2.kada`, `d2.gde`, `d2.ko`, `d2.koji`, `d2.kako` |
| D3 privremena | `privremena` |
| D4 — 5× Zašto (lanac) | `why[]` — **tačno 5 stringova** |
| D4 — Ishikawa (6M) | `m6Detalj.ljudi`, `.masina`, `.metod`, `.materijal`, `.merenje`, `.okruzenje` |
| Poslednji korak 5-Why / koren | `korenskiUzrok` |
| D5 korektivna | `resenje` |
| D7 prevencija (stavke) | `d7Stavke[]` |
| Pareto reči za match | `kljucevi` — npr. `["ogreban", "transport", "mrap"]` |

### `kljucevi` — važno

Reči koje se pojavljuju u **Pareto defektu** u SPC-u. Kad operater generiše 8D, bot traži najbolje poklapanje.

Primer: defekt u logu „Ogrebotina transport“ → kljucevi: `["ogreban", "ogrebotina", "transport"]`

### `m6` — dominantna grana Ishikawe

Jedna vrednost: `ljudi` | `masina` | `metod` | `materijal` | `merenje` | `okruzenje`

## Validacija pre slanja

```bash
node scripts/validiraj-primeri-8d.mjs
```

## Izvoz iz postojećih 8D u bazi (opciono)

Ako imate popunjene 8D u aplikaciji:

```bash
# .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ili anon + RLS)
node scripts/izvezi-osmd-u-primeri.mjs
```

Generiše `docs/knowledge/primeri-8d/izvezeno-iz-baze.json` za pregled — **ne commituj** bez anonimizacije.

## Word folder (preporučeno za više fajlova)

1. Stavite `.docx` u `docs/knowledge/primeri-8d/word/`
2. `npm run build:primeri-8d:word`
3. `node scripts/validiraj-primeri-8d.mjs`

## Popunjeno u aplikaciji

Snimljeni 8D u bazi **automatski** ulaze u predloge pri „Generiši nacrt 8D“ (keš ~5 min).

Za statičku arhivu u repou: `node scripts/izvezi-osmd-u-primeri.mjs` → pregled → merge u `primeri-8d.json`.

## PFMEA / Control Plan

Excel fajlovi: `docs/knowledge/pfmea-cp/` → `npm run build:pfmea-cp:all`

Vidi `docs/knowledge/README.md`.

## Posle tvog slanja

Agent:

1. Mapira Word → JSON unose
2. Validira skriptom
3. Briše demo unos (`primer-primer-strukture`)
4. Build i test na MRAP delu

## Demo unos

U `primeri-8d.json` postoji **jedan demo** koji pokazuje punu strukturu. Obriši ga kad dodamo pravih 10.
