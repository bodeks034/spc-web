# PRO-05 — Privremeni Proizvod 5

Folder za **proizvod** `PRO-05`. Naziv linije menjaš u Modul 0 → Tipovi vozila (polje Naziv).

## Podfolderi

| Folder | Šta stavljaš |
|--------|----------------|
| `tehnicki/` | Tehnički crteži delova i sklopova (PDF, PNG, DWG…). Referenca za inženjere. |
| `dijagram/` | Opciono: shema proizvoda / fotografija (nema dijagram sa zonama). |
| `sop/` | SOP slike za operatere (može i u Storage `atributivne/`). |

## Veza sa šifrarnikom

- **Kod linije** `PRO-05` = `vozilo_katalog_id` na delovima + ERP šifra u Glavnom unosu.
- **GU sheet:** `pro-05_delovi` (komponente), `pro-05_final` (finalna kontrola).
- Crtež pojedinačnog dela u aplikaciji: Modul 0 → Crtež dela (`slika_naziv` + Storage).

## Novi folderi

Kad dodaš `VOZ-11` / `PRO-11` u Tipove vozila, pokreni:

```bash
npm run sync:linije-crtezi
```

Detaljno uputstvo: `docs/obuka-paket/UPUTSTVO_LINIJE_VOZ_PRO.md`
