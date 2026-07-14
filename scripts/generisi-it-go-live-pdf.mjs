#!/usr/bin/env node
/**
 * Jedan IT go-live PDF — URL, nalozi, backup, ERP cron, ko zove koga.
 *
 *   npm run dokument:go-live-it
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportDir = path.join(ROOT, "docs", "export");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const danas = new Date().toISOString().slice(0, 10);

const css = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Calibri, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.38;
    color: #1a1a1a;
    max-width: 210mm;
    margin: 0 auto;
    padding: 10mm 8mm;
  }
  h1 { font-size: 17pt; color: #0f3d6e; margin: 0 0 4px; }
  .sub { color: #555; margin-bottom: 16px; font-size: 9.5pt; }
  h2 { font-size: 11.5pt; color: #0f3d6e; border-bottom: 1px solid #c5d9ea; padding-bottom: 3px; margin: 16px 0 8px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 9pt; page-break-inside: avoid; }
  th, td { border: 1px solid #b8c9d9; padding: 5px 7px; vertical-align: top; }
  th { background: #e8f1f8; text-align: left; }
  .field { border-bottom: 1px solid #888; min-height: 16px; display: inline-block; min-width: 140px; }
  .note { background: #f5f8fb; border-left: 3px solid #0f3d6e; padding: 7px 10px; margin: 8px 0; font-size: 9pt; }
  code { font-family: Consolas, monospace; font-size: 8.5pt; background: #f0f4f8; padding: 1px 4px; }
  .footer { margin-top: 20px; font-size: 8pt; color: #666; border-top: 1px solid #ddd; padding-top: 6px; }
  .one-liner { font-family: Consolas, monospace; font-size: 8pt; background: #f8f8f8; padding: 8px; border: 1px solid #ddd; }
`;

function bodyHtml() {
  return `
<header>
  <h1>SPC — IT Go-Live paket</h1>
  <p class="sub">Jedan dokument za puštanje u rad · interni server · datum štampe: ${danas}</p>
</header>

<h2>1. Adresa i pristup</h2>
<table>
  <tr><th style="width:28%">Stavka</th><th>Vrednost (popuniti)</th></tr>
  <tr><td><strong>URL aplikacije</strong></td><td><span class="field" style="width:90%"></span> npr. <code>https://spc.firma.local</code></td></tr>
  <tr><td><strong>Browser</strong></td><td>Google Chrome ili Microsoft Edge (najnoviji)</td></tr>
  <tr><td><strong>Mreža</strong></td><td>Samo fabrički LAN / Wi‑Fi · HTTPS obavezno</td></tr>
  <tr><td><strong>Supabase Studio</strong></td><td><span class="field"></span> (samo admin, port 8000 interno)</td></tr>
</table>

<h2>2. Nalozi i uloge</h2>
<table>
  <tr><th>Uloga</th><th>Ko</th><th>Napomena</th></tr>
  <tr><td>IT server</td><td><span class="field"></span></td><td>Docker, Nginx, backup, restart</td></tr>
  <tr><td>Admin aplikacije</td><td><span class="field"></span></td><td>Korisnici, šifrarnik, ERP diff</td></tr>
  <tr><td>Kvalitet / inženjer</td><td><span class="field"></span></td><td>NCR, alarmi, dnevni pregled</td></tr>
  <tr><td>Dobavljač SPC</td><td><span class="field"></span></td><td>Licenca, deploy dist/, migracije</td></tr>
  <tr><td>SAP / ERP</td><td><span class="field"></span></td><td>CSV u <code>erp-drop/incoming</code></td></tr>
</table>
<p class="note">Prijava: email + lozinka (Supabase Auth). Naloge kreira admin — ne deliti <code>service_role</code> ključ operaterima.</p>

<h2>3. Posle restarta servera (redom)</h2>
<table>
  <tr><th>#</th><th>Akcija</th><th>Komanda</th></tr>
  <tr><td>1</td><td>Docker</td><td><code>systemctl start docker</code></td></tr>
  <tr><td>2</td><td>Supabase</td><td><code>cd /opt/supabase/docker && docker compose up -d</code></td></tr>
  <tr><td>3</td><td>Provera</td><td><code>docker compose ps</code> → svi running</td></tr>
  <tr><td>4</td><td>Nginx</td><td><code>systemctl start nginx</code></td></tr>
  <tr><td>5</td><td>Web</td><td>Otvori URL sa PC u LAN → prijava</td></tr>
</table>
<div class="one-liner">Linux jednolinijski: systemctl start docker && cd /opt/supabase/docker && docker compose up -d && systemctl start nginx</div>

<h2>4. Backup</h2>
<table>
  <tr><th>Šta</th><th>Kada</th><th>Gde</th></tr>
  <tr><td>PostgreSQL dump</td><td>Noću (cron 02:00)</td><td><code>/opt/spc-web/backup/nightly/</code> ili NAS</td></tr>
  <tr><td>Storage (crteži)</td><td>Nedeljno</td><td>NAS u LAN-u</td></tr>
  <tr><td>Test restore</td><td>Kvartalno</td><td>IT zapisnik</td></tr>
</table>
<p>Linux skripta: <code>deploy/backup-server-linux.sh</code> · env: <code>SPC_BACKUP_DIR</code></p>

<h2>5. ERP dnevni uvoz (jedan izvor istine)</h2>
<table>
  <tr><th>Stavka</th><th>Vrednost</th></tr>
  <tr><td>Folder</td><td><code>erp-drop/incoming/</code> — SAP stavlja CSV</td></tr>
  <tr><td>Cron</td><td>06:00 · <code>npm run import:erp-dnevni</code></td></tr>
  <tr><td>Obavezno</td><td><code>delovi.csv</code>, <code>sap_radni_nalozi.csv</code></td></tr>
  <tr><td>Provera</td><td>Admin → ERP diff · log <code>logs/erp-uvoz.log</code></td></tr>
</table>
<p>Vodič SAP fajlova: <code>docs/obuka-paket/UPUTSTVO_SAP_ERP_DROP.md</code> · <code>erp-drop/CITAJ_ME.md</code></p>

<h2>6. Automatizacija (cron)</h2>
<table>
  <tr><th>Job</th><th>Vreme</th><th>Log</th></tr>
  <tr><td>ERP uvoz</td><td>06:00</td><td>erp-uvoz.log</td></tr>
  <tr><td>Smenski digest</td><td>14:05 / 22:05</td><td>smenski-digest.log</td></tr>
  <tr><td>Health check</td><td>06:30</td><td>auto-health.log</td></tr>
  <tr><td>PG backup</td><td>02:00</td><td>pg-backup.log</td></tr>
</table>
<p>Instalacija: <code>npm run auto:install:admin</code> (Windows Task Scheduler)</p>

<h2>7. Go-live provera</h2>
<table>
  <tr><th>Korak</th><th>Komanda / gde</th></tr>
  <tr><td>Automatski gate</td><td><code>npm run deploy:go-live</code> → <code>logs/go-live-*.txt</code></td></tr>
  <tr><td>Migracije</td><td><code>npm run db:verify</code> — Admin Status šeme zeleno</td></tr>
  <tr><td>Build</td><td><code>npm run build</code> → <code>dist/</code> na server</td></tr>
  <tr><td>Tablet</td><td>Isti URL, probni unos OK/NOK</td></tr>
</table>

<h2>8. Ko zove koga</h2>
<table>
  <tr><th>Problem</th><th>Kontakt</th></tr>
  <tr><td>Stranica se ne otvara / Nginx</td><td>IT server</td></tr>
  <tr><td>Ne može prijava / baza</td><td>IT server → docker logs</td></tr>
  <tr><td>Licenca istekla</td><td>Dobavljač SPC (ne IT)</td></tr>
  <tr><td>ERP CSV ne stiže / pogrešan format</td><td>SAP tim + admin aplikacije</td></tr>
  <tr><td>NCR, alarmi, kvalitet proces</td><td>Kvalitet / šef smene</td></tr>
  <tr><td>Nova verzija aplikacije</td><td>Dobavljač SPC (deploy dist/)</td></tr>
</table>

<h2>9. Kontakti (popuniti pre go-live)</h2>
<table>
  <tr><th>Uloga</th><th>Ime</th><th>Telefon / email</th></tr>
  <tr><td>IT server</td><td><span class="field"></span></td><td><span class="field" style="width:70%"></span></td></tr>
  <tr><td>Dobavljač SPC</td><td><span class="field"></span></td><td><span class="field" style="width:70%"></span></td></tr>
  <tr><td>Admin aplikacije</td><td><span class="field"></span></td><td><span class="field" style="width:70%"></span></td></tr>
  <tr><td>Kvalitet</td><td><span class="field"></span></td><td><span class="field" style="width:70%"></span></td></tr>
  <tr><td>SAP / ERP</td><td><span class="field"></span></td><td><span class="field" style="width:70%"></span></td></tr>
</table>

<div class="footer">
  SPC Kontrola Kvaliteta · puni runbook: <code>docs/obuka-paket/GO_LIVE_RUNBOOK.md</code> ·
  deploy: <code>deploy/IT_CHECKLIST.md</code>, <code>deploy/WINDOWS_ONPREM.md</code>
</div>
`;
}

async function generisiPdf(htmlPath, pdfPath) {
  const url = `file:///${htmlPath.replace(/\\/g, "/")}`;
  try {
    await execFileAsync(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      url,
    ], { timeout: 60000 });
    return true;
  } catch (e) {
    console.warn("PDF nije generisan automatski:", e.message);
    console.warn("Otvori HTML u Chrome-u → Štampaj → Sačuvaj kao PDF.");
    return false;
  }
}

const htmlWrap = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SPC IT Go-Live</title><style>${css}</style></head><body>${bodyHtml()}</body></html>`;

await fs.mkdir(exportDir, { recursive: true });
const base = "SPC_IT_GoLive_Komplet";
const htmlPath = path.join(exportDir, `${base}.html`);
const pdfPath = path.join(exportDir, `${base}.pdf`);

await fs.writeFile(htmlPath, htmlWrap, "utf8");
const pdfOk = await generisiPdf(htmlPath, pdfPath);

console.log("Generisano:");
console.log("  HTML:", htmlPath);
if (pdfOk) console.log("  PDF: ", pdfPath);
console.log("\nPošalji IT odeljenju pre go-live (popuni URL i kontakte na štampi).");
