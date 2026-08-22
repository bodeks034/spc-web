/**
 * PDF i štampa — NCR obrazac A4 (srpski), sekcije A–H + zvanični potpisi.
 */
import { OBRAZAC_SEKCIJE, labelStatusa, praznaNcrForma } from "./ncrObrazacPolja.js";
import { getBrending } from "./brending.js";
import { getPdfLogoDataUrl } from "./pdfBrending.js";
import { otvoriListaFormaStampu } from "./listaFormaDokument.js";
import { imeNcrObrazacPdf } from "./kvalitetFolderStruktura.js";

const POTPISI = [
  { uloga: "Kontrola", meta: "Ime i prezime · datum" },
  { uloga: "Proizvodnja", meta: "Ime i prezime · datum" },
  { uloga: "Menadžer kvaliteta (zatvaranje)", meta: "Ime i prezime · datum" },
];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function vrednostPolja(forma, key, opts = {}) {
  if (!key) return "—";
  const v = forma[key];
  if (opts.tip === "bool") return v ? "DA" : "NE";
  if (opts.tip === "status") return labelStatusa(v);
  if (v == null || v === "") return "—";
  return String(v);
}

const PRINT_CSS = `
  @page { size: A4 portrait; margin: 8mm 10mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 7.5pt;
    line-height: 1.25;
    color: #0f172a;
    background: #fff;
  }
  .wrap { width: 190mm; max-width: 100%; margin: 0 auto; padding: 0; }
  .header {
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: #fff; padding: 5mm 6mm 4mm; border-radius: 4px; page-break-inside: avoid;
  }
  .header-brand { display: flex; align-items: flex-start; gap: 8px; }
  .header-logo { height: 36px; max-width: 44px; object-fit: contain; flex-shrink: 0; }
  .header-kicker { font-size: 6.5pt; letter-spacing: 0.14em; text-transform: uppercase; color: #94a3b8; }
  .header h1 { font-size: 11pt; font-weight: 700; margin-top: 2px; line-height: 1.2; }
  .header-sub { font-size: 7.5pt; color: #cbd5e1; margin-top: 3px; line-height: 1.35; }
  .doc-meta {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
    margin-top: 3mm; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;
    page-break-inside: avoid;
  }
  .doc-meta-cell { padding: 4px 6px; border-right: 1px solid #e2e8f0; background: #f8fafc; min-height: 28px; }
  .doc-meta-cell:last-child { border-right: none; }
  .sekcija {
    margin-top: 2.5mm; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;
    page-break-inside: avoid;
  }
  .sekcija-naslov {
    background: #1e293b; color: #fff; padding: 4px 8px;
    font-size: 7.5pt; font-weight: 700; letter-spacing: 0.04em;
    border-bottom: 1px solid #334155;
  }
  .red { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #e2e8f0; }
  .red:last-child { border-bottom: none; }
  .polje { padding: 3px 5px; border-right: 1px solid #e2e8f0; min-height: 24px; }
  .polje:last-child { border-right: none; }
  .polje.span2 { grid-column: span 2; }
  .polje.span3 { grid-column: span 3; }
  .polje-opis { min-height: 32mm; }
  .lbl {
    font-size: 6pt; font-weight: 700; color: #334155; line-height: 1.2;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .lbl.obavezno { background: #fef3c7; display: inline-block; padding: 0 3px; border-radius: 2px; }
  .val { font-size: 7.5pt; word-break: break-word; white-space: pre-wrap; min-height: 12px; margin-top: 1px; }
  .val.prazno { min-height: 16px; border-bottom: 1px dotted #94a3b8; }
  .polje-opis .val { min-height: 28mm; align-content: flex-start; }
  .polje-opis .val.prazno { min-height: 28mm; }
  .napomena {
    margin-top: 3mm; padding: 4px 6px; border: 1px solid #fde68a; background: #fffbeb;
    border-radius: 4px; font-size: 6.5pt; color: #78350f; page-break-inside: avoid;
  }
  .potpisi-sekcija {
    margin-top: 4mm; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;
    page-break-inside: avoid;
  }
  .potpisi-naslov {
    background: #f1f5f9; padding: 5px 8px; font-size: 7pt; font-weight: 700;
    color: #1e293b; border-bottom: 1px solid #cbd5e1; text-transform: uppercase;
  }
  .potpisi-red { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
  .potpis { padding: 8px 10px 10px; border-right: 1px solid #e2e8f0; min-height: 22mm; }
  .potpis:last-child { border-right: none; }
  .potpis-uloga { font-size: 7pt; font-weight: 700; color: #1e293b; margin-bottom: 10mm; }
  .potpis-linija { border-bottom: 1px solid #334155; height: 1px; margin-bottom: 4px; }
  .potpis-meta { font-size: 6pt; color: #64748b; }
  .footer {
    margin-top: 3mm; padding-top: 2mm; border-top: 1px solid #e2e8f0;
    font-size: 6pt; color: #64748b; text-align: center;
  }
  @media print {
    html, body { width: 210mm; }
    .wrap { width: 190mm; }
    .sekcija, .potpisi-sekcija { break-inside: avoid; }
  }
`;

function htmlPotpisi() {
  const kolone = POTPISI.map((p) => `
    <div class="potpis">
      <div class="potpis-uloga">${esc(p.uloga)}</div>
      <div class="potpis-linija"></div>
      <div class="potpis-meta">${esc(p.meta)}</div>
    </div>`).join("");
  return `<div class="potpisi-sekcija">
    <div class="potpisi-naslov">Zvanični potpisi</div>
    <div class="potpisi-red">${kolone}</div>
  </div>`;
}

