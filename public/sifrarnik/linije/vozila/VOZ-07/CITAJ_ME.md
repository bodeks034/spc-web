# VOZ-07 — Privremeni Vozilo 7

Folder za **vozilo** `VOZ-07`. Naziv linije menjaš u Modul 0 → Tipovi vozila (polje Naziv).

## Podfolderi

| Folder | Šta stavljaš |
|--------|----------------|
| `tehnicki/` | Tehnički crteži delova i sklopova (PDF, PNG, DWG…). Referenca za inženjere. |
| `dijagram/` | Silueta vozila za finalnu kontrolu (PNG/SVG bez zona K/M/T). U Tipovima vozila upiši npr. `/sifrarnik/linije/vozila/VOZ-07/dijagram/silueta.png`. |
| `sop/` | SOP slike za operatere (može i u Storage `atributivne/`). |

## Veza sa šifrarnikom

- **Kod linije** `VOZ-07` = `vozilo_katalog_id` na delovima + ERP šifra u Glavnom unosu.
- **GU sheet:** `voz-07_delovi` (komponente), `voz-07_final` (finalna kontrola).
- Crtež pojedinačnog dela u aplikaciji: Modul 0 → Crtež dela (`slika_naziv` + Storage).

## Novi folderi

Kad dodaš `VOZ-11` / `PRO-11` u Tipove vozila, pokreni:

```bash
npm run sync:linije-crtezi
```

Detaljno uputstvo: `docs/obuka-paket/UPUTSTVO_LINIJE_VOZ_PRO.md`
