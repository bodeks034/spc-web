# Checklist pre instalacije — jedna firma

Popuni **pre** nego što odeš u firmu ili pre nego što IT podigne server.  
Daj IT-u sekciju **„Za IT odeljenje“** + `deploy/IT_CHECKLIST.md`.  
Ti zadrži sekciju **„Za razvoj / dobavljača“**.

---

## Podaci o firmi

| Polje | Vrednost |
|-------|----------|
| **Naziv firme** | |
| **Lokacija / pogoni** | |
| **Kontakt IT (ime, email, tel)** | |
| **Kontakt kvalitet / šef (ime, email)** | |
| **Planirani datum instalacije** | |
| **Planirani go-live (operateri)** | |

---

## 1. Šta tražiš od IT-a (obavezno pre instalacije)

IT treba da **potvrdi ili isporuči** sledeće. Bez ovoga ne kreće deploy.

### 1.1 Server

| # | Pitanje za IT | Odgovor / minimum | Potvrđeno |
|---|---------------|-------------------|-----------|
| 1 | Da li postoji dedicirani server ili VM? | Da — ne deljeni sa ERP-om ako je moguće | [ ] |
| 2 | OS | Ubuntu 22.04 LTS (preporuka) ili Windows Server 2019+ | [ ] |
| 3 | CPU | min. 4 jezgra (preporuka 8) | [ ] |
| 4 | RAM | min. 8 GB (preporuka 16 GB) | [ ] |
| 5 | Disk | min. 50 GB SSD slobodno (preporuka 100 GB) | [ ] |
| 6 | Docker + Docker Compose | Instaliran i testiran (`docker ps`) | [ ] |
| 7 | Web server | Nginx (Linux) ili IIS/Nginx (Windows) | [ ] |
| 8 | SSH / RDP pristup za deploy | VPN ili fizički pristup u dogovorenom terminu | [ ] |
| 9 | Admin nalog za deploy | Korisničko ime: _______________ | [ ] |

### 1.2 Mreža i adresa

| # | Pitanje za IT | Odgovor | Potvrđeno |
|---|---------------|---------|-----------|
| 10 | Interni DNS naziv | npr. `spc.firma.local` → | [ ] |
| 11 | Statička IP servera | npr. `192.168.___.___` → | [ ] |
| 12 | Koji subnet/VLAN koriste tableti? | | [ ] |
| 13 | Da li tableti i server vide jedan drugog? | Ping / isti Wi‑Fi segment | [ ] |
| 14 | HTTPS obavezan? | **Da** — kamera i barkod na tabletima | [ ] |
| 15 | Ko izdaje sertifikat? | Interni CA / self-signed / drugo: _______ | [ ] |
| 16 | Kako se sertifikat distribuira na tablete? | GPO / MDM / ručno | [ ] |

### 1.3 Firewall i portovi

| # | Pravilo | Potvrđeno |
|---|---------|-----------|
| 17 | Pristup **samo iz LAN-a** fabrike (bez port forwarding na internet) | [ ] |
| 18 | Port **443** otvoren iz fabričkih subnet-a ka serveru | [ ] |
| 19 | Port **8000** (Supabase API) — samo interno ili kroz reverse proxy na 443 | [ ] |
| 20 | PostgreSQL **5432** nije izložen van servera | [ ] |
| 21 | Da li je potreban izlaz na internet? | Teams webhook: Da / Ne | [ ] |
| 22 | Ako Da — dozvoljen `*.office.com`? | Da / Ne | [ ] |

### 1.4 Backup i održavanje

| # | Pitanje za IT | Odgovor | Potvrđeno |
|---|---------------|---------|-----------|
| 23 | Gde se čuva noćni backup? | NAS putanja: _______________ | [ ] |
| 24 | Ko radi restore test? | IT kvartalno (preporuka) | [ ] |
| 25 | Ko restartuje server posle nestanka struje? | IT — vidi `deploy/IT_A4_POKRETANJE.md` | [ ] |
| 26 | Prozor za održavanje (mesečni patch)? | npr. nedelja 02:00–04:00 | [ ] |

