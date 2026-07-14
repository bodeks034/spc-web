# Resend — produkcija (verifikovan domen)

Sandbox (`onboarding@resend.dev`) šalje **samo na email Resend naloga**. Za fabriku moraš verifikovati domen firme.

---

## 1. Registracija i API ključ

1. [resend.com](https://resend.com) → nalog
2. **API Keys** → Create → kopiraj `re_...`
3. U `.env.local`:

```env
RESEND_API_KEY=re_...
RESEND_FROM=SPC <spc@firma.rs>
```

`RESEND_FROM` mora biti adresa sa **verifikovanog domena** (npr. `spc@firma.rs`, ne Gmail).

---

## 2. Verifikacija domena

1. Resend Dashboard → **Domains** → Add Domain
2. Unesi `firma.rs` (ili poddomen `qc.firma.rs`)
3. Resend daje DNS zapise — prosledi IT-u:

| Tip | Ime | Vrednost |
|-----|-----|----------|
| TXT | (SPF) | v=spf1 include:... |
| CNAME | (DKIM) | ... |
| TXT | (DMARC, opciono) | v=DMARC1; p=none |

4. Sačekaj status **Verified** (obično 15 min – 24 h)
5. Test adresa: bilo ko `@firma.rs` ili spoljni primalac

---

## 3. Deploy u Supabase

```bash
npm run deploy:resend
npm run deploy:resend -- --test-email kvalitet@firma.rs
```

Skripta postavlja `RESEND_API_KEY` i `RESEND_FROM` kao Supabase secrets i deployuje `send-email` edge funkciju.

---

## 4. Podešavanje u aplikaciji

1. **Admin** → **Obaveštenja**
2. Uključi **Email**
3. Provider: **Auto** ili **Resend**
4. Primalci: `smtp_to`, `smtp_to_spc` (npr. `kvalitet@firma.rs`)
5. **Test SPC email** — mora stići na unetu adresu

---

## 5. Sandbox vs produkcija

| | Sandbox | Produkcija |
|---|---------|------------|
| From | `onboarding@resend.dev` | `spc@firma.rs` |
| Primalac | Samo Resend nalog email | Bilo koja validna adresa |
| DNS | Nije potreban | Obavezno |
| Limit | ~100/dan test | Po planu Resend |

---

## 6. Troubleshooting

| Problem | Rešenje |
|---------|---------|
| `403` / domain not verified | Završi DNS verifikaciju u Resend |
| Mail stiže samo na tvoj Gmail | Još uvek sandbox — promeni `RESEND_FROM` |
| Edge 404 | `npm run deploy:resend` |
| Browser test ne šalje | Proveri Admin → Obaveštenja, uključen email |
| `npm run deploy:check:firma` | Postavi `RESEND_API_KEY` + `SMTP_TO` za automatski test |

---

## Povezano

- `docs/SUPABASE_EDGE_WEBHOOK.md` — edge funkcija send-email
- `npm run check:smtp -- --send primalac@firma.rs` — brza provera endpointa
- `deploy/FAZA_E_ONPREM.md` — deploy checklist
