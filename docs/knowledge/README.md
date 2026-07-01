# Knowledge base — 8D, PFMEA, Control Plan

Referentni materijali za **SPC Asistent 8D** (predloge po sličnom defektu).

## Struktura foldera

```
docs/knowledge/
├── README.md                          ← ovaj fajl
├── primeri-8d/
│   ├── UPUTSTVO_UNOS.md               ← mapiranje Word → JSON
│   ├── word/                          ← stavite .docx ovde (do 15+ fajlova)
│   ├── izvuceno-iz-word.txt           ← generiše build (ne ručno)
│   └── izvezeno-iz-baze.json          ← izvoz iz aplikacije (anonimizovati)
├── pfmea-cp/                          ← Excel fajlovi (.xlsx)
│   └── (više workbook-ova po delu/procesu)
└── PFMEA_ControlPlan_Industrijski_Delovi.xlsx  ← legacy primer
```

**Produkcioni JSON** (učitava aplikacija pri build-u):

| Tip | JSON |
|-----|------|
| 8D šabloni | `src/data/primeri-8d.json` |
| PFMEA + CP | `src/data/pfmea-control-plan-industrijski.json` |

## Workflow — 8D (Word)

1. Anonimizujte Word izveštaje (bez imena kupaca, internih LOT brojeva).
2. Kopirajte `.docx` u `docs/knowledge/primeri-8d/word/`.
3. Pokrenite:

```bash
npm run build:primeri-8d:word    # izvuče sve .docx → tekst → JSON
node scripts/validiraj-primeri-8d.mjs
npm run build
```

Alternativa: direktno uredite `src/data/primeri-8d.json` (vidi `UPUTSTVO_UNOS.md`).

## Workflow — PFMEA / Control Plan (Excel)

1. Stavite `.xlsx` u `docs/knowledge/pfmea-cp/` (listovi: **PFMEA**, **Control Plan**, opciono **RPN Summary**).
2. Spojene ćelije su podržane (merge + nasleđivanje za deo/proces/mod greške/karakteristiku).
3. Pokrenite:

```bash
npm run build:pfmea-cp:all       # spaja sve Excel fajlove u jedan JSON
npm run seed:pfmea-cp            # opciono: u Supabase
npm run build
```

Jedan fajl: `npm run build:pfmea-cp`

## Popunjeno u aplikaciji → budući predlozi

| Gde se snima | Kako ulazi u predloge |
|--------------|----------------------|
| 8D (`osmd_izvestaji`) | **Automatski** pri „Generiši nacrt 8D“ (čita iz Supabase, keš 5 min) |
| PFMEA/CP (modul) | **Automatski** — redovi iz baze + JSON arhiva pri match-u defekta |
| Ručni izvoz (backup) | `node scripts/izvezi-osmd-u-primeri.mjs` → merge u `primeri-8d.json` |

Za 8D iz baze potrebno je dovoljno popunjen D4 (bar 2 koraka 5-Why ili Ishikawa 6M).

## Asistent u aplikaciji

- Dugme **Generiši nacrt 8D** na SPC dashboardu
- Match po **nazivu defekta** (Pareto), ne po ID dela
- Prioritet: primeri iz baze → JSON/Word arhiva → ugrađeni šabloni
