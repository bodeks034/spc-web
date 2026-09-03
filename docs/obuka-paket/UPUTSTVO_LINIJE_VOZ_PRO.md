# Linije vozila (VOZ-XX) i proizvoda (PRO-XX)

Uputstvo za **privremene linije** u Modulu 0 — **Radni režim** (dnevni sto), Hub fokus, unos delova, preimenovanje, folderi za crteže.

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

## II. Radni režim (dnevni sto)

**Podrazumevani ulaz** u Modul 0 — ekran za dnevni rad inženjera / kvaliteta. Pun Hub (svi tabovi) otvaraš preko **Svi tabovi →**.

### Tipičan tok

```
Izaberi liniju → Sledeći korak → uradi (GU / greške / crtež…) → Snimi/Objavi
  → Gotovo → sledeći → ponovi
```

| Element | Šta radi |
|---------|----------|
| **Pločice / Linija** | Izbor `VOZ-XX` / `PRO-XX` za danas (pamti se u browseru) |
| **+ Novi deo** | Čarobnjak Glavnog unosa za tu liniju |
| **Sledeći korak** | Prvi delimični deo na liniji + CTA (npr. Greške →) |
| **Delimični** | Lista rupa; filter **Svi / GU / Greške / Crtež / Barkod** |
| **Danas zatvoreno** | Broj kompletiranih delova danas (timski iz audit loga + lokalno) |
| **% kompletno** | Udeo kompletiranih na izabranoj liniji |
| **Nastavi gde si stao** | Banner sa poslednjim ID-om na kome si radio |
| **Obuka** | 3-korak uvod (jednom); dugme **Obuka** ponovo prikazuje |
| **Svi tabovi →** | Pun Hub (ERP, Održavanje, svi tabovi) |

**Tastatura** (kad nisi u polju za unos): `Enter` = sledeći korak · `N` = novi deo · `R` = osveži.

**Tablet / telefon:** radi u Radnom režimu. Pun Hub traži potvrdu (namenjen desktopu).

### Gotovo → sledeći

Posle snimanja / objave u Hubu pojavi se zeleni bar **Gotovo → sledeći**:

1. Ako je deo kompletan — beleži se u „Danas zatvoreno“.
2. Ako sheet ima **više ID-eva** — otvara se prvi još nekompletan; ostali idu u **red** (banner **Sledeći u redu →**).
3. Ako nema više koraka u seriji — vraća na Radni režim i otvara sledeći delimični sa linije.

### Hub — „Radim na liniji“ (fokus traka)

Kad si u **Svi tabovi**, na vrhu i dalje postoji traka:

```
Radim na liniji: [ VOZ-03 ▼ ]   + Novi deo   Preimenuj liniju
```

| Izbor | Efekat |
|-------|--------|
| **— sve linije —** / prazno | Širi pregled (Brzi start kad nema linije) |
| **VOZ-03 / PRO-02…** | Fokus: GU sheet, Delovi, Održavanje/batch, Nastavi banner |

- **Glavni unos** — predlaže sheet `voz-03_delovi` / `pro-02_delovi`
- **Delovi / Održavanje** — filter / scope po liniji
- **← Radni režim** — povratak na dnevni sto

**Tipičan radni dan:** Radni režim → linija → sledeći korak → snimi → Gotovo → sledeći. ERP / audit / batch → **Svi tabovi**.

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
3. **Radni režim** → linija `VOZ-11` → **+ Novi deo**

---

## X. Checklist — nova linija

- [ ] Tip u `tipovi_vozila` (VOZ ili PRO)
- [ ] Folder crteža (API ili sync skripta)
- [ ] Tehnički crteži u `tehnicki/`
- [ ] (VOZ final) silueta u `dijagram/` + polje Dijagram u Tipovima linija
- [ ] Prvi deo: Radni režim → linija → čarobnjak → Objavi → Gotovo → sledeći
- [ ] Checklist: greške · crtež · barkod · test Modul 1

---

## XI. ERP

Kolona `product_group` / `SifraVozila` mapira se na **kod linije** (`VOZ-02`, `PRO-01`). ERP uvoz: **Napredno → ERP uvoz** (admin). Detalji: [UPUTSTVO_ERP_KONFIGURACIJA.md](./UPUTSTVO_ERP_KONFIGURACIJA.md).

---

## XII. SYNC (HTML obuka)

<!-- SYNC:linije-voz-pro -->
**Sažetak:** VOZ = vozilo, PRO = proizvod; **Radni režim** = dnevni sto (linija → sledeći korak → Gotovo → sledeći); Hub = Svi tabovi + **Radim na liniji**; folderi `public/sifrarnik/linije/`; sync `npm run linije-crtezi:api` + Održavanje.
<!-- /SYNC:linije-voz-pro -->
