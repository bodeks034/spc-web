/**
 * Generiše Word (.doc) i PDF za slanje firmi (IT checklist).
 *
 *   node scripts/generisi-checklist-firma-dokument.mjs
 *   node scripts/generisi-checklist-firma-dokument.mjs --interno
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const exportDir = path.join(root, "docs", "export");
const interno = process.argv.includes("--interno");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const css = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", Calibri, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.35;
    color: #1a1a1a;
    max-width: 210mm;
    margin: 0 auto;
    padding: 12mm 10mm;
  }
  h1 { font-size: 18pt; color: #0f3d6e; margin: 0 0 4px; }
  .subtitle { color: #555; margin-bottom: 18px; font-size: 10pt; }
  h2 { font-size: 12pt; color: #0f3d6e; border-bottom: 1px solid #c5d9ea; padding-bottom: 4px; margin: 20px 0 10px; page-break-after: avoid; }
  h3 { font-size: 10.5pt; color: #333; margin: 14px 0 6px; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #b8c9d9; padding: 5px 7px; vertical-align: top; }
  th { background: #e8f1f8; text-align: left; font-weight: 600; }
  .cb { width: 22px; text-align: center; }
  .field { border-bottom: 1px solid #888; min-height: 18px; display: inline-block; min-width: 120px; }
  .note { background: #f5f8fb; border-left: 3px solid #0f3d6e; padding: 8px 12px; margin: 10px 0; font-size: 9.5pt; }
  .email { background: #fafafa; border: 1px solid #ddd; padding: 12px; font-family: Consolas, monospace; font-size: 9pt; white-space: pre-wrap; }
  .footer { margin-top: 24px; font-size: 8.5pt; color: #666; border-top: 1px solid #ddd; padding-top: 8px; }
  .sig td { height: 36px; }
  @media print {
    body { padding: 0; }
    h2 { page-break-before: auto; }
  }
`;

function wordWrap(html) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>SPC — Checklist pre instalacije</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>${css}</style>
</head>
<body>${html}</body>
</html>`;
}

function cb() {
  return "&#9744;";
}

function itBody() {
  return `
<header>
  <h1>SPC Kontrola Kvaliteta</h1>
  <p class="subtitle">Checklist pre instalacije na internom serveru — za IT odeljenje<br>
  <strong>Verzija:</strong> 1.0 &nbsp;|&nbsp; <strong>Datum dokumenta:</strong> <span class="field" style="min-width:90px"></span></p>
</header>

<h2>Podaci o firmi</h2>
<table>
  <tr><th style="width:32%">Polje</th><th>Vrednost</th></tr>
  <tr><td><strong>Naziv firme</strong></td><td><span class="field" style="width:95%"></span></td></tr>
  <tr><td><strong>Lokacija / pogoni</strong></td><td><span class="field" style="width:95%"></span></td></tr>
  <tr><td><strong>Kontakt IT (ime, email, tel)</strong></td><td><span class="field" style="width:95%"></span></td></tr>
  <tr><td><strong>Kontakt kvalitet / šef</strong></td><td><span class="field" style="width:95%"></span></td></tr>
  <tr><td><strong>Planirani datum instalacije</strong></td><td><span class="field" style="width:95%"></span></td></tr>
  <tr><td><strong>Planirani go-live (operateri)</strong></td><td><span class="field" style="width:95%"></span></td></tr>
</table>

<h2>1. Zahtevi pre instalacije (IT potvrđuje)</h2>
<p>Bez potvrde svih stavki u ovom odeljku deploy ne može da počne.</p>

<h3>1.1 Server</h3>
<table>
  <tr><th style="width:4%">#</th><th>Pitanje</th><th style="width:28%">Odgovor / minimum</th><th class="cb">OK</th></tr>
  <tr><td>1</td><td>Dedicirani server ili VM</td><td>Da — po mogućstvu ne deljen sa ERP-om</td><td>${cb()}</td></tr>
  <tr><td>2</td><td>Operativni sistem</td><td>Ubuntu 22.04 LTS (preporuka) ili Windows Server 2019+</td><td>${cb()}</td></tr>
  <tr><td>3</td><td>CPU</td><td>min. 4 jezgra (preporuka 8)</td><td>${cb()}</td></tr>
  <tr><td>4</td><td>RAM</td><td>min. 8 GB (preporuka 16 GB)</td><td>${cb()}</td></tr>
  <tr><td>5</td><td>Disk</td><td>min. 50 GB SSD (preporuka 100 GB)</td><td>${cb()}</td></tr>
  <tr><td>6</td><td>Docker + Docker Compose</td><td>Instaliran, testiran (<code>docker ps</code>)</td><td>${cb()}</td></tr>
  <tr><td>7</td><td>Web server</td><td>Nginx (Linux) ili IIS/Nginx (Windows)</td><td>${cb()}</td></tr>
  <tr><td>8</td><td>SSH / RDP za deploy</td><td>VPN ili pristup u dogovorenom terminu</td><td>${cb()}</td></tr>
  <tr><td>9</td><td>Admin nalog za deploy</td><td>Korisnik: <span class="field"></span></td><td>${cb()}</td></tr>
</table>

<h3>1.2 Mreža i adresa</h3>
<table>
  <tr><th>#</th><th>Pitanje</th><th>Odgovor</th><th class="cb">OK</th></tr>
  <tr><td>10</td><td>Interni DNS</td><td>npr. spc.firma.local → <span class="field"></span></td><td>${cb()}</td></tr>
  <tr><td>11</td><td>Statička IP servera</td><td>192.168.<span class="field" style="min-width:40px"></span>.<span class="field" style="min-width:40px"></span></td><td>${cb()}</td></tr>
  <tr><td>12</td><td>Subnet/VLAN tableta</td><td><span class="field" style="width:80%"></span></td><td>${cb()}</td></tr>
  <tr><td>13</td><td>Tableti i server se vide</td><td>Ping / isti Wi‑Fi segment</td><td>${cb()}</td></tr>
  <tr><td>14</td><td>HTTPS</td><td><strong>Obavezno</strong> (kamera, barkod)</td><td>${cb()}</td></tr>
  <tr><td>15</td><td>Sertifikat</td><td>Interni CA / self-signed / drugo: <span class="field"></span></td><td>${cb()}</td></tr>
  <tr><td>16</td><td>Distribucija sertifikata na tablete</td><td>GPO / MDM / ručno</td><td>${cb()}</td></tr>
</table>

<h3>1.3 Firewall i portovi</h3>
<table>
  <tr><th>#</th><th>Pravilo</th><th class="cb">OK</th></tr>
  <tr><td>17</td><td>Pristup samo iz LAN-a (bez port forwarding na internet)</td><td>${cb()}</td></tr>
  <tr><td>18</td><td>Port 443 otvoren iz fabričkih subnet-a</td><td>${cb()}</td></tr>
  <tr><td>19</td><td>Port 8000 samo interno ili kroz reverse proxy na 443</td><td>${cb()}</td></tr>
  <tr><td>20</td><td>PostgreSQL 5432 nije izložen van servera</td><td>${cb()}</td></tr>
  <tr><td>21</td><td>Izlaz na internet (Teams webhook): Da / Ne</td><td>${cb()}</td></tr>
  <tr><td>22</td><td>Ako Da — dozvoljen *.office.com: Da / Ne</td><td>${cb()}</td></tr>
</table>

<h3>1.4 Backup i održavanje</h3>
<table>
  <tr><th>#</th><th>Pitanje</th><th>Odgovor</th><th class="cb">OK</th></tr>
  <tr><td>23</td><td>Noćni backup</td><td>NAS: <span class="field" style="width:70%"></span></td><td>${cb()}</td></tr>
  <tr><td>24</td><td>Restore test</td><td>IT kvartalno (preporuka)</td><td>${cb()}</td></tr>
  <tr><td>25</td><td>Restart posle nestanka struje</td><td>IT (vidi prilog: IT list za pokretanje)</td><td>${cb()}</td></tr>
  <tr><td>26</td><td>Prozor za održavanje</td><td>npr. nedelja 02:00–04:00</td><td>${cb()}</td></tr>
</table>

<h3>1.5 Klijenti (tableti / PC)</h3>
<table>
  <tr><th>#</th><th>Pitanje</th><th>Odgovor</th><th class="cb">OK</th></tr>
  <tr><td>27</td><td>Broj tableta / PC</td><td><span class="field"></span></td><td>${cb()}</td></tr>
  <tr><td>28</td><td>Browser</td><td>Chrome ili Edge (najnoviji)</td><td>${cb()}</td></tr>
  <tr><td>29</td><td>MDM za sertifikate</td><td>Da / Ne</td><td>${cb()}</td></tr>
  <tr><td>30</td><td>Test uređaj pre go-live</td><td><span class="field" style="width:70%"></span></td><td>${cb()}</td></tr>
</table>

<h3>1.6 Licenca i pristupi</h3>
<table>
  <tr><th>#</th><th>Dogovor</th><th class="cb">OK</th></tr>
  <tr><td>31</td><td>Na server ide samo produkcioni build (dist/), ne izvorni kod</td><td>${cb()}</td></tr>
  <tr><td>32</td><td>Produženje licence softvera obavlja dobavljač, ne IT</td><td>${cb()}</td></tr>
  <tr><td>33</td><td>Service role ključ za licenciranje nije u opsegu IT admina</td><td>${cb()}</td></tr>
  <tr><td>34</td><td>Ugovor o licenci potpisan pre go-live</td><td>${cb()}</td></tr>
</table>

<h2>2. Podaci koje IT isporučuje dobavljaču</h2>
<table>
  <tr><th style="width:34%">Stavka</th><th>Vrednost (IT popunjava)</th><th class="cb">OK</th></tr>
  <tr><td><strong>URL aplikacije</strong></td><td>https:// <span class="field" style="width:75%"></span></td><td>${cb()}</td></tr>
  <tr><td><strong>IP servera</strong></td><td><span class="field" style="width:90%"></span></td><td>${cb()}</td></tr>
  <tr><td><strong>ANON_KEY</strong> (Supabase .env)</td><td><span class="field" style="width:90%"></span></td><td>${cb()}</td></tr>
  <tr><td><strong>Putanja deploy-a</strong></td><td>npr. /opt/spc-web</td><td>${cb()}</td></tr>
  <tr><td><strong>Putanja Supabase Docker</strong></td><td>npr. /opt/supabase/docker</td><td>${cb()}</td></tr>
  <tr><td><strong>Način prenosa paketa</strong></td><td>USB / mrežni share / VPN</td><td>${cb()}</td></tr>
</table>
<div class="note">Ključevi za licenciranje (service role) dostavljaju se dobavljaču licenciranja direktno, van ovog dokumenta.</div>

<h2>3. Potvrda pre go-live</h2>
<table class="sig">
  <tr><th>Uloga</th><th>Ime</th><th>Datum</th><th>Potpis</th></tr>
  <tr><td>IT — infrastruktura spremna</td><td></td><td></td><td></td></tr>
  <tr><td>Kvalitet / naručilac</td><td></td><td></td><td></td></tr>
  <tr><td>Dobavljač (deploy završen)</td><td></td><td></td><td></td></tr>
</table>
<p><strong>Go-live dozvoljen:</strong> ${cb()} Da &nbsp;&nbsp; ${cb()} Ne &nbsp; Razlog: <span class="field" style="width:50%"></span></p>

<div class="footer">
  Prilog uz ovaj dokument: IT checklist, IT list za pokretanje (A4).<br>
  SPC Kontrola Kvaliteta — interni server, svi podaci u LAN-u.
</div>
`;
}

function internoBody() {
  return itBody() + `
<h2 style="page-break-before:always">PRILOG — interni checklist (dobavljač)</h2>

<h3>Priprema podataka (migracija sa cloud-a)</h3>
<table>
  <tr><td class="cb">${cb()}</td><td>Backup baze (npm run backup:db)</td></tr>
  <tr><td class="cb">${cb()}</td><td>Backup Storage — crteži, Excel</td></tr>
  <tr><td class="cb">${cb()}</td><td>Paket: scripts\\pakuj-za-firminski-server.ps1</td></tr>
</table>

<h3>Licenca</h3>
<table>
  <tr><td class="cb">${cb()}</td><td>SQL: 21_licenca_gate.sql, 23_licenca_moduli.sql</td></tr>
  <tr><td class="cb">${cb()}</td><td>Par ključeva (generisi-par-licence.mjs) — private.pem offline</td></tr>
  <tr><td class="cb">${cb()}</td><td>Sloj B: postavi-licencu.mjs --deployment on-prem</td></tr>
  <tr><td class="cb">${cb()}</td><td>Sloj A: generisi-licencu.mjs + npm run build</td></tr>
  <tr><td class="cb">${cb()}</td><td>dist/license.json postoji</td></tr>
</table>

<h3>Dan instalacije</h3>
<table>
  <tr><td class="cb">${cb()}</td><td>Docker + Supabase up</td></tr>
  <tr><td class="cb">${cb()}</td><td>SQL migracije + restore</td></tr>
  <tr><td class="cb">${cb()}</td><td>dist/ na serveru, nginx -t OK</td></tr>
  <tr><td class="cb">${cb()}</td><td>HTTPS na tabletu, prijava, probni unos</td></tr>
  <tr><td class="cb">${cb()}</td><td>proveri_licencu() → ok: true</td></tr>
</table>

<h3>Posle go-live</h3>
<table>
  <tr><td class="cb">${cb()}</td><td>IT ima A4 list za pokretanje</td></tr>
  <tr><td class="cb">${cb()}</td><td>Backup noću proveren</td></tr>
  <tr><td class="cb">${cb()}</td><td>Datum isteka licence u kalendaru: <span class="field"></span></td></tr>
</table>
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

const baseName = interno ? "SPC_Checklist_Pre_Instalacija_PUN" : "SPC_Checklist_Pre_Instalacija_IT";
const body = interno ? internoBody() : itBody();
const htmlFull = wordWrap(body);

await fs.mkdir(exportDir, { recursive: true });

const htmlPath = path.join(exportDir, `${baseName}.html`);
const docPath = path.join(exportDir, `${baseName}.doc`);
const pdfPath = path.join(exportDir, `${baseName}.pdf`);

await fs.writeFile(htmlPath, htmlFull, "utf8");
await fs.writeFile(docPath, htmlFull, "utf8");

const pdfOk = await generisiPdf(htmlPath, pdfPath);

console.log("Generisano:");
console.log("  HTML:", htmlPath);
console.log("  Word:", docPath, "(otvori u Microsoft Word)");
if (pdfOk) console.log("  PDF: ", pdfPath);
console.log(interno ? "\nInterna verzija (sa prilogom za dobavljača)." : "\nIT verzija — pošalji firmi (email + prilog PDF ili .doc).");
