# Faza E — On-prem paket + deploy provera

**Detaljno uputstvo:** `docs/obuka-paket/UPUTSTVO_TESTIRANJE_I_DEPLOY.md` (unit, E2E, SMTP, Docker korak po korak).

**Resend produkcija:** `docs/RESEND_PRODUKCIJA.md` (verifikacija domena).

**Cloud pilot (trenutno):**

| Sloj | URL |
|------|-----|
| Aplikacija (Vercel) | https://spc-web-qem1.vercel.app/ |
| Baza / API (Supabase) | https://wzxkcomeurogvfisticq.supabase.co |

Deploy frontenda: `git push` na main → Vercel automatski build (`npm run build`). Env varijable u Vercel dashboardu.

## Unit testovi (lokalno)

```bash
npm test
```

Proveravaju **čistu logiku** (RPN, DPMO, alarmi) bez baze i browsera.

## Deploy provera (pre puštanja u fabriku)

```bash
npm run deploy:check
npm run db:verify:pilot   # moment + NCR (54–59)
```

Redom: unit testovi → smoke test → E2E login → email endpoint → ručni checklist.

Za go-live u firmi:

```bash
npm run deploy:check:firma
```

(dodaje `npm run build` + Docker build check + pun E2E ako su `E2E_EMAIL` / `E2E_PASSWORD` u env)

### Samo Docker build provera

```bash
npm run deploy:docker:build
```

## Docker frontend (opciono)

Supabase i Postgres ostaju u zvaničnom `supabase/docker` stacku na hostu.
Ovaj compose samo servira React build preko nginx-a sa proxy-jem ka `:8000`.

**Windows Server:** `deploy/WINDOWS_ONPREM.md` (IIS/Nginx, migracije, `.env` primeri).

```bash
cp deploy/.env.docker.example deploy/.env.docker
# uredi .env.docker — anon key sa servera

cd deploy
docker compose -f docker-compose.spc.yml --env-file .env.docker up -d --build
```

Aplikacija: `http://<server>:8080`

### Alternativa bez Dockera

Klasičan put iz `docs/obuka-paket/UPUTSTVO_FIRMINSKI_SERVER.md`:

1. `.env.production` u koren projekta
2. `npm run build`
3. Kopiraj `dist/` na server
4. Nginx po `deploy/nginx-spc.conf.example`

## Posle svakog deploy-a

- [ ] `npm run deploy:check`
- [ ] `npm run deploy:smtp` (SMTP alarmi — send-email edge)
- [ ] Admin → Status servera → ping OK
- [ ] Admin → Status šeme → sve zeleno
- [ ] Test login operater + jedan unos
