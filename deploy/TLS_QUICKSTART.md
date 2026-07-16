# TLS / HTTPS — brzi start (firma)

Cilj: tableti otvaraju `https://spc.firma.local` (ili IP) bez upozorenja.

## Opcija A — interni CA (preporuka)

1. IT izdaje sertifikat za `spc.firma.local` (ili SAN sa IP).
2. Stavi fajlove na server, npr.:
   - Linux: `/etc/ssl/spc/fullchain.pem` + `privkey.pem`
   - Windows: PFX u cert store / IIS binding
3. Kopiraj `deploy/nginx-spc.conf.example` → `/etc/nginx/sites-available/spc`
4. Prilagodi `server_name` i putanje sertifikata.
5. `nginx -t && systemctl reload nginx`
6. Na tablete: GPO/MDM root CA, ili ručno instaliraj root.

## Opcija B — self-signed (samo test / trening)

```bash
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout spc.key -out spc.crt \
  -subj "/CN=spc.firma.local"
```

U nginx-u ukaži na `spc.crt` / `spc.key`.  
Tableti će upozoravati — potvrdi izuzetak (nije za produkciju).

## Opcija C — Windows IIS

Vidi `deploy/IIS_SETUP_WINDOWS.md` + `WINDOWS_ONPREM.md`.  
HTTPS binding → isti cert kao za interne sajtove.

## Provera

- PC: `https://spc.firma.local` otvara login
- Tablet (isti Wi‑Fi/VLAN): kamera / barkod rade (HTTPS potreban za getUserMedia)
- API: `/rest/v1/` i `/auth/v1/` kroz isti host (proxy u nginx primeru)

## Veza sa aplikacijom

Build sa firminskim URL-om:

```env
VITE_SUPABASE_URL=https://spc.firma.local
VITE_SUPABASE_ANON_KEY=...
```

Zatim `npm ci && npm run build` → `dist/` na Nginx/IIS.
