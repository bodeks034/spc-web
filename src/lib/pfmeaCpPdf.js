/**
 * PDF izvoz PFMEA / Control Plan — A4 pejzaž, kartica po stavci (čitljivo na štampaču).
 * RPN Summary — A4 portret, kompaktna tabela.
 */

import { jsPDF } from "jspdf";
import {
  PFMEA_EDIT_KOLONE,
  CP_EDIT_KOLONE,
  RPN_SUMMARY_KOLONE,
  izracunajRpnSummary,
} from "./pfmeaControlPlan.js";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";

const MARGIN = 14;
const LABEL_W = 54;
const LINE_H = 4.1;
const FONT_LABEL = 8;
const FONT_VALUE = 8.5;

function pageSize(pdf) {
  return {
    w: pdf.internal.pageSize.getWidth(),
    h: pdf.internal.pageSize.getHeight(),
  };
}

function dodajStranu(pdf, orijentacija) {
  pdf.addPage("a4", orijentacija === "l" ? "l" : "p");
}

function vrednostPolja(red, key) {
  const v = red?.[key];
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v).replace(/\n/g, " ").trim();
}

function docMetaTekst(doc) {
  return [
    doc.idDeo ? `Deo: ${doc.idDeo}` : null,
    doc.revizija ? `Revizija: ${doc.revizija}` : null,
    doc.naziv || null,
    `Datum: ${new Date().toLocaleDateString("sr-RS")}`,
  ].filter(Boolean).join("  ·  ");
}

function visinaPolja(pdf, tekst, valueW) {
  const lines = pdf.splitTextToSize(tekst, valueW);
  return Math.max(7, lines.length * LINE_H + 5);
}

function crtajPolje(pdf, y, label, tekst) {
  const { w } = pageSize(pdf);
  const valueW = w - MARGIN * 2 - LABEL_W - 2;
  const xVal = MARGIN + LABEL_W;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(FONT_LABEL);
  pdf.setTextColor(70, 80, 95);
  const labelLines = pdf.splitTextToSize(label, LABEL_W - 2);
  labelLines.forEach((ln, i) => pdf.text(ln, MARGIN, y + i * LINE_H));

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(FONT_VALUE);
  pdf.setTextColor(20, 25, 35);
  const valueLines = pdf.splitTextToSize(tekst, valueW);
  valueLines.forEach((ln, i) => pdf.text(ln, xVal, y + i * LINE_H));

  const h = Math.max(labelLines.length, valueLines.length) * LINE_H + 5;
  pdf.setDrawColor(230, 234, 240);
  pdf.line(MARGIN, y + h - 2, w - MARGIN, y + h - 2);
  return y + h;
}

function crtajNaslovKartice(pdf, y, tip, idx, total) {
  const { w } = pageSize(pdf);
  pdf.setFillColor(236, 242, 250);
  pdf.rect(MARGIN, y, w - MARGIN * 2, 9, "F");
  pdf.setDrawColor(44, 82, 130);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, MARGIN, y + 9);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(44, 82, 130);
  pdf.text(`${tip} — stavka ${idx + 1} / ${total}`, MARGIN + 3, y + 6);
  return y + 12;
}

function trebaNovaLandscapeStrana(pdf, { idxStavke, nastavak, pocniNovuStranu }) {
  const onPortrait = pageSize(pdf).w < pageSize(pdf).h;
  if (onPortrait) return true;
  if (nastavak > 0) return true;
  if (idxStavke > 0) return true;
  if (idxStavke === 0 && nastavak === 0 && !pocniNovuStranu) return false;
  return pocniNovuStranu && pdf.getNumberOfPages() > 0;
}

/**
 * Jedna stavka = jedna (ili više nastavnih) A4 pejzaž strana, sva polja vertikalno.
 */
async function renderKarticeStavki(pdf, {
  tip,
  redovi,
  kolone,
  meta,
  pocniNovuStranu = true,
  naslovPaketa,
}) {
  if (!redovi.length) return;

  for (let i = 0; i < redovi.length; i++) {
    const red = redovi[i];
    let y = null;
    let nastavak = 0;
    let kolIdx = 0;

    while (kolIdx < kolone.length) {
      const { h: pageH } = pageSize(pdf);
      const maxY = pageH - 14;
      const naslov = nastavak === 0
        ? (naslovPaketa && i === 0 ? naslovPaketa : `${tip} (${redovi.length} stavki)`)
        : `${tip} — stavka ${i + 1} (nastavak)`;
      const podnaslov = nastavak === 0
        ? `${meta}  ·  stavka ${i + 1}/${redovi.length}`
        : meta;

      if (y === null) {
        if (trebaNovaLandscapeStrana(pdf, { idxStavke: i, nastavak, pocniNovuStranu })) {
          dodajStranu(pdf, "l");
        }
        y = await dodajPdfBrendZaglavlje(pdf, { naslov, podnaslov });
        y += 4;
        if (nastavak === 0) y = crtajNaslovKartice(pdf, y, tip, i, redovi.length);
        else {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(9);
          pdf.setTextColor(100, 110, 125);
          pdf.text(`Nastavak stavke ${i + 1}`, MARGIN, y + 4);
          y += 10;
        }
      }

      while (kolIdx < kolone.length) {
        const kol = kolone[kolIdx];
        const tekst = vrednostPolja(red, kol.key);
        const valueW = pageSize(pdf).w - MARGIN * 2 - LABEL_W - 2;
        const potrebno = visinaPolja(pdf, tekst, valueW);

        if (y + potrebno > maxY) break;

        y = crtajPolje(pdf, y, kol.label, tekst);
        kolIdx += 1;
      }

      dodajPdfBrendPodnozje(pdf);
      y = null;
      nastavak += 1;
    }
  }
}