### 1.5 Klijenti (tableti / PC)

| # | Pitanje | Odgovor | Potvrđeno |
|---|---------|---------|-----------|
| 27 | Broj tableta / PC u radu | | [ ] |
| 28 | Browser | Chrome ili Edge (najnoviji) | [ ] |
| 29 | Da li postoji MDM za instalaciju sertifikata? | Da / Ne | [ ] |
| 30 | Test uređaj za probu pre go-live | MAC / naziv: _______________ | [ ] |

### 1.6 Licenca i pristupi (važno — dogovor sa IT)

| # | Dogovor | Potvrđeno |
|---|---------|-----------|
| 31 | Na server ide samo **`dist/`** (build), ne `src/` | [ ] |
| 32 | Produženje licence radi **dobavljač**, ne IT | [ ] |
| 33 | `service_role` ključ za licencu **nije** u opsegu IT admina | [ ] |
| 34 | IT ima `anon` ključ i URL za build — to je u redu | [ ] |
| 35 | Ugovor o licenci potpisan pre go-live | [ ] |

---

## 2. Šta IT mora da ti vrati (pre build-a)

Popuni kad IT odgovori. Bez ovoga ne možeš napraviti ispravan produkcioni build.

| Stavka | Vrednost (IT popunjava) | Primljeno |
|--------|-------------------------|-----------|
| **URL aplikacije** | `https://` _________________________ | [ ] |
| **IP servera** | | [ ] |
| **ANON_KEY** (iz Supabase `.env` na serveru) | `eyJ...` | [ ] |
| **SERVICE_ROLE_KEY** | Samo **tebi** — ne u email CC celom IT-u | [ ] |
| **JWT_SECRET** (ako rotiraš posle instalacije) | Samo tebi | [ ] |
| **Putanja deploy-a na serveru** | npr. `/opt/spc-web` | [ ] |
| **Putanja Supabase Docker** | npr. `/opt/supabase/docker` | [ ] |
| **Način prenosa `deploy-paket/`** | USB / `\\share\` / VPN | [ ] |

**Napomena:** `ANON_KEY` ide u `.env.production` pre `npm run build`.  
`SERVICE_ROLE_KEY` koristiš samo ti za `postavi-licencu.mjs` — nikad u build.

---

## 3. Tvoj checklist (razvoj / dobavljač)

Uradi redom **pre** odlaska u firmu.

### 3.1 Priprema podataka (ako migriraš sa cloud-a)

- [ ] Backup baze: `npm run backup:db`
- [ ] Backup Storage (crteži, Excel): `npm run backup:storage`
- [ ] Provera da dump i storage arhiva nisu prazni
- [ ] Paket za server: `scripts\pakuj-za-firminski-server.ps1` → folder `deploy-paket\`

### 3.2 Licenca (jednom)

- [ ] SQL spreman: `21_licenca_gate.sql`, `23_licenca_moduli.sql`
- [ ] Par ključeva: `node scripts/generisi-par-licence.mjs` (samo jednom)
- [ ] `private.pem` sačuvan offline — **ne u git, ne na server firme**

### 3.3 Build za firmu

- [ ] `.env.production` sa **firminskim** URL-om (ne cloud!)
- [ ] `VITE_SUPABASE_ANON_KEY` = ANON sa servera firme
- [ ] Licenca Sloj B: `postavi-licencu.mjs --deployment on-prem --tenant <id>`
- [ ] Licenca Sloj A: `generisi-licencu.mjs` + `npm run build`
- [ ] `dist/license.json` postoji u build-u
- [ ] Test: `npm run preview` lokalno protiv firminskog Supabase (ako imaš VPN)

### 3.4 Dokumenti za predaju

- [ ] `deploy/IT_CHECKLIST.md` — IT-u
- [ ] `deploy/IT_A4_POKRETANJE.md` — štampano A4 za IT
- [ ] `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md` — puni vodič
- [ ] `docs/obuka-paket/UPUTSTVO_ZASTITA_KODA_I_LICENCA.md` — licenca (interno za tebe + ugovor)
- [ ] Datum isteka licence upisan u kalendar: _______________

### 3.5 Na dan instalacije

- [ ] Pristup serveru (SSH/RDP) radi
- [ ] Docker + Supabase podignut (`docker compose up -d`)
- [ ] SQL migracije pokrenute (01…23 + ostale)
- [ ] Restore baze (ako migracija sa cloud-a)
- [ ] Storage upload (crteži)
- [ ] `dist/` kopiran na server
- [ ] Nginx config testiran (`nginx -t`) i reload
- [ ] HTTPS radi na test tabletu — **bez** upozorenja o sertifikatu (ili operateri obučeni)
- [ ] Prijava test korisnika radi
- [ ] Unos merenja / atributivne — jedan probni unos
- [ ] Kamera / barkod na tabletu (ako se koristi)
- [ ] `proveri_licencu()` vraća `ok: true` u Supabase Studio

### 3.6 Posle go-live

- [ ] IT ima `IT_A4_POKRETANJE.md` za restart procedure
- [ ] Kontakt za hitne slučajeve dogovoren
- [ ] Cloud Supabase isključen / obrisan (ako je politika)
- [ ] Backup noću proveren dan posle instalacije

---

## 4. Brzi email / poruka za IT (kopiraj i pošalji)

```
Predmet: SPC aplikacija — zahtevi pre instalacije na internom serveru

