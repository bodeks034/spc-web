/**
 * PDF i štampa — radni nalozi (ERP).
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

function metaFilter(filter = "svi") {
  if (!filter || filter === "svi") return "Svi nalozi";
  return `Status: ${filter}`;
}

function buildPrintHtml(nalozi, opts = {}) {
  const rows = nalozi || [];
  const naslov = opts.naslov || "Radni nalozi (ERP)";
  const redovi = rows.map((n) => `<tr>
    <td>${escHtml(n.broj_naloga || "—")}</td>
    <td>${escHtml(n.id_deo || "—")}</td>
    <td>${escHtml(n.naziv_dela || "—")}</td>
    <td>${escHtml(n.pogon_kod || "—")}</td>
    <td>${escHtml(n.kolicina ?? "—")}</td>
    <td>${escHtml(n.kupac || "—")}</td>
    <td>${escHtml(n.rok_isporuke || "—")}</td>
    <td class="${escHtml(n.status || "")}">${escHtml(String(n.status || "—").toUpperCase())}</td>
    <td>${escHtml(n.napomena || "—")}</td>
  </tr>`).join("");

  const tabelaHtml = `<table>
<thead><tr>
<th>Broj naloga</th><th>ID dela</th><th>Naziv</th><th>Pogon</th>
<th>Kol.</th><th>Kupac</th><th>Rok</th><th>Status</th><th>Napomena</th>
</tr></thead>
<tbody>${redovi || '<tr><td colspan="9">Nema naloga</td></tr>'}</tbody>
</table>`;
  return buildListaFormaHtml({
    naslov,
    podnaslov: metaFilter(opts.filter),
    meta: [
      { label: "Filter", value: metaFilter(opts.filter) },
      { label: "Zapisa", value: rows.length },
    ],
    sekcijaNaslov: "Radni nalozi",
    tabelaHtml,
  });
}

async function kreirajPdf(nalozi, opts = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const rows = nalozi || [];
  const naslov = opts.naslov || "Radni nalozi (ERP)";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov,
    podnaslov: `${metaFilter(opts.filter)} · ${rows.length} zapisa · ${new Date().toLocaleString("sr-RS")}`,
  });
  y += 3;

  const kolone = [
    { key: "br", label: "Broj naloga", w: 36 },
    { key: "deo", label: "ID dela", w: 24 },
    { key: "naz", label: "Naziv", w: 48 },
    { key: "pog", label: "Pogon", w: 16 },
    { key: "kol", label: "Kol.", w: 18 },
    { key: "kup", label: "Kupac", w: 36 },
    { key: "rok", label: "Rok", w: 24 },
    { key: "st", label: "Status", w: 22 },
    { key: "nap", label: "Napomena", w: 38 },
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

  rows.forEach((n, ri) => {
    const row = {
      br: n.broj_naloga || "—",
      deo: n.id_deo || "—",
      naz: n.naziv_dela || "—",
      pog: n.pogon_kod || "—",
      kol: n.kolicina ?? "—",
      kup: n.kupac || "—",
      rok: n.rok_isporuke || "—",
      st: String(n.status || "—").toUpperCase(),
      nap: n.napomena || "—",
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

  if (!rows.length) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(10);
    pdf.text("Nema radnih naloga za izabrani filter.", MARGIN, y + 4);
  }

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  const tag = String(opts.filter || "svi");
  return { pdf, filename: `TRI-CORE_RadniNalozi_${tag}_${datum}.pdf` };
}

export async function preuzmiRadniNaloziPdf(nalozi, opts = {}) {
  const { pdf, filename } = await kreirajPdf(nalozi, opts);
  pdf.save(filename);
  return filename;
}

export function stampajRadniNalozi(nalozi, opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(nalozi, opts));
}
