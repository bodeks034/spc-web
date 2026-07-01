/** 8D izveštaj — zajednička polja, PDF (Unicode) i payload za bazu. */

import { formatPoljeHtml } from "./osmdStruktura.js";
import { formatZaglavljeHtml } from "./osmdZaglavlje.js";
import { deriveNaslov8d, derivePodnaslov8d, formatPrilogeHtml } from "./osmdPriloge.js";
import { getBrending } from "./brending.js";
import { getPdfLogoDataUrl } from "./pdfBrending.js";

export const POLJA_8D = [
  { key: "d1_tim", label: "D1 — Tim", ph: "Voditelj, članovi, uloge…", rows: 3 },
  { key: "d2_opis_problema", label: "D2 — Opis problema (5W)", ph: "Ko, šta, kada…", rows: 4 },
  { key: "d3_privremena_akcija", label: "D3 — Privremena akcija", ph: "Hitne mere…", rows: 3 },
  { key: "d4_uzrok", label: "D4 — Uzrok (5×Zašto + 6M)", ph: "Analiza uzroka…", rows: 4 },
  { key: "d5_korektivna", label: "D5 — Korektivna akcija", ph: "Trajna rešenja…", rows: 4 },
  { key: "d6_implementacija", label: "D6 — Plan implementacije", ph: "Tabela akcija…", rows: 3 },
  { key: "d7_prevencija", label: "D7 — Prevencija", ph: "Sprečavanje ponavljanja…", rows: 3 },
  { key: "d8_zakljucak", label: "D8 — Zaključak", ph: "Validacija, zatvaranje…", rows: 3 },
];

export const POLJA_PRILOZI = [
  { key: "lesson_learned", label: "LL — Lesson Learned", ph: "Naučene lekcije…", rows: 4 },
];

const STATUS_NAZIV = {
  u_izradi: "U izradi",
  pregled: "Na pregledu",
  zavrsen: "Završen",
};

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSectionBody(key, sadrzaj) {
  const html = formatPoljeHtml(key, sadrzaj);
  if (html) return html;
  return '<span class="empty">—</span>';
}

