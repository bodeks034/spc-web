# IIS — SPC Web na Windows Server

Reverse proxy ka **Supabase Kong** (`http://127.0.0.1:8000`) + serviranje React **`dist/`**.

Gotov fajl: **`deploy/web.config`** → kopiraj u `C:\inetpub\spc-web\dist\web.config` posle svakog `npm run build`.

Povezano: `deploy/WINDOWS_ONPREM.md`, `deploy/nginx-spc.conf.example` (isti API putevi).

---

## 1. Preduslovi (jednokratno)

| Komponenta | Instalacija |
|------------|-------------|
| **IIS** | Server Manager → Web Server (IIS) |
| **URL Rewrite 2.1** | [Microsoft download](https://www.iis.net/downloads/microsoft/url-rewrite) |
| **ARR 3.0** | [Application Request Routing](https://www.iis.net/downloads/microsoft/application-request-routing) |
| **Docker** | Supabase stack (`C:\supabase\docker`) — port **8000** na localhost |

### Uključi ARR proxy

1. IIS Manager → klik na **server** (root čvor, ne sajt)
2. **Application Request Routing Cache** → **Server Proxy Settings…**
3. **Enable proxy** = ✅ → Apply

### WebSocket (Realtime — kalibracija, prekid smene)

1. IIS Manager → server → **Configuration Editor**
2. Sekcija: `system.webServer/webSocket` → **enabled** = True  
   ili u `applicationHost.config`: `<webSocket enabled="true" />`

---

## 2. Kreiranje sajta

1. Fizički put: `C:\inetpub\spc-web\dist` (sadržaj `npm run build`)
2. IIS → **Sites** → **Add Website**
   - Site name: `SPC`
   - Physical path: `C:\inetpub\spc-web\dist`
   - Binding: **https**, host: `spc.firma.local`, sertifikat (interni CA)
3. HTTP → HTTPS redirect (opciono): posebno pravilo ili drugi binding na 80

### Application pool

- **.NET CLR version:** No Managed Code
- **Identity:** ApplicationPoolIdentity (dovoljno za statički + proxy)

---

## 3. `web.config`

```powershell
copy C:\mix\spc-web\deploy\web.config C:\inetpub\spc-web\dist\web.config
```

**Posle svakog deploy-a** `dist/` — ponovo kopiraj `web.config` (build ga ne generiše automatski).

### Ako IIS prijavi grešku na `allowedServerVariables`

Na **server** nivou (jednom):

1. IIS → URL Rewrite → **View Server Variables…**
2. Add: `HTTP_X_FORWARDED_PROTO`, `HTTP_X_FORWARDED_HOST`
3. U site → URL Rewrite → **View Server Variables** → Allow za sajt

Alternativa: u `applicationHost.config` pod lokacijom sajta dozvoli promenljive iz `web.config`.

---

## 4. Build frontenda (mora se poklapati sa IIS hostom)

`C:\mix\spc-web\.env.production`:

```env
VITE_SUPABASE_URL=https://spc.firma.local
VITE_SUPABASE_ANON_KEY=<ANON_KEY iz C:\supabase\docker\.env>
```

```powershell
npm run build
robocopy C:\mix\spc-web\dist C:\inetpub\spc-web\dist /MIR
copy C:\mix\spc-web\deploy\web.config C:\inetpub\spc-web\dist\web.config
```

Browser zove `https://spc.firma.local/rest/v1/...` — IIS prosleđuje na `:8000`.

---

## 5. Provera

| Test | Očekivano |
|------|-----------|
| `https://spc.firma.local/` | Login ekran SPC |
| `https://spc.firma.local/rest/v1/` | JSON greška / 401 (API živi) |
| `https://spc.firma.local/auth/v1/health` | Odgovor Kong/GoTrue |
| Login operater | Uspeh |
| Admin → Status šeme | Zeleno |

### Česte greške

| Simptom | Rešenje |
|---------|---------|
| 502 Bad Gateway | `docker compose ps` — Kong na 8000? |
| 404 na `/rest/v1` | ARR proxy nije uključen |
| Login „Failed to fetch“ | Pogrešan `VITE_SUPABASE_URL` u build-u |
| CORS | U `C:\supabase\docker\.env`: `SITE_URL=https://spc.firma.local` |
| Upload crteža padne | `maxAllowedContentLength` u `web.config` (50 MB) |
| Realtime ne radi | WebSocket enabled; firewall ne blokira upgrade |

---

## 6. HTTP → HTTPS (opciono)

Dodaj sajt na port 80 ili pravilo na default web site:

```xml
<rule name="HTTP_to_HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

(Stavi **pre** proxy pravila u `web.config` ili na nivou 80 sajta.)

---

## 7. Mapiranje pravila (IIS ↔ Nginx)

| Put | Proxy na |
|-----|----------|
| `/auth/v1/*` | `http://127.0.0.1:8000/auth/v1/*` |
| `/rest/v1/*` | `http://127.0.0.1:8000/rest/v1/*` |
| `/storage/v1/*` | `http://127.0.0.1:8000/storage/v1/*` |
| `/realtime/v1/*` | `http://127.0.0.1:8000/realtime/v1/*` (WebSocket) |
| `/functions/v1/*` | `http://127.0.0.1:8000/functions/v1/*` |
| ostalo (nije fajl) | `/index.html` |

---

## 8. Bezbednost

- Port **5432** (PostgreSQL) — **ne** izlaži na LAN/internet
- Port **8000** — može ostati samo localhost ako koristiš ovaj IIS proxy
- **`SERVICE_ROLE_KEY`** — ne na serveru u fajlovima koje IT deli
