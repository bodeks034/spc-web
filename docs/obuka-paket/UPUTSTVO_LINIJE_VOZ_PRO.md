# Linije vozila (VOZ-XX) i proizvoda (PRO-XX)

Uputstvo za **privremene linije** u Modulu 0 — radni režim, unos delova, preimenovanje, folderi za crteže.

Povezano: [UPUTSTVO_MODUL_SIFARNIK.md](./UPUTSTVO_MODUL_SIFARNIK.md) · [UPUTSTVO_GLAVNI_UNOS.md](./UPUTSTVO_GLAVNI_UNOS.md) · [UPUTSTVO_NOVI_DEO_SIFARNIK.md](./UPUTSTVO_NOVI_DEO_SIFARNIK.md)

---

## I. Zašto VOZ i PRO

| Prefiks | Značenje | Primer koda | Privremeni naziv |
|---------|----------|-------------|------------------|
| **VOZ-** | Vozilo (delovi + final sa dijagramom) | `VOZ-01` | Privremeni Vozilo 1 |
| **PRO-** | Samostalan proizvod (ne ugrađuje se u vozilo) | `PRO-01` | Privremeni Proizvod 1 |

**Kod** (`VOZ-03`) ostaje stabilan. **Naziv** (`Privremeni Vozilo 3` → `Hamer civilni`) menjaš kad saznaš pravo ime — Modul 0 → **Linije proizvoda → Tipovi linija → Izmeni → Naziv**.

Migracija `87_tipovi_linije_privremene.sql` unosi **VOZ-01…10** i **PRO-01…10** kao starter. Za **11+** liniju: **+ Novi tip** sa kodom `VOZ-11` / `PRO-11`.

**Stare linije (legacy):** MRAP, NTV, HAM… — prikazane u Tipovima linija kao grupa **Stare linije (legacy)**. Nisu u Brzom startu; koristi ih dok traje prelaz na VOZ/PRO model.

---

## II. Radni režim — „Radim na liniji“

Na vrhu Modula 0 (ispod migracionog bannera za admina):

```
Radim na liniji: [ VOZ-03 ▼ ]   + Novi deo   Preimenuj liniju
```

| Izbor | Efekat |
|-------|--------|
| **— sve linije —** | Puni pregled (Brzi start, svi sheetovi) |
| **VOZ-03 / PRO-02…** | Fokus na jednu liniju |

Kad izabereš liniju:

- **Glavni unos** — automatski otvara sheet `voz-03_delovi` / `pro-02_delovi`
- **Brzi start** — prikazuje samo tu liniju
- **Delovi (pregled)** — filter po `vozilo_katalog_id` / šifri / prefiksu ID dela
- **Globalna pretraga ID** — upozorenje ako deo pripada drugoj liniji
- Izbor se **pamti** u browseru (`localStorage`) do sledeće promene

**Tipičan radni dan:** izaberi liniju → **+ Novi deo** → popuni → **Objavi u šifrarnik** → prati checklist.

---

## III. Brzi start

1. Otvori **Modul 0 — Šifrarnik**.
2. Panel **Brzi start** — klik na `VOZ-03` ili `PRO-02` → Glavni unos + čarobnjak sa izabranom linijom.
3. **+ Opšti deo** — delovi nezavisni od linije (`opsti_1` sheet).
4. **Preimenuj liniju → Tipovi linija** — menja se samo **Naziv (prikaz)**.

### Dugmad na panelu

| Dugme | Značenje |
|-------|----------|
| **Sakrij** | Sakriva panel do kraja **sesije** (browser tab) |
| **Ne prikazuj više** | Trajno sakrivanje (možeš ponovo uključiti brisanjem `localStorage` ključa ili admin alatom) |

**Inženjer** ne vidi SQL poruke u Brzom startu — ako nema linija, piše „kontaktiraj administratora“. **Admin** vidi referencu na migraciju 87 u Napredno → Održavanje.

### Tri koraka do kompletnog dela

```
Linija (VOZ/PRO) → Glavni unos (dimenzije) → Objavi u šifrarnik
```

Posle objave: zeleni **checklist** sa linkovima (npr. „Katalog grešaka — VOZ-03“, „Defekti po liniji — VOZ-03“).

---

## IV. Pregled grupa u Modulu 0

| Grupa | Tabovi | Ko vidi |
|-------|--------|---------|
| **Osnovno** | Glavni unos · Pogon mapa · Linija↔deo · Liste · Delovi · RN · Kupci · Dobavljači · Linije · Mašine · Smene · Ciljevi · Kontrolna lista · **Barkod** | Svi (kvalitet, šef, admin) |
| **Atributivne** | Greške · Crtež dela · Pogoni po delu | Svi |
| **Merljive** | Dimenzije · SOP · Merila | Svi |
| **Linije proizvoda** | Tipovi linija · Defekti po liniji · Delovi po liniji | Svi |
| **Napredno** | Održavanje · SPC alarm % · Moment JOB · Moment ključevi · ERP uvoz · Backup | **Samo admin** |

---

## V. Glavni unos — sheet po liniji

