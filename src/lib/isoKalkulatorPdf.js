/**
 * PDF i štampa za ISO 2859 (AQL) i ISO 3951 kalkulatore.
 */

import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";

const MARGIN = 14;
const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];
const PDF_GRANICA = [120, 130, 145];

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pdfSekcijaNaslov(pdf, y, tekst) {
  const w = pdf.internal.pageSize.getWidth() - MARGIN * 2;
  pdf.setFillColor(44, 82, 130);
  pdf.rect(MARGIN, y, w, 7, "F");
  pdf.setTextColor(...PDF_BELO);
  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(9);
  pdf.text(tekst, MARGIN + 2, y + 5);
  pdf.setTextColor(...PDF_CRNI);
  return y + 10;
}

function pdfMetaRed(pdf, y, tekst, bold = false) {
  pdf.setFont(PDF_FONT_SR, bold ? "bold" : "normal");
  pdf.setFontSize(9);
  pdf.text(tekst, MARGIN, y);
  return y + 5;
}

function pdfTabela(pdf, { y, kolone, redovi }) {
  const pageW = pdf.internal.pageSize.getWidth();
  const tabelaW = pageW - MARGIN * 2;
  const lineH = 4.2;
  const headerH = 7;

  const drawHeader = (atY) => {
    pdf.setFillColor(28, 35, 51);
    pdf.rect(MARGIN, atY - 4.5, tabelaW, headerH, "F");
    pdf.setTextColor(...PDF_BELO);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(7);
    let cx = MARGIN + 1.5;
    for (const k of kolone) {
      pdf.text(k.label, cx, atY);
      cx += k.w;
    }
    pdf.setTextColor(...PDF_CRNI);
    return atY + headerH - 1;
  };

  y = drawHeader(y);

  (redovi || []).forEach((row, ri) => {
    const cells = kolone.map((k) => {
      const raw = k.fmt ? k.fmt(row) : String(row[k.key] ?? "—");
      return pdf.splitTextToSize(raw, Math.max(k.w - 2, 8));
    });
    const lines = Math.max(...cells.map((c) => c.length), 1);
    const rowH = lines * lineH + 2.5;

    if (y + rowH > 250) {
      pdf.addPage();
      y = MARGIN + 6;
      y = drawHeader(y);
    }

    if (ri % 2 === 0) {
      pdf.setFillColor(...PDF_ALT);
      pdf.rect(MARGIN, y - 3.2, tabelaW, rowH, "F");
    }

    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(7);
    let cx = MARGIN + 1.5;
    cells.forEach((linesArr, ci) => {
      linesArr.forEach((ln, li) => pdf.text(ln, cx, y + li * lineH));
      cx += kolone[ci].w;
    });
    y += rowH;
  });

  return y + 4;
}

function otvoriStampu(html) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}

const PRINT_CSS = `
  body{font-family:Segoe UI,Arial,sans-serif;font-size:11px;color:#1a1a1a;margin:24px;}
  h1{font-size:16px;color:#2c5282;margin:0 0 4px;}
  h2{font-size:12px;color:#2c5282;border-bottom:2px solid #2c5282;padding-bottom:4px;margin-top:20px;}
  .meta{color:#555;margin-bottom:16px;line-height:1.5;}
  .odluka{background:#f0f4f8;border:2px solid #2c5282;border-radius:8px;padding:16px;text-align:center;margin:16px 0;}
  .odluka-v{font-size:22px;font-weight:700;color:#2c5282;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}
  th{background:#1c2333;color:#fff;font-size:9px;}
  tr:nth-child(even){background:#e8eef6;}
  @media print{body{margin:12mm;}}
`;

/** Normalizuje podatke iz AQLTabela komponente. */
export function snapshotIso2859({
  velicina,
  nivo,
  tipInspekcije,
  slovo,
  refN,
  nivoLabel,
  planovi = [],
  konacna = {},
  ukNok = 0,
}) {
  return {
    standard: "ISO 2859-1",
    velicina: Number(velicina) || 0,
    nivo,
    tipInspekcije,
    slovo,
    refN,
    nivoLabel,
    ukNok,
    konacna,
    redovi: planovi.map((p) => ({
      klasa: p.naziv,
      aql: p.plan?.fullInspection ? "0 (100%)" : `${p.plan?.aql ?? "—"}%`,
      kod: p.plan?.slovo ?? "—",
      n: p.plan?.n ?? "—",
      ac: p.plan?.fullInspection ? "100%" : (p.plan?.ac >= 0 ? p.plan.ac : "—"),
      re: p.plan?.fullInspection ? "100%" : (p.plan?.re >= 0 ? p.plan.re : "—"),
      nok: p.nok ?? 0,
      odluka: p.odluka?.tekst ?? "—",
    })),
  };
}

