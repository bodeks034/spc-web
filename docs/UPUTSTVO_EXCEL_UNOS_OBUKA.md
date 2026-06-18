# Excel — gde se šta unosi (obuka)

**Verzija:** jun 2026 · **Projekat:** SPC Web

---

## PDF / štampa

Kompletan vodič za A4 PDF:

**[OBUKA_EXCEL_UNOS.html](./OBUKA_EXCEL_UNOS.html)** → otvori u browseru → Ctrl+P → Save as PDF

---

## Zlatno pravilo

| Gde | Šta |
|-----|-----|
| **Excel / CSV** | Šifrarnik — delovi, granice, greške, radnici, RN **pre** rada |
| **Aplikacija (Modul 1)** | Svakodnevni unos OK/NOK i merenja |
| **Baza (Supabase)** | Aplikacija čita **bazu**, ne Excel sa diska |

Excel menjaš kad dodaješ **novi deo**, **granice**, **greške** ili **radnike** — ne za svako merenje.

---

## Tri glavna Excel fajla

| Fajl | Gde | Tabovi | Uvoz |
|------|-----|--------|------|
| **SPC_master_atributivne.xlsx** | `excel-rad\` | linije, delovi, radnici… | Admin → Uvezi Excel |
| **SPC_merljive.xlsx** | `excel-rad\` ili `docs\` | 3 taba merljive | Modul Merljive → EXCEL |
| **Katalog_vozilo_9_komponenti.xlsx** | `excel-rad\` | 9 sheetova → spoji u CSV | `katalog_gresaka_vozilo` |

Detaljno: [UPUTSTVO_SIFARNIK_I_EXCEL.md](./UPUTSTVO_SIFARNIK_I_EXCEL.md)

---

## Brza mapa — ko popunjava šta

| Podatak | Excel tab | Ko unosi | Aplikacija |
|---------|-----------|----------|------------|
| ID dela | `delovi` | Inženjer/admin | Operator skenira |
| RN | `radni_nalozi` | Planiranje / ERP | Predlog pri unosu |
| Kontrolor | `radnici` | Admin | **Automatski** pri loginu |
| Kom za kontrolu N | `delovi` | Inženjer | Atributivne serija |
| LSL / USL | `karakteristike_merljive` | Inženjer | Merljive provera |
| Greške OK/NOK | `greske_katalog` | Inženjer | Dropdown |
| Ček lista | `kontrolna_lista_stavke` | Inženjer | Poka-yoke |
| Merenja / log | — | **Ne u Excel** | Unos Modul 1 |

---

*Povezano: [UPUTSTVO_KORISCENJE_APLIKACIJE.md](./UPUTSTVO_KORISCENJE_APLIKACIJE.md) · [OBUKA_SPC_KOMPLET.html](./OBUKA_SPC_KOMPLET.html)*
