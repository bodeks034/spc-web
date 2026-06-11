# Katalog vozila po komponentama (NTV / MRAP / MRAP1)

Svaki fajl = jedna zona na dijagramu za jedno vozilo.

| Fajl | Zona na dijagramu |
|------|-------------------|
| `NTV-KAROS-001.csv` | K — Karoserija |
| `NTV-MOTOR-001.csv` | M — Motor |
| `NTV-TRANS-001.csv` | T — Transmisija |
| `NTV-INT-001.csv` | I — Enterijer |
| `NTV-EL-001.csv` | E — Elektrika |
| `NTV-FINAL-001.csv` | F — Finalna |

Isto za prefikse `MRAP-` i `MRAP1-`.

## Uvoz u bazu

1. Uredi CSV po potrebi (npr. samo `MRAP-MOTOR-001.csv`)
2. U folderu projekta pokreni:
   ```bash
   npm run spoji:katalog-vozilo
   ```
   → pravi `docs/katalog_gresaka_vozilo.csv` (header jednom, svi redovi)
3. Uvezi:
   ```bash
   npm run import:docs
   ```
   ili Admin → **Uvezi master Excel** (tab `katalog_gresaka_vozilo`)

## delovi

| id delo | vozilo katalog id |
|---------|-------------------|
| NTV-001 | **NTV** |
| MRAP-001 | **MRAP** |
| MRAP1-001 | **MRAP1** |
