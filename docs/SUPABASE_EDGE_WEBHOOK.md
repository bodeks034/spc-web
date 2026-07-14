# Edge Function: send-webhook (Teams) + send-email (Resend / SMTP)

Browser ne može direktno zvati Microsoft Teams Incoming Webhook zbog CORS-a. Aplikacija koristi proxy:

`POST {SUPABASE_URL}/functions/v1/send-webhook`

Za **SPC email alarme** (Admin → Obaveštenja):

`POST {SUPABASE_URL}/functions/v1/send-email`

## Deploy send-webhook

```bash
supabase login
supabase link --project-ref <ref>
supabase functions deploy send-webhook
```

## Deploy send-email — Resend (preporučeno za alarme u browseru)

Supabase Edge **blokira SMTP portove** 587/465. Za slanje iz aplikacije koristi **Resend** (HTTP API).

1. Registracija: [resend.com](https://resend.com) → API Keys
2. U `.env.local`:

```env
RESEND_API_KEY=re_...
RESEND_FROM=SPC <onboarding@resend.dev>
```

3. Deploy:

```bash
npm run deploy:resend
npm run deploy:resend -- --test-email tvoj@email.rs
```

**Sandbox:** `onboarding@resend.dev` šalje samo na email tvog Resend naloga. Za produkciju verifikuj domen u Resend dashboard-u.

Secrets: `RESEND_API_KEY`, `RESEND_FROM`.

U aplikaciji: Admin → Obaveštenja → Email provider **Auto** ili **Resend** → unesi primalce → **Test SPC email**.

## Deploy send-email — SMTP (van aplikacije / IT server)

Za `npm run email:send` iz Node-a (cron, IT) i firminski SMTP na portu 2587:

```bash
npm run deploy:smtp
npm run deploy:smtp -- --test-email kvalitet@firma.rs
```

Secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (opciono).

Gmail iz browsera **ne radi** na edge-u — koristi Resend ili direktno `npm run email:send`.

## Test u aplikaciji

Admin → Obaveštenja → uključi Email i SPC alarme → **Test SPC email**.

Bez deploy-ovane `send-email` funkcije i Resend/SMTP secrets alarmi neće stvarno poslati mail.
