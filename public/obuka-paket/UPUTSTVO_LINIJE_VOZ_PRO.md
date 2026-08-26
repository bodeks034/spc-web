# Linije vozila (VOZ-XX) i proizvoda (PRO-XX)

Uputstvo za **privremene linije** u Modulu 0 — unos delova, preimenovanje, folderi za tehničke crteže.

Povezano: [UPUTSTVO_MODUL_SIFARNIK.md](./UPUTSTVO_MODUL_SIFARNIK.md) · [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) · [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md)

---

## I. Zašto VOZ i PRO

| Prefiks | Značenje | Primer koda | Privremeni naziv |
|---------|----------|-------------|------------------|
| **VOZ-** | Vozilo (delovi + final sa dijagramom) | `VOZ-01` | Privremeni Vozilo 1 |
| **PRO-** | Samostalan proizvod (ne ugrađuje se u vozilo) | `PRO-01` | Privremeni Proizvod 1 |

**Kod** (`VOZ-03`) ostaje stabilan. **Naziv** (`Privremeni Vozilo 3` → `Hamer civilni`) menjaš kad saznaš pravo ime — Modul 0 → **Celo vozilo → Tipovi vozila → Izmeni → Naziv**.

Migracija `87_tipovi_linije_privremene.sql` unosi **VOZ-01…10** i **PRO-01…10** kao starter. Za **11+** liniju: **+ Novi tip** sa kodom `VOZ-11` / `PRO-11`.

---

## II. Brzi start u aplikaciji

1. Otvori **Modul 0 — Šifrarnik**.
2. Panel **Brzi start** — klik na `VOZ-03` ili `PRO-02` → otvara se Glavni unos i čarobnjak sa izabranom linijom.
3. **+ Opšti deo** — delovi nezavisni od bilo koje linije (`opsti_1` sheet).
4. **Preimenuj liniju →** vodi na Tipove vozila.

### Tri koraka do kompletnog dela

```
Linija (VOZ/PRO) → Glavni unos (dimenzije) → Objavi u šifrarnik
```

Posle objave: greške, crtež dela, barkod, test Modul 1.

---

## III. Glavni unos — sheet po liniji

| Linija | Sheet komponente | Sheet final |
|--------|------------------|-------------|
| `VOZ-01` | `voz-01_delovi` | `voz-01_final` |
| `PRO-05` | `pro-05_delovi` | `pro-05_final` |
| Opšti | `opsti_1` | — |

**Čarobnjak + Novi deo:**

| Tip unosa | VOZ | PRO |
|-----------|-----|-----|
| Komponenta | `tip_kontrole=deo`, veza `VOZ-XX` | isto |
| Finalna kontrola | `tip_kontrole=vozilo`, dijagram + zone | `tip_kontrole=deo`, bez dijagrama zona |

---

## IV. Folderi za crteže na disku

### Gde

```
public/sifrarnik/linije/
├── CITAJ_ME.md
├── vozila/
│   ├── VOZ-01/
│   │   ├── CITAJ_ME.md
│   │   ├── tehnicki/    ← PDF/PNG/DWG tehnički crteži
│   │   ├── dijagram/    ← silueta vozila (finalna kontrola)
│   │   └── sop/         ← SOP slike
│   ├── VOZ-02/
│   …
└── proizvodi/
    ├── PRO-01/
    │   ├── tehnicki/
    │   ├── dijagram/    ← opciono (shema proizvoda)
    │   └── sop/
    …
```

### Automatsko kreiranje foldera

Posle migracije 87 ili kad dodaš **VOZ-11 / PRO-12** u Tipove vozila:

```bash
npm run sync:linije-crtezi
```

Skripta:

- čita sve `VOZ-*` i `PRO-*` iz tabele `tipovi_vozila`;
- kreira nedostajuće foldere i `CITAJ_ME.md` u svakom;
- uvek obezbeđuje starter **01–10** čak i bez baze.

Simulacija bez pisanja: `npm run sync:linije-crtezi -- --dry-run`

### Šta u koji podfolder

| Podfolder | Vozilo (VOZ) | Proizvod (PRO) |
|-----------|--------------|----------------|
| **tehnicki/** | Crteži delova, sklopova, montaže | Crteži kućišta, sklopa, detalja |
| **dijagram/** | Silueta bočnog prikaza **bez** krugova K/M/T (PNG/SVG). U Tipovima vozila: putanja npr. `/sifrarnik/linije/vozila/VOZ-01/dijagram/silueta.png` | Opciono: fotografija / shema (nema zone-mape) |
| **sop/** | SOP slike za operatere | Isto |

**Crtež jednog dela na liniji** (operater vidi posle skena): i dalje Modul 0 → **Crtež dela** + Storage `atributivne/` — to nije isto što i folder linije (linija = arhiva/reference za inženjere).

### Web putanja

Fajl `public/sifrarnik/linije/vozila/VOZ-01/tehnicki/lim.pdf` dostupan je u browseru kao:

`/sifrarnik/linije/vozila/VOZ-01/tehnicki/lim.pdf`

---

## V. Preimenovanje linije

| Menjaš | Gde | Kada |
|--------|-----|------|
| **Naziv** (prikaz) | Tipovi vozila → Izmeni | Kad saznaš pravo ime |
| **Kod** (VOZ-01) | Ne menja se u UI | Ostaje trajno |
| **Folder na disku** | Ime foldera = kod (`VOZ-01`) | Ne preimenuj ručno dok ne uskladimo alat |

Napomena u Tipovima vozila može držati puno ime projekta dok traje razvoj.

---

## VI. Više od 10 linija

1. Tipovi vozila → **+ Novi tip** → `VOZ-11`, naziv npr. `Privremeni Vozilo 11`.
2. `npm run sync:linije-crtezi` → kreira `public/sifrarnik/linije/vozila/VOZ-11/`.
3. Glavni unos → + Novi deo → izaberi `VOZ-11`.

Nema softverskog limita na broj linija.

---

## VII. Checklist — nova linija

- [ ] Tip u `tipovi_vozila` (VOZ ili PRO)
- [ ] `npm run sync:linije-crtezi`
- [ ] Tehnički crteži u `tehnicki/`
- [ ] (VOZ final) silueta u `dijagram/` + polje Dijagram u Tipovima vozila
- [ ] Prvi deo kroz čarobnjak → Objavi u šifrarnik
- [ ] Greške + crtež dela + barkod + test Modul 1

---

## VIII. ERP

Kolona `product_group` / `SifraVozila` u ERP CSV mapira se na **kod linije** (`VOZ-02`, `PRO-01`). Detalji: [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md).

---

## IX. SYNC (HTML obuka)

<!-- SYNC:linije-voz-pro -->
**Sažetak:** VOZ = vozilo, PRO = proizvod; folderi `public/sifrarnik/linije/`; sync `npm run sync:linije-crtezi`.
<!-- /SYNC:linije-voz-pro -->