function crtajRpnTabeluSadrzaj(pdf, rpn, startY) {
  const kolone = RPN_SUMMARY_KOLONE;
  const { w, h } = pageSize(pdf);
  const usableW = w - MARGIN * 2;
  const colW = usableW / kolone.length;
  let y = startY;

  pdf.setDrawColor(44, 82, 130);
  pdf.setFillColor(236, 242, 250);
  pdf.rect(MARGIN, y - 4, usableW, 7, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(30, 40, 55);
  kolone.forEach((k, i) => {
    const label = k.label.length > 14 ? `${k.label.slice(0, 13)}…` : k.label;
    pdf.text(label, MARGIN + i * colW + 1, y);
  });
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(15, 23, 42);
  const maxY = h - 14;

  for (const r of rpn) {
    if (y > maxY) {
      dodajPdfBrendPodnozje(pdf);
      dodajStranu(pdf, "p");
      y = 24;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(44, 82, 130);
      pdf.text("RPN Summary (nastavak)", MARGIN, y);
      y += 8;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
    }

    let maxLines = 1;
    const cells = kolone.map((k) => {
      const txt = vrednostPolja(r, k.key);
      const lines = pdf.splitTextToSize(txt, colW - 2);
      maxLines = Math.max(maxLines, lines.length);
      return lines;
    });

    const rowH = Math.max(5, maxLines * 3.8 + 2);
    kolone.forEach((_, i) => {
      cells[i].forEach((ln, li) => pdf.text(ln, MARGIN + i * colW + 1, y + li * 3.8));
    });
    pdf.setDrawColor(220, 225, 232);
    pdf.line(MARGIN, y + rowH - 1, MARGIN + usableW, y + rowH - 1);
    y += rowH;
  }

  return y;
}

function crtajRpnTabelu(pdf, rpn, meta) {
  dodajStranu(pdf, "p");
  const kolone = RPN_SUMMARY_KOLONE;
  const { w } = pageSize(pdf);
  const usableW = w - MARGIN * 2;

  let y = 28;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(44, 82, 130);
  pdf.text(`RPN Summary (${rpn.length})`, MARGIN, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(70, 78, 90);
  const metaLines = pdf.splitTextToSize(meta, usableW);
  metaLines.forEach((ln, i) => pdf.text(ln, MARGIN, y + i * 4));
  y += metaLines.length * 4 + 6;

  y = crtajRpnTabeluSadrzaj(pdf, rpn, y);
  dodajPdfBrendPodnozje(pdf);
}

/**
 * Samo RPN sažetak + napomena o Excelu (za PDF paket sa 8D).
 */
export async function dodajRpnSummaryUPdf(pdf, doc) {
  const pfmeaRedovi = doc?.pfmeaRedovi || doc?.pfmea?.redovi || [];
  const rpn = doc?.rpnSummary?.length ? doc.rpnSummary : izracunajRpnSummary(pfmeaRedovi);
  const meta = doc ? docMetaTekst(doc) : "PFMEA/CP nije povezan";
  const { w } = pageSize(pdf);

  dodajStranu(pdf, "p");
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "RPN Summary (sažetak)",
    podnaslov: meta,
  });
  y += 8;

  if (rpn.length) {
    y = crtajRpnTabeluSadrzaj(pdf, rpn, y);
    y += 8;
  } else {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 90, 105);
    pdf.text("Nema RPN stavki — popunite S, O i D u PFMEA modulu.", MARGIN, y + 2);
    y += 14;
  }

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8.5);
  pdf.setTextColor(60, 70, 85);
  const nap = pdf.splitTextToSize(
    "Pun PFMEA i Control Plan (široka matrica) nije u PDF paketu. "
    + "Kompletan dokument izvezite iz modula PFMEA / CP — dugme Excel.",
    w - MARGIN * 2,
  );
  nap.forEach((ln, i) => pdf.text(ln, MARGIN, y + 4 + i * 4.5));
  dodajPdfBrendPodnozje(pdf);
  return pdf;
}