function buildObrazacHtml(forma, { prazanSablon = false } = {}) {
  const br = getBrending();
  const logo = getPdfLogoDataUrl();
  const sekcijeHtml = OBRAZAC_SEKCIJE.map((sek) => {
    const redovi = sek.redovi.map((red) => {
      const polja = red.map(([key, label, opts = {}]) => {
        if (!key) return '<div class="polje"></div>';
        const span = opts.span ? ` span${opts.span}` : "";
        const obavezno = opts.obavezno ? " obavezno" : "";
        const opisKlasa = key === "opis" ? " polje-opis" : "";
        const val = prazanSablon ? "" : vrednostPolja(forma, key, opts);
        const valKlasa = prazanSablon || !val || val === "—" ? "val prazno" : "val";
        const valHtml = prazanSablon ? "&nbsp;" : esc(val);
        return `<div class="polje${span}${opisKlasa}">
          <div class="lbl${obavezno}">${esc(label)}</div>
          <div class="${valKlasa}">${valHtml}</div>
        </div>`;
      }).join("");
      return `<div class="red">${polja}</div>`;
    }).join("");
    return `<div class="sekcija">
      <div class="sekcija-naslov">${esc(sek.naslov)}</div>
      ${redovi}
    </div>`;
  }).join("");

  const podnaslov = prazanSablon
    ? "Prazan A4 obrazac za popunjavanje"
    : `${forma.broj_ncr || "Novi zapis"} · ${labelStatusa(forma.status)} · ${new Date().toLocaleString("sr-RS")}`;

  const metaHtml = prazanSablon ? "" : `
  <div class="doc-meta">
    <div class="doc-meta-cell"><div class="lbl">Broj NCR-a</div><div class="val">${esc(forma.broj_ncr || "—")}</div></div>
    <div class="doc-meta-cell"><div class="lbl">ID dela</div><div class="val">${esc(forma.id_deo || "—")}</div></div>
    <div class="doc-meta-cell"><div class="lbl">Pogon</div><div class="val">${esc(forma.pogon || "—")}</div></div>
  </div>`;

  return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8"/>
<title>NCR ${esc(prazanSablon ? "prazan obrazac" : (forma.broj_ncr || "obrazac"))}</title>
<style>${PRINT_CSS}</style></head><body>
<div class="wrap">
  <div class="header">
    <div class="header-brand">
      ${logo ? `<img class="header-logo" src="${logo}" alt="" />` : ""}
      <div>
        <div class="header-kicker">${esc(br.naziv || "SPC Web")}</div>
        <h1>NCR — IZVEŠTAJ O NEUSAGLAŠENOSTI</h1>
        <div class="header-sub">${esc(podnaslov)}</div>
      </div>
    </div>
  </div>
  ${metaHtml}
  ${sekcijeHtml}
  <div class="napomena">Obavezna polja označena žutom. NCR se zatvara tek nakon containment-a, dispozicije i verifikacije efektivnosti.</div>
  ${htmlPotpisi()}
  <div class="footer">Generisano iz SPC Web · NCR_KVALITET / Pojedinacni_Obrasci</div>
</div></body></html>`;
}

export function imeNcrObrazacPdfFajla(forma, { prazanSablon = false } = {}) {
  if (prazanSablon) return "NCR_prazan_obrazac.pdf";
  const broj = forma?.broj_ncr;
  return broj ? imeNcrObrazacPdf(broj) : "NCR_obrazac.pdf";
}

export async function generisiNcrObrazacPdf(forma, opts = {}) {
  const html = buildObrazacHtml(forma, opts);
  const html2canvasMod = await import("html2canvas");
  const html2canvas = html2canvasMod.default ?? html2canvasMod;
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;width:794px;height:1123px;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((r) => setTimeout(r, 400));

  const canvas = await html2canvas(doc.body, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: 794,
  });
  document.body.removeChild(iframe);

  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const pageH = ph - margin * 2;
  const imgWidth = pw - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;
  pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageH;
  }

  return { pdf, filename: imeNcrObrazacPdfFajla(forma, opts) };
}

export function stampajNcrObrazac(forma, opts = {}) {
  otvoriListaFormaStampu(buildObrazacHtml(forma, opts), {
    naslov: `NCR ${forma.broj_ncr || ""}`,
  });
}

export function stampajPrazanNcrObrazac() {
  stampajNcrObrazac(praznaNcrForma(), { prazanSablon: true });
}

export async function preuzmiNcrObrazacPdf(forma, opts = {}) {
  const { pdf, filename } = await generisiNcrObrazacPdf(forma, opts);
  const { syncNcrObrazacPdf } = await import("./kvalitetFolderIzvoz.js");
  await syncNcrObrazacPdf(pdf, filename, {
    syncFolder: opts.syncFolder !== false,
    preuzmi: opts.preuzmi !== false,
    onFolderSync: opts.onFolderSync,
  });
  return filename;
}

export async function preuzmiPrazanNcrObrazacPdf() {
  return preuzmiNcrObrazacPdf(praznaNcrForma(), { prazanSablon: true });
}

export async function ncrObrazacPdfArrayBuffer(forma) {
  const { pdf } = await generisiNcrObrazacPdf(forma);
  return pdf.output("arraybuffer");
}

export { buildObrazacHtml, POTPISI };