Poštovani,

Planiramo instalaciju SPC sistema za kontrolu kvaliteta na internom serveru
(svi podaci ostaju u LAN-u, bez cloud-a).

Molimo potvrdu ili isporuku sledećeg pre [DATUM]:

1. Server/VM: min. 4 CPU, 8 GB RAM, 50 GB disk, Ubuntu 22.04 + Docker + Nginx
2. Interna adresa: npr. https://spc.firma.local (ili statička IP)
3. HTTPS sertifikat (obavezno za tablete — kamera/barkod)
4. Firewall: pristup samo iz fabričke mreže; port 443; PostgreSQL ne izlažati
5. Noćni backup baze na NAS: [putanja]
6. Test tablet/PC u istom VLAN-u kao server
7. VPN ili pristup za deploy u dogovorenom terminu

Prilog: IT_CHECKLIST.md i IT_A4_POKRETANJE.md

Produženje licence softvera obavlja dobavljač; service_role ključ za licenciranje
nije deo operativnog IT pristupa.

Hvala,
[ime]
```

---

## 5. Potvrda (potpiši pre go-live)

| Uloga | Ime | Datum | Potpis |
|-------|-----|-------|--------|
| IT — infrastruktura spremna | | | |
| Kvalitet / naručilac | | | |
| Dobavljač (deploy završen) | | | |

**Go-live dozvoljen:** [ ] Da  [ ] Ne (razlog: _________________________)

---

## Povezani dokumenti

| Dokument | Namena |
|----------|--------|
| `docs/export/SPC_Checklist_Pre_Instalacija_IT.pdf` | **Za slanje firmi** (PDF) |
| `docs/export/SPC_Checklist_Pre_Instalacija_IT.doc` | **Za slanje firmi** (Word) |
| `docs/export/SPC_Checklist_Pre_Instalacija_PUN.pdf` | Interna verzija (ti + prilog) |
| `deploy/IT_CHECKLIST.md` | Tehnički zahtevi za IT |
| `deploy/IT_A4_POKRETANJE.md` | Jedna strana — šta pokrenuti posle restarta |
| `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md` | Kompletan deploy vodič |
| `docs/obuka-paket/UPUTSTVO_ZASTITA_KODA_I_LICENCA.md` | Licenca i zaštita koda |

### Regeneriši Word/PDF

```powershell
cd C:\mix\spc-web
node scripts/generisi-checklist-firma-dokument.mjs
node scripts/generisi-checklist-firma-dokument.mjs --interno
```