/** Normalizuje podatke iz Iso3951Kalkulator komponente. */
export function snapshotIso3951({
  lot,
  prefs = {},
  plan = {},
  stat = {},
  merenja = [],
  odluka = {},
  upozorenje = null,
}) {
  const tipLbl = {
    dvostrano: "Dvostrano (LSL + USL)",
    gornja: "Samo gornja (USL)",
    donja: "Samo donja (LSL)",
  }[prefs.tipGranice] || prefs.tipGranice || "—";

  return {
    standard: "ISO 3951-1",
    lot: Number(lot) || 0,
    nivo: prefs.nivo || "II",
    aql: prefs.aql || "1.5",
    tipGranice: tipLbl,
    lsl: prefs.lsl ?? "—",
    usl: prefs.usl ?? "—",
    nominala: prefs.nominala ?? "—",
    kod: plan.slovo ?? "—",
    n_plan: plan.n ?? "—",
    k: plan.k != null ? Number(plan.k).toFixed(3) : "—",
    pctLota: plan.pctLota != null ? `${Number(plan.pctLota).toFixed(2)}%` : "—",
    merenja: Array.isArray(merenja) ? merenja : [],
    mean: stat.ok ? Number(stat.mean).toFixed(4) : "—",
    s: stat.ok ? Number(stat.s).toFixed(4) : "—",
    n_uneto: stat.n ?? 0,
    odluka,
    upozorenje,
  };
}

const ISO2859_KOLONE = [
  { label: "KLASA", w: 28, key: "klasa" },
  { label: "AQL", w: 18, key: "aql" },
  { label: "KOD", w: 12, key: "kod" },
  { label: "n", w: 12, fmt: (r) => String(r.n) },
  { label: "Ac", w: 12, key: "ac" },
  { label: "Re", w: 12, key: "re" },
  { label: "NOK", w: 12, fmt: (r) => String(r.nok) },
  { label: "ODLUKA", w: 26, key: "odluka" },
];

export function buildIso2859PrintHtml(snapshot) {
  const s = snapshot || {};
  const rows = (s.redovi || []).map((r) =>
    `<tr><td>${escHtml(r.klasa)}</td><td>${escHtml(r.aql)}</td><td>${escHtml(r.kod)}</td>`
    + `<td>${escHtml(r.n)}</td><td>${escHtml(r.ac)}</td><td>${escHtml(r.re)}</td>`
    + `<td>${escHtml(r.nok)}</td><td>${escHtml(r.odluka)}</td></tr>`,
  ).join("");

  return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8"/>
<title>ISO 2859-1 — AQL proračun</title><style>${PRINT_CSS}</style></head><body>
<h1>ISO 2859-1 / ANSI Z1.4 — AQL kalkulator</h1>
<div class="meta">
  <div><b>Datum:</b> ${new Date().toLocaleString("sr-RS")}</div>
  <div><b>Lot:</b> ${escHtml(s.velicina)} · <b>Nivo:</b> ${escHtml(s.nivo)} · <b>Tip:</b> ${escHtml(s.tipInspekcije)}</div>
  <div><b>Kod slova:</b> ${escHtml(s.slovo)} · <b>Ref. n:</b> ${escHtml(s.refN)} · <b>Ukupno NOK:</b> ${escHtml(s.ukNok)}</div>
</div>
<h2>Plan po klasama defekata</h2>
<table><thead><tr><th>Klasa</th><th>AQL</th><th>Kod</th><th>n</th><th>Ac</th><th>Re</th><th>NOK</th><th>Odluka</th></tr></thead><tbody>${rows}</tbody></table>
<div class="odluka">
  <div style="font-size:10px;color:#666;margin-bottom:6px;">KONAČNA ODLUKA LOTA</div>
  <div class="odluka-v">${escHtml(s.konacna?.tekst || "—")}</div>
  <div style="margin-top:8px;color:#555;">${escHtml(s.konacna?.razlog || "")}</div>
</div>
<p style="font-size:10px;color:#888;">TRI-CORE QC · Generisano iz ISO 2859 kalkulatora</p>
</body></html>`;
}

export function buildIso3951PrintHtml(snapshot) {
  const s = snapshot || {};
  const mer = (s.merenja || []).map((v) => escHtml(v)).join(" · ") || "—";

  return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8"/>
<title>ISO 3951-1 — varijable</title><style>${PRINT_CSS}</style></head><body>
<h1>ISO 3951-1 / ANSI Z1.9 — varijabilna kontrola</h1>
<div class="meta">
  <div><b>Datum:</b> ${new Date().toLocaleString("sr-RS")}</div>
  <div><b>Lot:</b> ${escHtml(s.lot)} · <b>Nivo:</b> ${escHtml(s.nivo)} · <b>AQL:</b> ${escHtml(s.aql)}%</div>
  <div><b>Tip granice:</b> ${escHtml(s.tipGranice)} · <b>LSL:</b> ${escHtml(s.lsl)} · <b>USL:</b> ${escHtml(s.usl)} · <b>Nominala:</b> ${escHtml(s.nominala)}</div>
  <div><b>Kod:</b> ${escHtml(s.kod)} · <b>n (plan):</b> ${escHtml(s.n_plan)} · <b>k:</b> ${escHtml(s.k)} · <b>% lota:</b> ${escHtml(s.pctLota)}</div>
</div>
<h2>Statistika uzorka</h2>
<table><thead><tr><th>x̄</th><th>s</th><th>n uneto</th><th>Merenja</th></tr></thead>
<tbody><tr><td>${escHtml(s.mean)}</td><td>${escHtml(s.s)}</td><td>${escHtml(s.n_uneto)}</td><td>${mer}</td></tr></tbody></table>
${s.upozorenje ? `<p style="color:#c05621;">⚠ ${escHtml(s.upozorenje)}</p>` : ""}
<div class="odluka">
  <div style="font-size:10px;color:#666;margin-bottom:6px;">ODLUKA LOTA (s-metod, Form k)</div>
  <div class="odluka-v">${escHtml(s.odluka?.tekst || "—")}</div>
  <div style="margin-top:8px;color:#555;">${escHtml(s.odluka?.razlog || "")}</div>
</div>
<p style="font-size:10px;color:#888;">TRI-CORE QC · Generisano iz ISO 3951 kalkulatora</p>
</body></html>`;
}

