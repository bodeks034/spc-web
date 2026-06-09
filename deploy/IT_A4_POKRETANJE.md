# SPC — IT list za pokretanje (A4)

**Sistem:** SPC Kontrola Kvaliteta · **Sve na internom serveru** (nema cloud podataka)

---

## Adresa za operatere

| | |
|---|---|
| **URL** | `https://spc.firma.local` *(ili IP: `https://192.168.___.___`)* |
| **Browser** | Google Chrome ili Microsoft Edge |
| **Mreža** | Samo fabrički LAN / Wi‑Fi |

---

## Posle restarta servera — OBAVEZNO (redom)

| # | Akcija | Komanda / provera |
|---|--------|-------------------|
| 1 | Pokreni Docker | `systemctl start docker` |
| 2 | Pokreni Supabase (baza + API) | `cd /opt/supabase/docker && docker compose up -d` |
| 3 | Provera kontejnera | `docker compose ps` → svi **running** |
| 4 | Pokreni Nginx (web program) | `systemctl start nginx` |
| 5 | Provera web-a | Otvori URL sa jednog PC u LAN-u → stranica za prijavu |

**Windows Server:** Docker Desktop → Start; zatim IIS/Nginx sajt **SPC**.

---

## Brza provera da sve radi

- [ ] `https://spc.firma.local` se otvara  
- [ ] Prijava email + lozinka radi  
- [ ] Tablet u fabrici vidi istu stranicu (isti Wi‑Fi/LAN)  
- [ ] `docker compose ps` — nema kontejnera u statusu **Exited**

---

## Šta je šta na serveru

| Komponenta | Putanja / servis |
|------------|------------------|
| Web program (React) | `/opt/spc-web/dist/` → Nginx |
| Baza (PostgreSQL) | Docker volumen Supabase |
| Nginx config | `/etc/nginx/sites-available/spc` |
| Supabase Docker | `/opt/supabase/docker/` |
| Noćni backup (ako podešeno) | `/opt/spc-web/backup/nightly/` |

---

## Ako nešto ne radi

| Simptom | Prvo proveri |
|---------|----------------|
| Stranica se ne otvara | `systemctl status nginx` |
| Beli ekran / greška u browseru | Nginx radi? Docker radi? |
| Ne može prijava | `docker compose ps`; log: `docker compose logs -f` |
| „Licenca istekla“ | **Ne rešava IT** — kontakt dobavljač softvera |
| Spor rad | RAM servera (min. 8 GB); disk prostor |

---

## Backup (preporuka IT)

| Šta | Kada |
|-----|------|
| SQL dump baze | Svake noći (cron) |
| Kopija na drugi disk / NAS | Dnevno ili nedeljno |
| Test restore | Jednom kvartalno |

Skripta (Linux): `deploy/backup-server-linux.sh`

---

## Šta IT **ne** radi

- Produženje licence programa → **dobavljač softvera**
- Izmena `service_role` ključa za licencu → **dobavljač**
- Deploy nove verzije `dist/` → po dogovoru sa dobavljačem

---

## Kontakti (popuniti)

| Uloga | Ime | Telefon / email |
|-------|-----|-----------------|
| IT server | | |
| Dobavljač SPC | | |
| Kvalitet / admin aplikacije | | |

---

## Jednolinijski restart (Linux, za nalepnicu)

```bash
systemctl start docker && cd /opt/supabase/docker && docker compose up -d && systemctl start nginx
```

---

*Verzija dokumenta: SPC deploy · puno uputstvo: `docs/UPUTSTVO_FIRMINSKI_SERVER.md`*