function datumZaPdf(izv) {
  const raw = izv?.created_at;
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function safeImeFajla(deo, datum) {
  const id = String(deo || "deo").replace(/[^\w.-]+/g, "_");
  const dan = datum.toISOString().split("T")[0];
  return id ? `${id}_${dan}` : dan;
}

export function statusNaziv8d(status) {
  return STATUS_NAZIV[String(status || "").trim()] || String(status || "—").replace(/_/g, " ");
}

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", Arial, "Helvetica Neue", sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #0f172a;
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { width: 190mm; margin: 0 auto; padding: 0 0 14mm; }
  .header {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #fff;
    padding: 12mm 12mm 10mm;
    border-radius: 0 0 8px 8px;
  }
  .header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-logo {
    height: 48px;
    width: auto;
    max-width: 56px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .header-text { flex: 1; min-width: 0; }
  .header-kicker {
    font-size: 8pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  .header h1 {
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-bottom: 6px;
  }
  .header-sub { font-size: 10pt; color: #cbd5e1; }
  .meta {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin: 10mm 0 8mm;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    background: #f8fafc;
  }
  .meta-cell {
    padding: 8px 12px;
    border-right: 1px solid #e2e8f0;
    min-height: 52px;
  }
  .meta-cell:last-child { border-right: none; }
  .meta-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .meta-value {
    font-size: 10.5pt;
    font-weight: 600;
    color: #0f172a;
    word-break: break-word;
  }
  .meta-value.muted { font-weight: 400; color: #334155; }
  .zaglavlje-wrap { margin: 8mm 0 10mm; page-break-inside: auto; break-inside: auto; }
  .zaglavlje-tbl th { width: 34%; font-size: 9pt; vertical-align: top; }
  .zaglavlje-tbl td { font-size: 10.5pt; white-space: pre-wrap; word-break: break-word; }
  .zaglavlje-tbl tr { page-break-inside: avoid; break-inside: avoid; }
  .zaglavlje-interno th { background: #e2e8f0; color: #475569; }
  .status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 9pt;
    font-weight: 700;
    background: #dbeafe;
    color: #1d4ed8;
  }
  .status.zavrsen { background: #dcfce7; color: #15803d; }
  .status.pregled { background: #fef9c3; color: #a16207; }
  .sections { display: flex; flex-direction: column; gap: 8px; }
  .section {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: visible;
    background: #fff;
  }
  .section-head {
    display: grid;
    grid-template-columns: 36px 1fr;
    align-items: center;
    gap: 10px;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
    padding: 8px 12px;
  }
  .badge {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #2563eb;
    color: #fff;
    font-weight: 800;
    font-size: 11pt;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    color: #1e293b;
  }
  .section-body {
    padding: 10px 14px 12px 14px;
    font-size: 10.5pt;
    color: #0f172a;
    min-height: 28px;
    word-break: break-word;
  }
  .section-body.empty { color: #64748b; font-style: italic; }
  .section-body .empty { color: #64748b; font-style: italic; }
  ul.lista { margin: 0; padding: 0 0 0 18px; list-style: disc; }
  ul.lista li { margin: 4px 0; line-height: 1.45; }
  ul.lista li::marker { color: #2563eb; }
  .tbl { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 0; }
  .tbl th, .tbl td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: top; }
  .tbl th { background: #f1f5f9; font-weight: 700; color: #475569; width: 28%; }
  .meta-tbl th { width: 22%; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; }
  .akcije-tbl thead th { background: #1e293b; color: #f8fafc; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.06em; border-color: #334155; }
  .akcije-tbl tbody tr:nth-child(even) { background: #f8fafc; }
  .akcije-tbl .tc { text-align: center; white-space: nowrap; }
  .status-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 8.5pt; font-weight: 700; }
  .st-plan { background: #dbeafe; color: #1d4ed8; }
  .st-wip { background: #fef9c3; color: #a16207; }
  .st-done { background: #dcfce7; color: #15803d; }
  .st-hold { background: #f1f5f9; color: #64748b; }
  .sub-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin: 10px 0 6px; }
  .sub-title.m6-wrap { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
  .grupa-blok { margin: 8px 0 12px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; page-break-inside: avoid; break-inside: avoid; }
  .grupa-naslov { font-size: 10.5pt; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
  .w1h-stavka {
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .w1h-stavka:last-child { border-bottom: none; }
  .w1h-lbl {
    font-size: 9pt;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
  }
  .w1h-txt {
    font-size: 10.5pt;
    color: #0f172a;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  .w1h-tbl th { width: 32%; font-size: 9pt; }
  .d4-meta { margin-bottom: 8px; }
  .why-grana { margin: 8px 0 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
  .why-grana-naslov { font-size: 9pt; font-weight: 700; color: #2563eb; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
  .why-stavka { margin: 6px 0; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 10pt; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
  .why-stavka:last-child { border-bottom: none; }
  .m6-tbl td { white-space: pre-wrap; word-break: break-word; }
  .sub-title.m6-wrap { margin-top: 8px; }
  .m6-tbl { font-size: 8.5pt; }
  .m6-tbl th, .m6-tbl td { padding: 3px 6px; line-height: 1.35; }
  .m6-kat { font-size: 8pt; }
  .m6-eng { font-size: 7pt; }
  .why-opis-blok { margin: 6px 0 8px; padding: 8px 10px; background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 4px; font-size: 10pt; }
  .d4-footer-blok { margin: 8px 0; padding: 8px 10px; background: #f8fafc; border-left: 3px solid #64748b; border-radius: 4px; font-size: 10pt; }
  .why-tbl th { width: 18%; }
  .why-tbl .why-korak { font-weight: 800; color: #2563eb; background: #eff6ff; }
  .why-row-problem th { background: #fef2f2; color: #b91c1c; }
  .why-row-problem td { background: #fff5f5; }
  .why-row-koren td:first-child { background: #ecfdf5; color: #065f46; font-weight: 700; text-align: right; }
  .why-row-koren td:last-child { background: #f0fdf4; font-weight: 600; }
  .m6-tbl th.m6-kat { width: 26%; vertical-align: top; }
  .m6-tbl .m6-eng { font-weight: 400; color: #64748b; font-size: 8pt; }
  .ref-tbl th { width: 34%; font-size: 9pt; vertical-align: top; background: #f8fafc; }
  .ref-scroll { overflow-x: auto; margin: 0 -4px; }
  .ref-data-tbl { font-size: 8pt; min-width: 100%; }
  .ref-data-tbl th { background: #1e293b; color: #f8fafc; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; padding: 5px 6px; }
  .ref-data-tbl td { font-size: 8pt; padding: 5px 6px; vertical-align: top; white-space: pre-wrap; word-break: break-word; max-width: 140px; }
  .ref-data-tbl tbody tr:nth-child(even) { background: #f8fafc; }
  .ref-blok { margin-bottom: 12px; }
  .ref-blok:last-child { margin-bottom: 0; }
  .ref-naslov {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #475569;
    margin: 0 0 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
  }
  .ref-body { padding-top: 8px; }
  .prilog-badge { background: #0f766e; font-size: 9pt; }
  .prilog-badge.ref { background: #7c3aed; }
  .prilog-section .section-head { background: #f0fdf4; }
  .prilog-section.ref-section .section-head { background: #faf5ff; }
  .footer {
    margin-top: 10mm;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 8.5pt;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  @media print {
    @page { size: A4 portrait; margin: 10mm 12mm; }
    body { background: #fff; }
    .wrap { width: 100%; padding: 0; }
    .header { border-radius: 0; page-break-after: avoid; break-after: avoid; }
    .meta { page-break-inside: avoid; break-inside: avoid; page-break-after: avoid; }
    .section { page-break-inside: auto; break-inside: auto; border-radius: 0; }
    .section-head { page-break-after: avoid; break-after: avoid; }
    .section-body { overflow: visible; }
    .w1h-stavka, .why-stavka, .why-grana, .d4-footer-blok, .tbl tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sub-title { page-break-after: avoid; break-after: avoid; }
    .zaglavlje-wrap { page-break-inside: auto; break-inside: auto; }
    .zaglavlje-tbl tr { page-break-inside: avoid; break-inside: avoid; }
  }
`;

/** HTML za štampu / PDF — pun Unicode (č, ć, š, đ, ž). */
export function buildOsmdPrintHtml(izv, {
  naslov,
  podnaslov,
} = {}) {
  const datum = datumZaPdf(izv);
  const status = String(izv?.status || "u_izradi");
  const statusKlasa = status === "zavrsen" ? "zavrsen" : status === "pregled" ? "pregled" : "";
  const statusHtml = `<span class="status ${statusKlasa}">${escapeHtml(statusNaziv8d(status))}</span>`;
  const zaglavljeHtml = formatZaglavljeHtml(izv, { statusHtml });
  const naslovHtml = naslov || deriveNaslov8d(izv);
  const podnaslovHtml = podnaslov || derivePodnaslov8d(izv);
  const prilogeHtml = formatPrilogeHtml(izv);
  const idFooter = String(izv?.broj_8d || izv?.id_deo || "8D").trim();
  const razvoj = getBrending().razvojNaziv?.trim();
  const kicker = razvoj ? `TRI-CORE QC · Developed by ${razvoj}` : "TRI-CORE QC";
  const logoSrc = getPdfLogoDataUrl();

  const sekcije = POLJA_8D.map((p, i) => {
    const sadrzaj = String(izv?.[p.key] ?? "").trim();
    const prazno = !sadrzaj;
    const bodyHtml = prazno ? '<span class="empty">—</span>' : formatSectionBody(p.key, sadrzaj);
    return `
      <article class="section">
        <div class="section-head">
          <div class="badge">D${i + 1}</div>
          <div class="section-title">${escapeHtml(p.label.replace(/^D\d+\s—\s*/, ""))}</div>
        </div>
        <div class="section-body${prazno ? " empty" : ""}">${bodyHtml}</div>
      </article>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(naslovHtml)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <div class="header-brand">
        ${logoSrc ? `<img class="header-logo" src="${logoSrc}" alt="TRI-CORE QC"/>` : ""}
        <div class="header-text">
          <div class="header-kicker">${escapeHtml(kicker)}</div>
          <h1>${escapeHtml(naslovHtml)}</h1>
          <div class="header-sub">${escapeHtml(podnaslovHtml)}</div>
        </div>
      </div>
    </header>

    ${zaglavljeHtml}

    <div class="sections">${sekcije}${prilogeHtml}</div>

    <footer class="footer">
      <span>Generisano: ${escapeHtml(new Date().toLocaleString("sr-RS"))}</span>
      <span>ID: ${escapeHtml(idFooter)} · TRI-CORE QC</span>
    </footer>
  </div>
</body>
</html>`;
}

async function htmlElementIzOsmd(izv, options) {
  const html = buildOsmdPrintHtml(izv, options);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.top = "0";
  frame.style.width = "210mm";
  frame.style.height = "1px";
  frame.style.border = "none";
  frame.style.overflow = "hidden";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  await new Promise((resolve) => {
    if (doc.readyState === "complete") resolve();
    else frame.onload = resolve;
  });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const root = doc.body.querySelector(".wrap") || doc.body;
  const fullH = Math.ceil(root.scrollHeight || root.offsetHeight) + 48;
  frame.style.height = `${fullH}px`;
  await new Promise((r) => requestAnimationFrame(r));
  return { frame, root };
}

const PDF_SCALE = 2;
const PDF_IMG_FORMAT = "PNG";

async function captureElement(el, html2canvas) {
  return html2canvas(el, {
    scale: PDF_SCALE,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: el.scrollWidth,
    height: el.scrollHeight,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
    onclone: (clonedDoc) => {
      const body = clonedDoc.body;
      if (body) {
        body.style.color = "#0f172a";
        body.style.webkitFontSmoothing = "antialiased";
      }
    },
  });
}

/** Postavlja blok na PDF — po sekcijama, sa prelomom na granici stranice. */
function placeCanvasOnPdf(pdf, canvas, state) {
  const { margin, pageW, pageH } = state;
  const contentW = pageW - 2 * margin;
  const imgH = (canvas.height * contentW) / canvas.width;
  const imgData = canvas.toDataURL(`image/${PDF_IMG_FORMAT.toLowerCase()}`);
  const imgType = PDF_IMG_FORMAT;
  const usableH = pageH - 2 * margin;

  const ensureSpace = (need) => {
    if (state.y + need > pageH - margin && state.y > margin) {
      pdf.addPage();
      state.y = margin;
    }
  };

  if (imgH <= usableH) {
    ensureSpace(imgH);
    pdf.addImage(imgData, imgType, margin, state.y, contentW, imgH);
    state.y += imgH + 4;
    return;
  }

  if (state.y > margin) {
    pdf.addPage();
    state.y = margin;
  }
  let offset = 0;
  while (offset < imgH - 0.5) {
    if (offset > 0) {
      pdf.addPage();
      state.y = margin;
    }
    pdf.addImage(imgData, imgType, margin, state.y - offset, contentW, imgH);
    offset += usableH;
  }
  state.y = margin + 4;
}

/** PDF blokovi — po D sekcijama (bez finog deljenja radi brzine). */
function pdfCaptureBlocks(root) {
  const out = [];
  const add = (el) => { if (el) out.push(el); };
  add(root.querySelector(".header"));
  add(root.querySelector(".zaglavlje-wrap"));
  root.querySelectorAll(".sections .section").forEach((section) => add(section));
  add(root.querySelector(".footer"));
  return out;
}

async function htmlToPdfA4(root, filename, libs, { existingPdf = null, save = true } = {}) {
  const jsPDF = libs?.jsPDF || (await import("jspdf")).default;
  const html2canvas = libs?.html2canvas || (await import("html2canvas")).default;

  const pdf = existingPdf || new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const state = { y: margin, margin, pageW, pageH };

  const blocks = pdfCaptureBlocks(root);
  for (const block of blocks) {
    const canvas = await captureElement(block, html2canvas);
    placeCanvasOnPdf(pdf, canvas, state);
  }

  if (save && filename) pdf.save(filename);
  return pdf;
}

/** Renderuje 8D HTML u postojeći ili novi jsPDF dokument. */
export async function renderOsmdUPdf(pdf, izv, options = {}, libs) {
  const { frame, root } = await htmlElementIzOsmd(izv, options);
  try {
    const resolvedLibs = libs || {
      jsPDF: (await import("jspdf")).default,
      html2canvas: (await import("html2canvas")).default,
    };
    return await htmlToPdfA4(root, null, resolvedLibs, { existingPdf: pdf, save: false });
  } finally {
    frame.remove();
  }
}

/** Generiše i preuzima PDF 8D izveštaja (srpska latinica). */
export async function exportOsmdIzvestajPdf(izv, {
  naslov,
  podnaslov,
  prefiksFajla = "8D",
  onProgress = null,
} = {}) {
  const datum = datumZaPdf(izv);
  onProgress?.("Priprema…");
  const libsPromise = Promise.all([
    import("jspdf").then((m) => m.default),
    import("html2canvas").then((m) => m.default),
  ]);
  const htmlPromise = htmlElementIzOsmd(izv, { naslov, podnaslov });
  const [libs, { frame, root }] = await Promise.all([libsPromise, htmlPromise]);
  const [jsPDF, html2canvas] = libs;
  try {
    onProgress?.("Generisanje PDF…");
    await htmlToPdfA4(root, `${prefiksFajla}_${safeImeFajla(izv?.id_deo, datum)}.pdf`, { jsPDF, html2canvas });
  } finally {
    frame.remove();
  }
}

/** HTML sadržaj pogodan za Microsoft Word (.doc). */
export function buildOsmdWordHtml(izv, options = {}) {
  return buildOsmdPrintHtml(izv, options);
}

function preuzmiBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Preuzima 8D kao Word dokument (HTML u .doc — otvara se u Word-u). */
export function exportOsmdIzvestajWord(izv, {
  naslov,
  podnaslov,
  prefiksFajla = "8D",
  preuzmi = true,
} = {}) {
  const datum = datumZaPdf(izv);
  const html = buildOsmdWordHtml(izv, { naslov, podnaslov });
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const fname = `${prefiksFajla}_${safeImeFajla(izv?.broj_8d || izv?.id_deo, datum)}.doc`;
  if (preuzmi) preuzmiBlob(blob, fname);
  return blob;
}

/** Otvara prozor za štampu (Ctrl+P) — isti izgled kao PDF. */
export async function stampajOsmdIzvestaj(izv, options = {}) {
  const html = buildOsmdPrintHtml(izv, options);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}

export const OSMD_DB_KOLONE = [
  "id_deo",
  "broj_8d",
  "defekt_nedostatak",
  "broj_reklamacije",
  "kupac_ime_id",
  "kupac_lokacija",
  "kupac_kontakt",
  "artikal_naziv_sifra",
  "lot_serijski",
  "otpremnica_rn",
  "kolicina_reklamacije",
  "datum_prijema_reklamacije",
  "datum_otvaranja_8d",
  "datum_cilj_zatvaranja",
  "klasa_greske",
  "bezbednost_problem",
  "d1_tim",
  "d2_opis_problema",
  "d3_privremena_akcija",
  "d4_uzrok",
  "d5_korektivna",
  "d6_implementacija",
  "d7_prevencija",
  "d8_zakljucak",
  "lesson_learned",
  "pfmea_ref",
  "control_plan_ref",
  "status",
];

const OSMD_DATE_KOLONE = new Set([
  "datum_prijema_reklamacije",
  "datum_otvaranja_8d",
  "datum_cilj_zatvaranja",
]);

export function osmdPayloadIzForme(form) {
  const out = {};
  for (const k of OSMD_DB_KOLONE) {
    if (form[k] === undefined || form[k] === null) continue;
    if (OSMD_DATE_KOLONE.has(k)) {
      const s = String(form[k]).trim();
      out[k] = s || null;
    } else {
      out[k] = form[k];
    }
  }
  return out;
}
