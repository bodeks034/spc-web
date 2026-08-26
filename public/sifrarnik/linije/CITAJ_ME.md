# Linije proizvoda — crteži na disku

`public/sifrarnik/linije/` — po jedan folder za svaku privremenu liniju:

| Grana | Kod | Primer |
|-------|-----|--------|
| `vozila/` | `VOZ-01` … | Delovi i final vozila |
| `proizvodi/` | `PRO-01` … | Samostalni proizvodi (ne u vozilu) |

**Automatsko kreiranje foldera:** `npm run sync:linije-crtezi` (čita `tipovi_vozila` iz baze + starter VOZ/PRO 01–10).

Uputstvo: [UPUTSTVO_LINIJE_VOZ_PRO.md](../../docs/obuka-paket/UPUTSTVO_LINIJE_VOZ_PRO.md)
