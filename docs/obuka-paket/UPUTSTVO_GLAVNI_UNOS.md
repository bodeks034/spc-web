# Glavni unos → SPC šifrarnik (automatski)

Inženjer unosi **sve u jedan fajl**; skripta razdvaja u merljive i atributivne Excel tabove.

## Fajlovi

| Fajl | Ko popunjava |
|------|----------------|
| `excel rad izmenjen/glavni unos.xlsx` | **Inženjer** — tabovi `vozilo1`, `vozilo2`, `vozilo3`… |
| `excel rad izmenjen/sifrarnik-paket/SPC_merljive.xlsx` | **Automatski** — `karakteristike_merljive`, `sop_deo_varijabilni` |
| `excel rad izmenjen/sifrarnik-paket/SPC_atributivne.xlsx` | **Automatski** — `delovi`, `radni_nalozi` |
| `excel rad izmenjen/sifrarnik-paket/csv/` | **Automatski** — isti sadržaj kao Excel (za pregled / diff) |

Pomoćni tabovi u glavnom unosu (ne diraš svaki dan):

- **`pogon_kod`** — **izvor istine** za mapiranje kolone `Linija` → pogon A–H (Ulazna kontrola = A, Preseraj = B, …). Sync automatski puni `pogon_kod` u karakteristikama, SOP-u, delovima i radnim nalozima.
- `Pomocni` — linije, operacije, radnici  

## Pokretanje

```cmd
cd C:\mix\spc-web

REM Provera
npm run sync:glavni-unos:dry

REM Upiši Excel šifrarnik
npm run sync:glavni-unos

REM Excel + uvoz u Supabase (iz sifrarnik-paket, ne iz docs CSV)
npm run sync:glavni-unos:import
```

## Šta skripta radi

1. Čita sve **`vozilo*`** tabove iz `glavni unos.xlsx` (gde ima `id_deo`).
2. Mapira kolone (Karakteristika, USL, LSL, Linija, Instrument, Tip…).
3. **`SPC_merljive.xlsx`**
   - `karakteristike_merljive` — sve dimenzije (`pogon_kod` iz taba `pogon_kod` + kolona `Linija`)
   - `sop_deo_varijabilni` — auto po **id_deo + pogon**
4. **`SPC_atributivne.xlsx`**
   - `delovi` — master + **jedan red po pogonu** (kolona `pogon kod`) za merljive i atributivne
   - `radni_nalozi` — iz kolone `Radni_nalog` ili auto `RN-2026-{ID}-{POGON}`
5. **`sifrarnik-paket/csv/pogon_kod.csv`** — izveštaj mapiranja iz taba `pogon_kod`
6. Delovi **van** glavnog unosa (MRAP, vozila…) **ostaju** u šifrarniku.

## Kolone u voziloN tabu (glavni unos)

| Kolona | Ide u |
|--------|--------|
| `id_deo` | sve tabele |
| `Naziv dela`, `Slika`, `Radni_nalog` | delovi, SOP, RN |
| `Linija`, `Operacija` | **Linija** → `pogon_kod` (tab `pogon_kod` u glavnom unosu); operacija → serija |
| `Karakteristika` | pozicija / naziv mere |
| `Nominal`, `USL`, `LSL`, `Jedinica` | merljive granice |
| `Instrument`, `Tip` | merljiva vs atributivna |
| `Operacija` + `Linija` | **automatski → sifra_merenja 1, 2, 3…** |
| `Ukupno_kom` | **ukupan broj komada** na RN (npr. **100**) |
| `Kom_za_kontrolu_n` | **koliko komada prekontrolisati** od ukupnog (npr. **50 od 100**) — AQL lot, atributivni cilj; **nije** SPC broj merenja |
| `Klasa` (kol. **N**) | **Critical / Major / Minor** — AQL klasa defekta **po dimenziji**; određuje prag SPC alarma na liniji |
| `Tip` (kol. **S**) | **Merljiva** → SPC; **Atributivna** → OK/NOK modul |
| `Nivo_kontrole FAC` (kol. **V**) | FAI / nivo kontrole |
| `FAC broj` (kol. **W**) | broj FAI merenja po dimenziji |
| `SPC broj merenja po dimenziji` (kol. **X**, 1–10) | **Merljiva:** koliko puta meriš istu dimenziju u fazi (npr. **5×**). **Prazno + Tip=Merljiva → auto 5.** **Atributivna → ostavi prazno.** Ručni unos u X uvek važi. |
| `Klasa` | AQL klasa greške (Critical / Major / Minor) |

### Prag SPC alarma na liniji (NOK u seriji)

| Klasa u koloni **Klasa** | Alarm kad NOK u seriji |
|--------------------------|-------------------------|
| **Critical** | ≥ **20%** (npr. 1/5) |
| **Major** | ≥ **30%** (npr. 2/5) |
| **Minor** | ≥ **40%** (npr. 2/5) |
| *(prazno)* | ≥ **20%** (isto kao Critical) |

Klasa se unosi **po redu dimenzije** u glavnom unosu → sync u `karakteristike_merljive.klasa` → linija koristi pri snimanju serije.

## Novi deo

1. Kopiraj prazan tab (`vozilo6` / `vozilo7` kao šablon) → `vozilo4`…
2. Popuni redove u glavnom unosu.
3. `npm run sync:glavni-unos:import`
4. Proveri unos na liniji.

## Napomena

- **`Tip = Atributivna`** → instrument Vizuelno/Dokumentacija (atributivni modul).
- **`Tip = Merljiva`** → SPC granice u merljivom modulu.
- Greške, merila, linije (master) i dalje u **SPC_atributivne** ručno ili iz postojećeg šifrarnika.