/**
 * Dodaje PFMEA (pejzaž kartice) + CP (pejzaž kartice) + RPN (portret tabela) u postojeći PDF.
 */
export async function dodajPfmeaCpUSadrzajPdf(pdf, doc, { naslovPaketa, novaStrana = true } = {}) {
  const pfmeaRedovi = doc.pfmeaRedovi || doc.pfmea?.redovi || [];
  const cpRedovi = doc.cpRedovi || doc.controlPlan?.redovi || [];
  const rpn = doc.rpnSummary?.length ? doc.rpnSummary : izracunajRpnSummary(pfmeaRedovi);
  const meta = docMetaTekst(doc);

  await renderKarticeStavki(pdf, {
    tip: "PFMEA",
    redovi: pfmeaRedovi,
    kolone: PFMEA_EDIT_KOLONE,
    meta,
    pocniNovuStranu: novaStrana,
    naslovPaketa: naslovPaketa || undefined,
  });

  await renderKarticeStavki(pdf, {
    tip: "Control Plan",
    redovi: cpRedovi,
    kolone: CP_EDIT_KOLONE,
    meta,
    pocniNovuStranu: true,
  });

  if (rpn.length) {
    crtajRpnTabelu(pdf, rpn, meta);
  } else if (!pfmeaRedovi.length && !cpRedovi.length) {
    dodajStranu(pdf, "p");
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(11);
    pdf.text("Nema PFMEA / CP / RPN stavki.", MARGIN, 36);
    dodajPdfBrendPodnozje(pdf);
  }

  return pdf;
}

export async function exportPfmeaCpPdf(doc, { preuzmi = true, imeFajla } = {}) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await dodajPfmeaCpUSadrzajPdf(pdf, doc, { naslovPaketa: "PFMEA / Control Plan", novaStrana: false });

  const fname = (imeFajla || doc.naziv || "PFMEA_ControlPlan").replace(/[^\w\s\-./čćšđžČĆŠĐŽ]+/g, "_").slice(0, 80);
  if (preuzmi) pdf.save(fname.endsWith(".pdf") ? fname : `${fname}.pdf`);
  return pdf;
}

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tabelaHtml(naslov, kolone, redovi) {
  const th = kolone.map((k) => `<th>${escHtml(k.label)}</th>`).join("");
  const body = (redovi || []).map((r) => {
    const tds = kolone.map((k) => `<td>${escHtml(vrednostPolja(r, k.key))}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  return `<h2>${escHtml(naslov)}</h2>
<table><thead><tr>${th}</tr></thead>
<tbody>${body || `<tr><td colspan="${kolone.length}">Nema stavki</td></tr>`}</tbody></table>`;
}

/** Otvara prozor za štampu — tabele PFMEA + CP + RPN. */
export function stampajPfmeaCp(doc, { naslov = "PFMEA / Control Plan" } = {}) {
  const pfmeaRedovi = doc.pfmeaRedovi || doc.pfmea?.redovi || [];
  const cpRedovi = doc.cpRedovi || doc.controlPlan?.redovi || [];
  const rpn = doc.rpnSummary?.length ? doc.rpnSummary : izracunajRpnSummary(pfmeaRedovi);
  const meta = docMetaTekst(doc);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escHtml(naslov)}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;font-size:9px;color:#1a1a1a;margin:16px;}
  h1{font-size:15px;color:#2c5282;margin:0 0 4px;}
  h2{font-size:12px;color:#1a365d;margin:18px 0 6px;page-break-after:avoid;}
  .meta{color:#555;margin-bottom:12px;}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;page-break-inside:auto;}
  th,td{border:1px solid #ccc;padding:4px 5px;text-align:left;vertical-align:top;}
  th{background:#1c2333;color:#fff;font-size:7px;}
  tr:nth-child(even){background:#e8eef6;}
  tr{page-break-inside:avoid;}
  @media print{body{margin:8mm;} th{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
</style></head><body>
<h1>${escHtml(naslov)}${doc.naziv ? ` — ${escHtml(doc.naziv)}` : ""}</h1>
<div class="meta">${escHtml(meta)} · PFMEA: ${pfmeaRedovi.length} · CP: ${cpRedovi.length} · RPN: ${rpn.length}</div>
${tabelaHtml("PFMEA", PFMEA_EDIT_KOLONE, pfmeaRedovi)}
${tabelaHtml("Control Plan", CP_EDIT_KOLONE, cpRedovi)}
${rpn.length ? tabelaHtml("RPN Summary", RPN_SUMMARY_KOLONE, rpn) : ""}
</body></html>`;

  const win = window.open("", "_blank", "width=1100,height=750");
  if (!win) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}
