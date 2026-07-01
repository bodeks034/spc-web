/**
 * Generisanje barkod etiketa u pregledaču (QR + Code 128).
 * Format sadržaja usklađen sa src/lib/barkod.js i npm run barkodi.
 */

import QRCode from "qrcode";

export const BARKOD_FORMATI = [
  { id: "id", naziv: "Samo ID", opis: "npr. MRAP-001" },
  { id: "id_rn", naziv: "ID + radni nalog", opis: "ID|RN-2024-015" },
  { id: "puna", naziv: "ID + RN + datum + smena", opis: "ID|RN|datum|smena" },
];

export const TIPOVI_KODA = [
  { id: "oba", naziv: "QR + Code 128" },
  { id: "qr", naziv: "Samo QR" },
  { id: "code128", naziv: "Samo Code 128" },
];

/** Preseti širine etikete za štampu (termalni i standardni roll). */
export const ETIKETA_DIMENZIJE = [
  { id: "standard", naziv: "Standardna — 90 mm", sirinaMm: 90 },
  { id: "100mm", naziv: "Velika — 100 mm", sirinaMm: 100 },
  { id: "70mm", naziv: "Srednja — 70 mm", sirinaMm: 70 },
  { id: "58mm", naziv: "Termalna — 58 mm", sirinaMm: 58 },
  { id: "50mm", naziv: "Mala — 50 mm", sirinaMm: 50 },
  { id: "40mm", naziv: "Mini — 40 mm", sirinaMm: 40 },
  { id: "custom", naziv: "Prilagođena širina…", sirinaMm: null, custom: true },
];

/** Parametri generisanja slika i CSS-a prema širini etikete (mm). */
export function parametriEtikete(sirinaMm) {
  const w = Math.max(35, Math.min(120, Number(sirinaMm) || 90));
  const faktor = w / 90;
  return {
    sirinaMm: w,
    qrPx: Math.round(280 * faktor),
    codeScale: Math.max(1.5, Math.round(3 * faktor * 10) / 10),
    codeHeight: Math.max(7, Math.round(12 * faktor)),
    fontId: Math.max(11, Math.round(16 * faktor)),
    fontNaziv: Math.max(8, Math.round(11 * faktor)),
    qrImgMaxMm: Math.round(38 * faktor * 10) / 10,
    codeImgMaxMm: Math.round(80 * faktor * 10) / 10,
    paddingMm: Math.max(4, Math.round(8 * faktor)),
  };
}

export function dimenzijaPoId(id, customSirinaMm = 90) {
  const preset = ETIKETA_DIMENZIJE.find((d) => d.id === id) || ETIKETA_DIMENZIJE[0];
  const sirina = preset.custom
    ? Math.max(35, Math.min(120, Number(customSirinaMm) || 90))
    : preset.sirinaMm;
  return { ...preset, ...parametriEtikete(sirina) };
}

function dISO() {
  return new Date().toISOString().split("T")[0];
}

/** Sadržaj stringa u barkodu prema formatu. */
export function buildSadrzajBarkoda({
  idDeo,
  format = "id",
  radniNalog = "",
  datum = "",
  smena = null,
}) {
  const id = String(idDeo || "").trim().toUpperCase();
  const rn = String(radniNalog || "").trim().toUpperCase();
  if (!id) return "";
  if (format === "id_rn" && rn) return `${id}|${rn}`;
  if (format === "puna") {
    const d = datum || dISO();
    const s = smena != null && smena !== "" ? Number(smena) || 1 : 1;
    const rnPart = rn || "RN";
    return `${id}|${rnPart}|${d}|${s}`;
  }
  return id;
}

