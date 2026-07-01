# PFMEA i Control Plan — Excel

Stavite `.xlsx` workbook-ove ovde. Svaki treba da ima listove:

- **PFMEA** — redovi od 5. reda (header u 4.)
- **Control Plan** — isto
- **RPN Summary** — opciono

```bash
npm run build:pfmea-cp:all
```

Svi fajlovi se spajaju u `src/data/pfmea-control-plan-industrijski.json`.

Za Supabase: `npm run seed:pfmea-cp`

## Spojene ćelije (merge)

Parser **podržava** spojene ćelije:

1. **Merge regioni** (`!merges`) — vrednost iz gornjeg-levog ugla se kopira u celu oblast
2. **Vertikalno grupisanje** — prazne ćelije u kolonama *Br. dela*, *Proces*, *Mod greške*, *Karakteristika* nasleđuju vrednost iz reda iznad

**Preporuka:** merge u redu 4 (header) i u podacima je OK. Kolone S/O/D, akcija, odgovorni — **ne spajaj** (svaki red = jedna stavka).

Pri build-u u konzoli vidiš: `merge: N regiona, X ćelija + Y nasleđeno`.

## Referentni šablon

`docs/knowledge/PFMEA_ControlPlan_Industrijski_Delovi.xlsx` ili izvoz iz PFMEA modula u aplikaciji.
