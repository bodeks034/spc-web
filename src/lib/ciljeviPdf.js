/**
 * PDF i štampa — ciljevi kvaliteta (FPY / DPMO / p) + ostvareno.
 */
import { buildListaFormaHtml, otvoriListaFormaStampu } from "./listaFormaDokument.js";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";
import { LAB_FPY_PCT } from "./rtyFpy.js";

const MARGIN = 12;
const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function redoviZaIzvoz(ciljevi, ostvaren = {}) {
  return (ciljevi || []).map((c) => {
    const ost = ostvaren[c.id_deo] || {};
    return {
      id_deo: c.id_deo || "—",
      vazi_od: c.vazi_od || "—",
      rty_cilj: c.rty_cilj ?? "—",
      rty_ost: ost.rty ?? "—",
      dpmo_cilj: c.dpmo_cilj ?? "—",
      dpmo_ost: ost.dpmo ?? "—",
      p_cilj: c.p_cilj ?? "—",
      p_ost: ost.p ?? "—",
      napomena: c.napomena || "—",
    };
  });
}

function buildPrintHtml(ciljevi, opts = {}) {
  const rows = redoviZaIzvoz(ciljevi, opts.ostvaren);
  const naslov = opts.naslov || "Ciljevi kvaliteta";
  const redovi = rows.map((r) => `<tr>
    <td>${escHtml(r.id_deo)}</td>
    <td>${escHtml(r.vazi_od)}</td>
    <td>${escHtml(r.rty_cilj)}</td>
    <td>${escHtml(r.rty_ost)}</td>
    <td>${escHtml(r.dpmo_cilj)}</td>
    <td>${escHtml(r.dpmo_ost)}</td>
    <td>${escHtml(r.p_cilj)}</td>
    <td>${escHtml(r.p_ost)}</td>
    <td>${escHtml(r.napomena)}</td>
  </tr>`).join("");

  const tabelaHtml = `<table>
<thead><tr>
<th>Deo</th><th>Važi od</th>
<th>${escHtml(LAB_FPY_PCT)} cilj</th><th>${escHtml(LAB_FPY_PCT)} ost.</th>
<th>DPMO cilj</th><th>DPMO ost.</th>
<th>p % cilj</th><th>p % ost.</th>
<th>Napomena</th>
</tr></thead>
<tbody>${redovi || '<tr><td colspan="9">Nema ciljeva</td></tr>'}</tbody>
</table>`;
  return buildListaFormaHtml({
    naslov,
    meta: [
      { label: "Zapisa", value: rows.length },
    ],
    sekcijaNaslov: "Ciljevi kvaliteta",
    tabelaHtml,
    napomena: "Ostvareno: poslednjih 30 dana",
  });
}

async function kreirajPdf(ciljevi, opts = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const rows = redoviZaIzvoz(ciljevi, opts.ostvaren);
  const naslov = opts.naslov || "Ciljevi kvaliteta";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov,
    podnaslov: `${rows.length} zapisa · ostvareno 30d · ${new Date().toLocaleString("sr-RS")}`,
  });
  y += 3;

  const kolone = [
    { key: "id_deo", label: "Deo", w: 28 },
    { key: "vazi_od", label: "Važi od", w: 24 },
    { key: "rty_cilj", label: `${LAB_FPY_PCT} cilj`, w: 26 },
    { key: "rty_ost", label: `${LAB_FPY_PCT} ost.`, w: 26 },
    { key: "dpmo_cilj", label: "DPMO cilj", w: 26 },
    { key: "dpmo_ost", label: "DPMO ost.", w: 26 },
    { key: "p_cilj", label: "p% cilj", w: 22 },
    { key: "p_ost", label: "p% ost.", w: 22 },
    { key: "napomena", label: "Napomena", w: 52 },
  ];
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const tabelaW = pageW - MARGIN * 2;
  const lineH = 3.6;
  const headerH = 6.5;

  const drawHeader = (atY) => {
    pdf.setFillColor(28, 35, 51);
    pdf.rect(MARGIN, atY - 4, tabelaW, headerH, "F");
    pdf.setTextColor(...PDF_BELO);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(6.5);
    let cx = MARGIN + 1.2;
    for (const k of kolone) {
      pdf.text(k.label, cx, atY);
      cx += k.w;
    }
    pdf.setTextColor(...PDF_CRNI);
    return atY + headerH - 1;
  };

  y = drawHeader(y);

  rows.forEach((r, ri) => {
    const cells = kolone.map((k) => pdf.splitTextToSize(String(r[k.key]), Math.max(k.w - 2, 6)));
    const lines = Math.max(...cells.map((c) => c.length), 1);
    const rowH = lines * lineH + 2;

    if (y + rowH > pageH - 16) {
      pdf.addPage();
      y = MARGIN + 8;
      y = drawHeader(y);
    }

    if (ri % 2 === 0) {
      pdf.setFillColor(...PDF_ALT);
      pdf.rect(MARGIN, y - 3, tabelaW, rowH, "F");
    }

    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...PDF_CRNI);
    let cx = MARGIN + 1.2;
    cells.forEach((linesArr, ci) => {
      linesArr.forEach((ln, li) => pdf.text(ln, cx, y + li * lineH));
      cx += kolone[ci].w;
    });
    y += rowH;
  });

  if (!rows.length) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(10);
    pdf.text("Nema postavljenih ciljeva.", MARGIN, y + 4);
  }

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  const tag = (opts.prefiks || "Ciljevi").replace(/[^\w\-]+/g, "_");
  return { pdf, filename: `TRI-CORE_${tag}_${datum}.pdf` };
}

export async function preuzmiCiljeviPdf(ciljevi, opts = {}) {
  const { pdf, filename } = await kreirajPdf(ciljevi, opts);
  pdf.save(filename);
  return filename;
}

export function stampajCiljevi(ciljevi, opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(ciljevi, opts));
}