| Linija | Sheet komponente | Sheet final |
|--------|------------------|-------------|
| `VOZ-01` | `voz-01_delovi` | `voz-01_final` |
| `PRO-05` | `pro-05_delovi` | `pro-05_final` |
| Opšti | `opsti_1` | — |

### Kompaktan birač sheeta

Kad ima **više od 6 linija**, umesto desetina pill dugmadi prikazuje se:

- padajući meni **Linija proizvoda**
- dugmad **Komponente** / **Final**
- link **Svi sheetovi (N)** — stari prikaz svih tabova

### Čarobnjak + Novi deo

| Tip unosa | VOZ | PRO |
|-----------|-----|-----|
| Komponenta | `tip_kontrole=deo`, veza `VOZ-XX` | isto |
| Finalna kontrola | `tip_kontrole=vozilo`, dijagram + zone | `tip_kontrole=deo`, bez dijagrama zona |

**Preskočen korak:** ako je u **Radim na liniji** već izabrana linija, čarobnjak preskače izbor linije i ide direktno na korak 2 (sheet + grupni unos).

---

## VI. Folderi za crteže na disku

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
│   …
└── proizvodi/
    ├── PRO-01/
    …
```

### Kreiranje foldera (admin)

**Način 1 — iz aplikacije (preporučeno na dev mašini):**

1. U jednom terminalu: `npm run linije-crtezi:api` (port 3922)
2. Modul 0 → **Napredno → Održavanje** → panel **Folderi crteža**
3. **Kreiraj folder VOZ-11** ili **Sinhronizuj sve linije**

Pri **snimanju novog tipa** linije (Tipovi linija) aplikacija automatski pokušava isti API.

**Način 2 — terminal:**

```bash
npm run sync:linije-crtezi              # sve linije iz baze + starter 01–10
npm run sync:linije-crtezi -- --kod VOZ-11   # samo jedna linija
npm run sync:linije-crtezi -- --dry-run      # simulacija
```

### Šta u koji podfolder

| Podfolder | Vozilo (VOZ) | Proizvod (PRO) |
|-----------|--------------|----------------|
| **tehnicki/** | Crteži delova, sklopova | Crteži kućišta, sklopa |
| **dijagram/** | Silueta **bez** krugova K/M/T. Putanja u Tipovima: `/sifrarnik/linije/vozila/VOZ-01/dijagram/silueta.png` | Opciono shema / foto |
| **sop/** | SOP slike | Isto |

**Web putanja:** `public/.../VOZ-01/tehnicki/lim.pdf` → `/sifrarnik/linije/vozila/VOZ-01/tehnicki/lim.pdf`

---

## VII. Preimenovanje linije

| Menjaš | Gde | Kada |
|--------|-----|------|
| **Naziv** (prikaz) | Linije proizvoda → Tipovi linija → Izmeni | Kad saznaš pravo ime |
| **Kod** (VOZ-01) | Zaključan pri izmeni postojećeg | Ostaje trajno |
| **Folder na disku** | Ime = kod (`VOZ-01`) | Ne preimenuj ručno |

---

## VIII. Checklist posle „Objavi u šifrarnik“

Zeleni panel sa **klikabilnim stavkama** (otvara odgovarajući tab):

| Tip unosa | Primer stavke |
|-----------|---------------|
| Komponenta VOZ-03 | Delovi (pregled) — VOZ-03 |
| | Katalog grešaka — VOZ-03 |
| | Crtež dela (ID) |
| Final vozilo | Tip linije + dijagram — VOZ-03 |
| | Defekti po liniji — VOZ-03 |
| | Delovi po liniji — VOZ-03 |

Dugme **+ Šablon grešaka (5 tipičnih)** dodaje starter NOK kodove za taj deo.

---

## IX. Više od 10 linija

1. **Linije proizvoda → Tipovi linija → + Novi tip** → `VOZ-11`
2. Admin: **Održavanje → Kreiraj folder VOZ-11** (ili `npm run sync:linije-crtezi -- --kod VOZ-11`)
3. **Radim na liniji: VOZ-11** → **+ Novi deo**

---

## X. Checklist — nova linija

- [ ] Tip u `tipovi_vozila` (VOZ ili PRO)
- [ ] Folder crteža (API ili sync skripta)
- [ ] Tehnički crteži u `tehnicki/`
- [ ] (VOZ final) silueta u `dijagram/` + polje Dijagram u Tipovima linija
- [ ] Prvi deo: radna linija → čarobnjak → Objavi
- [ ] Checklist: greške · crtež · barkod · test Modul 1

---

## XI. ERP

Kolona `product_group` / `SifraVozila` mapira se na **kod linije** (`VOZ-02`, `PRO-01`). ERP uvoz: **Napredno → ERP uvoz** (admin). Detalji: [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md).

---

## XII. SYNC (HTML obuka)

<!-- SYNC:linije-voz-pro -->
**Sažetak:** VOZ = vozilo, PRO = proizvod; **Radim na liniji** fokusira unos; grupe **Linije proizvoda** + **Napredno** (admin); folderi `public/sifrarnik/linije/`; sync `npm run linije-crtezi:api` + Održavanje.
<!-- /SYNC:linije-voz-pro -->
