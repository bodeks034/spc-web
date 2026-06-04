# Edge Function: send-webhook (Teams / obaveštenja)

Browser ne može direktno zvati Microsoft Teams Incoming Webhook zbog CORS-a. Aplikacija koristi proxy:

`POST {SUPABASE_URL}/functions/v1/send-webhook`

## Deploy

1. Instaliraj [Supabase CLI](https://supabase.com/docs/guides/cli).
2. U root projekta:

```bash
supabase login
supabase link --project-ref wzxkcomeurogvfisticq
supabase functions deploy send-webhook
```

3. U aplikaciji već postoji `VITE_SUPABASE_URL` i anon ključ — proxy se poziva automatski.

## Test

Admin → Obaveštenja → **Test obaveštenja** (sa uključenim Teams i webhook URL).

## Bez deploy-a

Aplikacija pokušava direktan `fetch` na webhook (može raditi za neke JSON webhook-e, ne za Teams).
