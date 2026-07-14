# Moment ključ — fascikle u projektu

Projekat: **`C:\mix\spc-web`**

## Pregled foldera

| Fascikla | Namena |
|----------|--------|
| **`moment-drop\incoming\`** | Excel za **uvoz šifrarnika** (inženjer). Ovde stavite `modul 3 kljuc.xlsx` ili svoj `moment_kljuc_sablon.xlsx` pre uvoza. |
| **`moment-drop\examples\`** | Reference kopije iz Modul 3 paketa (ne brišite — služe kao uzorak). |
| **`moment-drop\izvoz\`** | Fajlovi **sa fizičkog digitalnog ključa** (CSV/XML/TXT). Watcher ih automatski uvozi u `moment_protokol`. |
| **`moment-drop\processed\`** | Arhiva već obrađenih uvoznih fajlova (ručno ili skriptom). |
| **`public\moment\dijagrami\`** | SVG dijagrami prikazani operatoru na liniji (7 sklopova). |
| **`src\data\`** | JSON seed: `momentKljucKomplet.json`, `momentToolMaster.json`. |

---

## Gde ide izvoz sa ključa?

### 1. Digitalni unos u aplikaciji (linija, tab MOMENT)

Svako zatezanje ide u **Supabase** → tabela **`moment_protokol`**.

Na disk se **ne piše automatski**. Podaci su u bazi (datum, smena, RN, JOB, korak, Nm, status OK/NOK, alat, error_kod).

### 2. Izvoz iz aplikacije (preuzimanje u browseru)

| Akcija | Gde završi na PC-u |
|--------|---------------------|
| Šifrarnik → Jedan list → **Šablon Excel** | `Downloads\moment_kljuc_sablon.xlsx` |
| Šifrarnik → JOB → **Export JSON** | `Downloads\moment_<JOB>.json` |

### 3. Izvoz sa fizičkog momentnog ključa (vendor softver)

Ako alat izvozi rezultate na računar (USB, Atlas Tools Network, …), kopirajte fajl u:

**`C:\mix\spc-web\moment-drop\izvoz\`**

Preporučeno ime: `YYYYMMDD_linija_<SN>.csv`

**Automatski uvoz (terminal):**

```powershell
cd C:\mix\spc-web
npm run import:moment-drop          # incoming/*.xlsx + izvoz/*
npm run import:moment-drop:zameni   # zameni postojeći šifrarnik
npm run import:moment-drop:dry      # probni prolaz bez upisa
# opcije: --deo MRAP1-001 --job-id 12

# Automatski watcher (pravi auto):
npm run moment-drop:install         # Windows Task Scheduler — pri logovanju
npm run import:moment-drop:watch    # ručno u terminalu (Ctrl+C za izlaz)
# Docker (on-prem): docker compose -f docker-compose.spc.yml -f docker-compose.moment-drop.yml up -d
```

U aplikaciji: **Šifrarnik → Moment ključ → JOB-ovi** → izaberite JOB → **Uvezi protokol (CSV/TXT)**.

---

## Uvoz šifrarnika (inženjer)

### U aplikaciji

**Šifrarnik → Moment ključ → Jedan list** → Uvezi Excel ili nalepi iz Excela → **Sačuvaj i rasporedi**.

### Preko terminala

```powershell
cd C:\mix\spc-web
# podrazumevano čita moment-drop\incoming\modul 3 kljuc.xlsx
npm run import:moment-modul3
npm run import:moment-modul3:zameni
# ili batch (incoming + izvoz fascikle):
npm run import:moment-drop
# brza provera baze:
npm run smoke:test
```

Pre uvoza pokrenite u Supabase: `54_crtez_assets_moment.sql`, `57_moment_unapredjenje.sql`.

---

## Tok podataka

```
INŽENJER (šifrarnik):
  moment-drop\incoming\*.xlsx  ──uvoz──► Supabase (moment_job, moment_korak, moment_pozicija)
  public\moment\dijagrami\*.svg  ──prikaz──► operator na liniji

OPERATOR (linija, digitalni unos):
  tab MOMENT ──► Supabase moment_protokol  (nema lokalnog foldera)

VENDOR alat (opciono):
  izvoz sa ključa ──► moment-drop\izvoz\  (arhiva / budući uvoz)
```
