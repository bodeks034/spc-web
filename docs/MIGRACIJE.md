# Supabase migracije — redosled

Pokreni u **SQL Editoru** redom. Posle svake veće izmene: `NOTIFY pgrst, 'reload schema';` (već je u fajlovima gde treba).

| Red | Fajl | Šta dodaje |
|-----|------|------------|
| 1 | `01_supabase_schema.sql` | Osnovne tabele (delovi, kontrolni_log, …) |
| 2 | `02_add_defekti_and_kontrolni_log_defekt.sql` | Defekt na logu |
| 3 | `03_schema_from_docs.sql` | Dopuna iz docs |
| 4 | `04_kontrolna_lista_policies.sql` | Kontrolna lista |
| 5 | `05_dopuna_tabele_rls.sql` | RLS |
| 6 | `06_storage_excel_sync.sql` | Storage za Excel |
| 7 | `07_spc_views_and_alarms.sql` | View-ovi, alarmi |
| 8 | `08_fix_admin_radnik.sql` | Admin radnik |
| 9 | `09_fix_kontrolni_log_sequence.sql` | Sekvenca loga |
| 10 | `10_povezi_auth_radnici.sql` | Auth ↔ radnici |
| 11 | `11_varijabilne_schema.sql` | Merljive tabele |
| 12 | `12_gage_rr_schema.sql` | Gage R&R |
| 13 | `13_merenja_varijabilna_foto.sql` | foto, komentar na merenjima |
| 14 | `14_kpi_skart_dorada_oee.sql` | kpi_unos (OEE, škart, dorada) |
| 15 | `15_sesija_id.sql` | sesija_id na logu, merenjima, KPI |
| 16 | `16_kpi_planirano_kom.sql` | planirano_kom za OEE performansu |
| 17 | `17_notifikacije.sql` | obaveštenja (Teams, log, app_podesavanja) |
| 18 | `18_karakteristike_revizija.sql` | revizija LSL/USL/nominala |
| 19 | `19_fix_merenja_varijabilna_sequence.sql` | Sekvenca ID posle demo/CSV merenja (greška `merenja_varijabilna_pkey`) |
| 20 | `09_kalibracija_zahtevi.sql` | Zahtevi za odobrenje kalibracije (realtime) |
| 21 | `20_radnici_uloge_kvalitet_sef.sql` | Uloge kvalitet / šef |
| 22 | `21_licenca_gate.sql` | Licenca / uključivanje programa (`proveri_licencu`) |

## Provera u aplikaciji

**Admin panel → Status šeme** — automatska provera da li tabele/kolone postoje.

## Faza D/E (produkcija)

- **Edge Function** `send-webhook` — deploy: `docs/SUPABASE_EDGE_WEBHOOK.md`
- **Offline red** — Admin → Offline sinhronizacija
- **Uloge** — operator (unos/log), kontrolor (+karte), kvalitet/admin (sve)
- **Trasabilitet** — tab TRASABILITET + PDF
- **Revizija granica** — Admin merljive → Revizija granica

## Lokalna kopija baze i rad offline

Kompletno uputstvo (backup cloud-a, Docker, `.env.local`): **`docs/UPUTSTVO_LOKALNA_BAZA.md`**

## Deploy na server firme (on‑premise)

Podaci samo u LAN-u — prenos sa računara na firminski server: **`docs/UPUTSTVO_FIRMINSKI_SERVER.md`** · IT checklist: **`deploy/IT_CHECKLIST.md`**

## Roadmap Faza 2 (šta dodati posle pilota)

**`docs/ROADMAP_FAZA2.md`** — RN/ERP, kontrolna lista, SPC baseline, alarmi, CAPA; mapa fajlova i procena sati.

## Zaštita koda i licenca (uključi / isključi program)

**`docs/UPUTSTVO_ZASTITA_KODA_I_LICENCA.md`** — zaštita `dist/`, potpisana licenca, `21_licenca_gate.sql`

## Barkod i digitalna merila

Uputstvo za povezivanje: **`docs/UPUTSTVO_BARKOD_I_MERILA.md`** · u aplikaciji: **Admin → Uputstvo · barkod čitač i digitalna merila** (merljive: i dugme **Uputstvo** na panelu merila).

## Offline red (IndexedDB)

Aplikacija čuva neposlate podatke u **IndexedDB** (`spc_offline_v1` / store `jobs`). Pri prvom pokretanju migrira postojeći red iz `localStorage` (`spc_q_v2`) i briše stari ključ.

Ako IndexedDB nije dostupan, koristi se `localStorage` kao rezerva.

Pri povratku mreže sinhronizuje:

- atributivne → `kontrolni_log` + `kpi_unos`
- merljive → `merenja_varijabilna` + `kpi_unos`

Svaki paket ima `sesija_id` za praćenje iste serije.
