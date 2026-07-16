/**
 * PDF i štampa — kontrolni plan (stavke: deo, pozicija, dimenzija, metoda…).
 */
import { buildListaFormaHtml, otvoriListaFormaStampu } from "./listaFormaDokument.js";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";

const MARGIN = 12;
const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function metaFilter(filterDeo) {
  const d = String(filterDeo || "").trim();
  return d ? `Deo: ${d}` : "Svi delovi";
}

function buildPrintHtml(planovi, { filterDeo = "", naslov = "Kontrolni plan" } = {}) {
  const lista = planovi || [];
  const redovi = lista.map((p) => `<tr>
    <td>${escHtml(p.id_deo)}</td>
    <td>${escHtml(p.pogon_kod || "—")}</td>
    <td>${escHtml(p.pozicija || "—")}</td>
    <td>${escHtml(p.dimenzija || "—")}</td>
    <td>${escHtml(p.metoda || "—")}</td>
    <td>${escHtml(p.ucestalost || "—")}</td>
    <td>${escHtml(p.reakcija || "—")}</td>
    <td>${escHtml(p.revizija || "—")}</td>
    <td>${escHtml(p.vazi_od || "—")}</td>
  </tr>`).join("");

  const tabelaHtml = `<table>
<thead><tr>
<th>Deo</th><th>Pogon</th><th>Pozicija</th><th>Dimenzija</th>
<th>Metoda</th><th>Učestalost</th><th>Reakcija</th><th>Rev.</th><th>Važi od</th>
</tr></thead>
<tbody>${redovi || '<tr><td colspan="9">Nema stavki</td></tr>'}</tbody>
</table>`;
  return buildListaFormaHtml({
    naslov,
    podnaslov: metaFilter(filterDeo),
    meta: [
      { label: "Filter", value: metaFilter(filterDeo) },
      { label: "Stavki", value: lista.length },
    ],
    sekcijaNaslov: "Stavke plana",
    tabelaHtml,
  });
}

async function kreirajPdf(planovi, { filterDeo = "", naslov = "Kontrolni plan" } = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const lista = planovi || [];
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov,
    podnaslov: `${metaFilter(filterDeo)} · ${lista.length} stavki · ${new Date().toLocaleString("sr-RS")}`,
  });
  y += 3;

  const kolone = [
    { key: "deo", label: "Deo", w: 28 },
    { key: "pogon", label: "Pogon", w: 18 },
    { key: "poz", label: "Pozicija", w: 28 },
    { key: "dim", label: "Dimenzija", w: 36 },
    { key: "met", label: "Metoda", w: 32 },
    { key: "uc", label: "Učestalost", w: 28 },
    { key: "reak", label: "Reakcija", w: 48 },
    { key: "rev", label: "Rev.", w: 12 },
    { key: "vazi", label: "Važi od", w: 22 },
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

  lista.forEach((p, ri) => {
    const row = {
      deo: p.id_deo || "—",
      pogon: p.pogon_kod || "—",
      poz: p.pozicija || "—",
      dim: p.dimenzija || "—",
      met: p.metoda || "—",
      uc: p.ucestalost || "—",
      reak: p.reakcija || "—",
      rev: p.revizija || "—",
      vazi: p.vazi_od || "—",
    };
    const cells = kolone.map((k) => pdf.splitTextToSize(String(row[k.key]), Math.max(k.w - 2, 6)));
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

  if (!lista.length) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(10);
    pdf.text("Nema stavki kontrolnog plana.", MARGIN, y + 4);
  }

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  const deoTag = String(filterDeo || "").trim().toUpperCase() || "svi";
  return { pdf, filename: `TRI-CORE_KontrolniPlan_${deoTag}_${datum}.pdf` };
}

export async function preuzmiKontrolniPlanPdf(planovi, opts = {}) {
  const { pdf, filename } = await kreirajPdf(planovi, opts);
  pdf.save(filename);
  return filename;
}

export function stampajKontrolniPlan(planovi, opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(planovi, opts));
}