export async function kreirajIso2859Pdf(snapshot) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const s = snapshot || {};
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "ISO 2859-1 — AQL proračun",
    podnaslov: `ANSI Z1.4 · Lot ${s.velicina} · Nivo ${s.nivo}`,
  });
  y += 4;

  y = pdfMetaRed(pdf, y, `Datum: ${new Date().toLocaleString("sr-RS")}`);
  y = pdfMetaRed(pdf, y, `Tip inspekcije: ${s.tipInspekcije} · Kod: ${s.slovo} · Ref. n: ${s.refN}`);
  y = pdfMetaRed(pdf, y, `Ukupno NOK u uzorku: ${s.ukNok}`);
  y += 4;

  y = pdfSekcijaNaslov(pdf, y, "PLAN PO KLASAMA DEFEKATA");
  y = pdfTabela(pdf, { y, kolone: ISO2859_KOLONE, redovi: s.redovi || [] });

  y = pdfSekcijaNaslov(pdf, y, "KONAČNA ODLUKA LOTA");
  y = pdfMetaRed(pdf, y, s.konacna?.tekst || "—", true);
  y = pdfMetaRed(pdf, y, s.konacna?.razlog || "");

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  return { pdf, filename: `TRI-CORE_ISO2859_AQL_${datum}.pdf` };
}

export async function preuzmiIso2859Pdf(snapshot) {
  const { pdf, filename } = await kreirajIso2859Pdf(snapshot);
  pdf.save(filename);
  return filename;
}

export function stampajIso2859(snapshot) {
  otvoriStampu(buildIso2859PrintHtml(snapshot));
}

export async function kreirajIso3951Pdf(snapshot) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const s = snapshot || {};
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "ISO 3951-1 — varijabilna kontrola",
    podnaslov: `ANSI Z1.9 · Lot ${s.lot} · AQL ${s.aql}%`,
  });
  y += 4;

  y = pdfMetaRed(pdf, y, `Datum: ${new Date().toLocaleString("sr-RS")}`);
  y = pdfMetaRed(pdf, y, `Nivo: ${s.nivo} · Tip granice: ${s.tipGranice}`);
  y = pdfMetaRed(pdf, y, `LSL: ${s.lsl} · USL: ${s.usl} · Nominala: ${s.nominala}`);
  y = pdfMetaRed(pdf, y, `Kod: ${s.kod} · n=${s.n_plan} · k=${s.k} · % lota: ${s.pctLota}`);
  y += 4;

  y = pdfSekcijaNaslov(pdf, y, "STATISTIKA UZORKA");
  y = pdfMetaRed(pdf, y, `x̄ = ${s.mean} · s = ${s.s} · n uneto = ${s.n_uneto}`);
  if (s.merenja?.length) {
    const merTxt = s.merenja.slice(0, 30).join(", ");
    const linije = pdf.splitTextToSize(`Merenja: ${merTxt}`, pdf.internal.pageSize.getWidth() - MARGIN * 2);
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(8);
    linije.forEach((ln) => { pdf.text(ln, MARGIN, y); y += 4; });
  }
  if (s.upozorenje) y = pdfMetaRed(pdf, y, `Upozorenje: ${s.upozorenje}`);
  y += 2;

  y = pdfSekcijaNaslov(pdf, y, "ODLUKA LOTA (s-metod)");
  y = pdfMetaRed(pdf, y, s.odluka?.tekst || "—", true);
  y = pdfMetaRed(pdf, y, s.odluka?.razlog || "");

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  return { pdf, filename: `TRI-CORE_ISO3951_${datum}.pdf` };
}

export async function preuzmiIso3951Pdf(snapshot) {
  const { pdf, filename } = await kreirajIso3951Pdf(snapshot);
  pdf.save(filename);
  return filename;
}

export function stampajIso3951(snapshot) {
  otvoriStampu(buildIso3951PrintHtml(snapshot));
}
