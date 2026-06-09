# SPC Web — investicioni pregled za razgovor sa firmom

**Datum:** jun 2026 · **Namena:** interni razgovor sa rukovodstvom / kvalitetom / IT  
**Verzija softvera:** pilot / pre-produkcija

---

## 1. Executive summary (30 sekundi)

| | |
|---|---|
| **Šta je** | Web sistem za kontrolu kvaliteta na liniji i u kancelariji (atributivno + merljivo, SPC, trag, OEE) |
| **Gde su podaci danas** | Cloud (privremeno) → **cilj: isključivo server firme** |
| **Zrelost** | ~**65–75%** — funkcionalno bogat pilot, nije još zvanično „validiran“ produkcioni sistem |
| **Realna vrednost danas** | **Visok potencijal** ako se deploy-uje u fabrici i koristi 3+ meseca |
| **Bez deploy-a u firmi** | Vrednost ≈ demonstracija / prototip |

---

## 2. Šta već postoji (imovina)

| Oblast | Šta radi | Poslovna korist |
|--------|----------|-----------------|
| **Unos na liniji** | Tablet/telefon, wizard ID → poka-yoke → merenje, barkod, kamera | Manje grešaka, brži unos vs papir |
| **Merljive** | 5 kolona, serije A/B, granice, foto NOK, digitalna merila (USB) | SPC spreman podaci, manje ručnog prepisivanja |
| **Atributivne** | OK/NOK, AQL, defekti, vozilo zone, kontrolna lista | Jedinstven log kontrole |
| **Analitika** | SPC karte, Pareto, heatmap, Gage R&R, OEE/KPI | Kvalitet vidi trendove, ne samo „današnji škart“ |
| **Operativa** | Offline red, realtime (prekid, kalibracija), admin panel | Linija ne staje kad padne Wi‑Fi kratko |
| **Podaci** | Supabase/PostgreSQL, Excel sync, CSV uvoz, trasabilitet | Jedan izvor istine (posle migracije na firmu) |
| **Deploy priprema** | Uputstva on‑prem, IT A4, backup skripte, licenca | Mogućnost da podaci **ne izlaze** iz fabrike |
| **Dokumentacija** | Migracije, barkod, Excel, zaštita koda | IT i kvalitet mogu da prate bez „tajnog znanja“ |

**Gruba vrednost razvoja (ako firma naručuje od nule):** **8.000 – 25.000 EUR** (zavisno od satnice i obima testiranja).

---

## 3. Šta još fali do „prave produkcije“

| # | Stavka | Rizik ako ostane | Prioritet |
|---|--------|------------------|-----------|
| 1 | **Instalacija na server firme** (Docker + Nginx + HTTPS) | Podaci i dalje van politike firme | 🔴 Kritično |
| 2 | **Migracija podataka** iz cloud-a ili CSV šifrarnika | Prazan sistem na startu | 🔴 Kritično |
| 3 | **Obuka** 5–15 operatera + 2 admina (2–4 sata) | Nizak adoption, „ne radi nam“ | 🔴 Kritično |
| 4 | **Pilot 90 dana** na 1 liniji / 2 dela | Ne dokazuje ROI | 🔴 Kritično |
| 5 | Noćni **backup** + test restore (IT) | Gubitak podataka | 🟠 Visoko |
| 6 | Formalni **ugovor** (licenca, podrška, SLA) | Pravna siva zona | 🟠 Visoko |
| 7 | Monitoring (da li server/docker živi) | Sistem „tišti“ posle restarta | 🟠 Visoko |
| 8 | Automatizovani testovi / QA ciklus | Regresije posle izmena | 🟡 Srednje |
| 9 | ISO / validacioni paket dokumentacije | Audit „na papiru“ slab | 🟡 Srednje (ako traže certifikacija) |
| 10 | Integracija ERP / SAP (ako postoji) | Dupli unos | 🟢 Kasnije |

**Procena do produkcije (jedna fabrika, jedan server):** **2–6 nedelja** kalendarski (uz kooperativan IT), ili **80–200 sati** rada (deploy + migracija + pilot podrška).

---

## 4. Troškovi — scenariji za firmu

### A) Minimalno (samo unutra, bez javnog domena)

| Stavka | Ko plaća | Procena (EUR) |
|--------|----------|---------------|
| Server (postojeći ili novi PC u fabrici) | Firma | 0 – 2.000 (hardver) |
| Instalacija + migracija | Dobavljač / interni | 1.500 – 4.000 |
| Obuka | Uključeno u instalaciju | 300 – 800 |
| Godišnja podrška + licence | Ugovor | 600 – 1.500 / god |
| **Ukupno prva godina** | | **~2.500 – 8.000** |

### B) Sa ozbiljnijom podrškom i pilotom