export async function genQrDataUrl(text, size = 280) {
  if (!text) return null;
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: size,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** Code 128 — dinamički učitaj bwip-js (radi u Vite bundle-u). */
export async function genCode128DataUrl(text, { scale = 3, height = 12 } = {}) {
  if (!text) return null;
  const mod = await import("bwip-js");
  const bwipjs = mod.default || mod;
  const canvas = document.createElement("canvas");
  bwipjs.toCanvas(canvas, {
    bcid: "code128",
    text,
    scale,
    height,
    includetext: true,
    textxalign: "center",
    textsize: Math.max(8, Math.round(height * 0.85)),
    paddingwidth: 8,
    paddingheight: 8,
  });
  return canvas.toDataURL("image/png");
}

export async function generisiEtiketaSlike({
  sadrzaj,
  tipKoda = "oba",
  dimenzijaId = "standard",
  customSirinaMm = 90,
}) {
  const dim = dimenzijaPoId(dimenzijaId, customSirinaMm);
  const qr = tipKoda === "oba" || tipKoda === "qr";
  const code128 = tipKoda === "oba" || tipKoda === "code128";
  const [qrUrl, codeUrl] = await Promise.all([
    qr ? genQrDataUrl(sadrzaj, dim.qrPx) : Promise.resolve(null),
    code128 ? genCode128DataUrl(sadrzaj, { scale: dim.codeScale, height: dim.codeHeight }) : Promise.resolve(null),
  ]);
  return { qrUrl, codeUrl, dim };
}

export function etiketaHtmlBlok({
  idDeo,
  naziv,
  tipKontrole = "deo",
  sadrzaj,
  opis = "",
  qrUrl,
  codeUrl,
  dim = null,
}) {
  const d = dim || parametriEtikete(90);
  const qrBlok = qrUrl ? `
    <div class="blok">
      <img src="${qrUrl}" alt="QR" />
      <div class="lbl">QR</div>
    </div>` : "";
  const codeBlok = codeUrl ? `
    <div class="blok">
      <img src="${codeUrl}" alt="Code128" class="code128" />
      <div class="lbl">Code 128</div>
    </div>` : "";
  return `
  <div class="etiketa" style="width:${d.sirinaMm}mm">
    <div class="zaglavlje">
      <div class="id">${idDeo}</div>
      <div class="naziv">${naziv || idDeo}</div>
      <div class="tip">${tipKontrole === "vozilo" ? "Kontrola vozila" : "Kontrola dela"}</div>
    </div>
    <div class="kodovi">${qrBlok}${codeBlok}</div>
    <div class="sadrzaj"><strong>Sadržaj:</strong> <code>${sadrzaj}</code></div>
    ${opis ? `<div class="opis">${opis}</div>` : ""}
  </div>`;
}

function buildPrintCss(dim) {
  const d = dim || parametriEtikete(90);
  return `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p.note { font-size: 12px; color: #444; margin: 0 0 16px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  .etiketa {
    width: ${d.sirinaMm}mm;
    border: 1px solid #333;
    border-radius: 4px;
    padding: ${d.paddingMm}px;
    page-break-inside: avoid;
  }
  .zaglavlje .id { font-size: ${d.fontId}px; font-weight: 700; line-height: 1.2; }
  .zaglavlje .naziv { font-size: ${d.fontNaziv}px; margin-top: 2px; line-height: 1.25; }
  .zaglavlje .tip { font-size: ${Math.max(7, d.fontNaziv - 2)}px; color: #555; margin-top: 2px; }
  .kodovi { display: flex; gap: 6px; margin: 6px 0; flex-wrap: wrap; justify-content: center; }
  .blok { text-align: center; flex: 1 1 auto; min-width: 0; }
  .blok img { max-width: ${d.qrImgMaxMm}mm; width: 100%; height: auto; display: block; margin: 0 auto; }
  .blok img.code128 { max-width: ${d.codeImgMaxMm}mm; }
  .lbl { font-size: ${Math.max(7, d.fontNaziv - 3)}px; color: #666; margin-top: 2px; }
  .sadrzaj { font-size: ${Math.max(7, d.fontNaziv - 2)}px; word-break: break-all; margin-top: 4px; }
  .opis { font-size: ${Math.max(7, d.fontNaziv - 3)}px; color: #666; margin-top: 4px; }
  @media print {
    body { margin: 0; }
    .etiketa { border: 1px solid #000; }
    @page { margin: 8mm; }
  }`;
}

/** Otvori prozor za štampu jedne ili više etiketa. */
export function stampajEtikete(htmlDelovi, naslov = "SPC — barkod etikete", { dim = null } = {}) {
  const d = dim || parametriEtikete(90);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  }
  const html = `<!DOCTYPE html>
<html lang="sr"><head><meta charset="UTF-8"/><title>${naslov}</title>
<style>${buildPrintCss(d)}</style></head>
<body>
<h1>${naslov}</h1>
<p class="note">Štampa: Ctrl+P · Etiketa ${d.sirinaMm} mm · Suffix Enter na čitaču</p>
<div class="grid">${htmlDelovi.join("")}</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),400);};</script>
</body></html>`;
  win.document.write(html);
  win.document.close();
}
