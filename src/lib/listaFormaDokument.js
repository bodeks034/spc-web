/**
 * HTML omotač formalnog izveštaja liste — isti vizuelni jezik kao 8D forma.
 */
import { getBrending } from "./brending.js";
import { getPdfLogoDataUrl } from "./pdfBrending.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FORMA_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", Arial, "Helvetica Neue", sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #0f172a;
    background: #fff;
  }
  .wrap { width: 190mm; margin: 0 auto; padding: 0 0 12mm; }
  .header {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #fff;
    padding: 10mm 12mm 8mm;
    border-radius: 0 0 8px 8px;
  }
  .header-brand { display: flex; align-items: center; gap: 12px; }
  .header-logo { height: 44px; width: auto; max-width: 52px; object-fit: contain; }
  .header-kicker {
    font-size: 8pt; letter-spacing: 0.14em; text-transform: uppercase;
    color: #94a3b8; margin-bottom: 4px;
  }
  .header h1 { font-size: 16pt; font-weight: 700; margin-bottom: 4px; }
  .header-sub { font-size: 9.5pt; color: #cbd5e1; }
  .meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0;
    margin: 8mm 0 6mm;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    background: #f8fafc;
  }
  .meta-cell {
    padding: 8px 12px;
    border-right: 1px solid #e2e8f0;
    min-height: 48px;
  }
  .meta-cell:last-child { border-right: none; }
  .meta-label {
    font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.08em;
    color: #64748b; font-weight: 700; margin-bottom: 3px;
  }
  .meta-value { font-size: 10pt; font-weight: 600; color: #0f172a; word-break: break-word; }
  .section {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    margin-top: 4mm;
  }
  .section-head {
    background: #f1f5f9;
    padding: 7px 12px;
    font-size: 9pt;
    font-weight: 700;
    color: #1e293b;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-bottom: 1px solid #cbd5e1;
  }
  .section-body { padding: 8px 10px 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 5px 6px;
    text-align: left;
    vertical-align: top;
    font-size: 8.5pt;
  }
  th {
    background: #1e293b;
    color: #fff;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  tr:nth-child(even) { background: #f8fafc; }
  tr { page-break-inside: avoid; }
  .napomena {
    margin-top: 6mm;
    font-size: 8.5pt;
    color: #64748b;
    font-style: italic;
  }
  .footer {
    margin-top: 10mm;
    padding-top: 4mm;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #94a3b8;
  }
  @media print {
    body { background: #fff; }
    .header, th { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .wrap { width: auto; margin: 0; }
  }
`;

/**
 * @param {{
 *   naslov: string,
 *   podnaslov?: string,
 *   meta?: Array<{label: string, value: string|number}>,
 *   sekcijaNaslov?: string,
 *   tabelaHtml: string,
 *   napomena?: string,
 * }} opts
 */
export function buildListaFormaHtml(opts = {}) {
  const brend = getBrending();
  const logo = getPdfLogoDataUrl();
  const naslov = opts.naslov || "Izveštaj";
  const meta = (opts.meta || []).filter((m) => m && (m.value != null && m.value !== ""));
  const metaHtml = meta.length
    ? `<div class="meta">${meta.map((m) =>
      `<div class="meta-cell"><div class="meta-label">${esc(m.label)}</div>`
      + `<div class="meta-value">${esc(m.value)}</div></div>`,
    ).join("")}</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${esc(naslov)}</title>
<style>${FORMA_CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="header-brand">
      ${logo ? `<img class="header-logo" src="${logo}" alt=""/>` : ""}
      <div>
        <div class="header-kicker">${esc(brend.naziv || "TRI-CORE QC")}</div>
        <h1>${esc(naslov)}</h1>
        ${opts.podnaslov ? `<div class="header-sub">${esc(opts.podnaslov)}</div>` : ""}
      </div>
    </div>
  </div>
  ${metaHtml}
  <div class="section">
    <div class="section-head">${esc(opts.sekcijaNaslov || "Lista")}</div>
    <div class="section-body">${opts.tabelaHtml || ""}</div>
  </div>
  ${opts.napomena ? `<div class="napomena">${esc(opts.napomena)}</div>` : ""}
  <div class="footer">Generisano: ${esc(new Date().toLocaleString("sr-RS"))}${
    brend.razvojNaziv ? ` · Developed by ${esc(brend.razvojNaziv)}` : ""
  }</div>
</div>
</body></html>`;
}

export function otvoriListaFormaStampu(html) {
  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}