| Stavka | Procena (EUR) |
|--------|---------------|
| Sve iz A) | 2.500 – 8.000 |
| Pilot pratnja 3 meseca (izmene, hotfix) | 2.000 – 5.000 |
| Backup/monitoring setup | 500 – 1.000 |
| **Ukupno prva godina** | **~5.000 – 14.000** |

### C) Šta firma **ne** plaća ako ostane pilot na cloud-u

- Compliance sa politikom „podaci samo u firmi“ — **0**  
- Merljiv ROI na liniji — **0**  
- Dugoročna imovina u balance sheet-u — **0**

---

## 5. ROI — kako izgleda uspeh (merljivo)

Posle **90 dana** pilota na jednoj liniji, uspeh = bar **2 od 4**:

| KPI | Primer cilja |
|-----|----------------|
| Vreme unosa jedne serije | −20% vs papir/Excel |
| Greške u prepisivanju ID / RN | −50% |
| Vreme do SPC alarma | Dani ranije nego ručno |
| Adoption | ≥80% serija uneto u sistem, ne u svesku |

**Jedna linija koja uštedi 15 min/dan × 220 radnih dana × cena sata kontrole** — često pokrije godišnju podršku.

*(Konkretne brojke popuniti sa firmom posle 2 nedelje merenja.)*

---

## 6. Rizici i mitigacija

| Rizik | Verovatnoća | Mitigacija |
|-------|-------------|------------|
| IT ne da server / Docker | Srednja | IT checklist + A4 list već pripremljeni |
| Operateri ne koriste | Srednja | Pilot na 1 liniji, champion korisnik, obuka |
| Server se ne restartuje posle struje | Visoka | IT A4 + jedna linija komande |
| Pad Wi‑Fi | Srednja | Offline red već ugrađen |
| Zahtev „mora SAP“ | Niska–srednja | Faza 2; pilot ne čeka SAP |
| Zavisnost od jednog developera | Visoka | Dokumentacija + ugovor podrške + source escrow u ugovoru |

---

## 7. Predlog faziranja (za dogovor za stolom)

```
Faza 1 (4–6 nedelja)     Faza 2 (3 meseca)        Faza 3 (opciono)
────────────────────     ───────────────────      ─────────────────
Server firme             Pilot 1 linija           ERP / više linija
Migracija šifrarnika     Merenje KPI              Više pogona
HTTPS + backup           Odluka scale-up          ISO paket
Obuka                    Godišnji ugovor
Go-live pilot
```

**Gate za Fazu 2:** IT potvrda backup-a + ≥50 unosa u sistemu bez kritičnog baga.

---

## 8. Šta firma dobija / šta dobavljač zadržava

| Firma dobija | Dobavljač zadržava |
|--------------|-------------------|
| Instaliran sistem na **njihovom** serveru | Autorska prava na kod (licenca korišćenja) |
| Podaci 100% u fabrici | Pravo produženja licence |
| Obuka i dokumentacija | Razvoj novih verzija (po ugovoru) |
| Izvor podataka za SPC/audit | `private.pem` / produženje (tehnički kill-switch) |

*Preporuka ugovora: firma ima podatke; dobavljač ima IP i održavanje.*

---

## 9. Jedna rečenica za direktora

> „Imamo gotov **pilot sistema kontrole kvaliteta** vredan **desetina hiljada evra razvoja**; **puna vrednost nastaje za **2–6 nedelja** instalacije na vaš server i **90 dana** korišćenja na jednoj liniji — bez toga ostaje samo demonstracija.“

---

## 10. Checklist za sastanak (odštampaj)

- [ ] Server u fabrici (RAM, disk, LAN) — DA / NE  
- [ ] IT kontakt imenovan — _______________  
- [ ] Pilot linija / delovi dogovoreni — _______________  
- [ ] Politika podataka (samo LAN) — potvrđeno  
- [ ] Budžet Faza 1: _______________ EUR  
- [ ] Datum ciljanog go-live: _______________  
- [ ] Ko meri ROI posle 90 dana: _______________  

---

## Povezani dokumenti

| Dokument | Svrha |
|----------|--------|
| `docs/ROADMAP_FAZA2.md` | Šta dodati posle pilota — fajlovi, checklist, sati |
| `docs/UPUTSTVO_FIRMINSKI_SERVER.md` | Tehnički deploy |
| `deploy/IT_A4_POKRETANJE.md` | IT dnevni rad |
| `docs/UPUTSTVO_ZASTITA_KODA_I_LICENCA.md` | Licenca i zaštita |
| `deploy/IT_CHECKLIST.md` | Zahtevi pre starta |

---

*Popuni KPI i budžet sa konkretnim brojkama firme pre sastanka.*
