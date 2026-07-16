/**
 * PDF i štampa — lista NCR / CAPA.
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

function metaFilter(opts = {}) {
  const delovi = [];
  if (opts.filterDeo) delovi.push(`Deo: ${opts.filterDeo}`);
  if (opts.filter && opts.filter !== "sve") delovi.push(`Filter: ${opts.filter}`);
  if (opts.filterPrioritet) delovi.push(`Prioritet: ${opts.filterPrioritet}`);
  return delovi.length ? delovi.join(" · ") : "Svi NCR / CAPA";
}

function buildPrintHtml(lista, opts = {}) {
  const rows = lista || [];
  const redovi = rows.map((n) => `<tr>
    <td>${escHtml(n.broj_ncr || "—")}</td>
    <td>${escHtml(n.id_deo || "—")}</td>
    <td>${escHtml(n.status || "—")}</td>
    <td>${escHtml(n.prioritet || "—")}</td>
    <td>${escHtml(n.opis || "—")}</td>
    <td>${escHtml(n.uzrok || "—")}</td>
    <td>${escHtml(n.korektivna || "—")}</td>
    <td>${escHtml(n.rok || "—")}</td>
    <td>${escHtml(n.radni_nalog || n.serija || "—")}</td>
  </tr>`).join("");

  const naslov = opts.naslov || "NCR / CAPA";
  const tabelaHtml = `<table>
<thead><tr>
<th>Broj NCR</th><th>Deo</th><th>Status</th><th>Prioritet</th>
<th>Opis</th><th>Uzrok</th><th>Korektivna</th><th>Rok</th><th>RN / serija</th>
</tr></thead>
<tbody>${redovi || '<tr><td colspan="9">Nema NCR zapisa</td></tr>'}</tbody>
</table>`;
  return buildListaFormaHtml({
    naslov,
    podnaslov: metaFilter(opts),
    meta: [
      { label: "Filter", value: metaFilter(opts) },
      { label: "Zapisa", value: rows.length },
    ],
    sekcijaNaslov: "NCR / CAPA",
    tabelaHtml,
  });
}

async function kreirajPdf(lista, opts = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const rows = lista || [];
  const naslov = opts.naslov || "NCR / CAPA";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov,
    podnaslov: `${metaFilter(opts)} · ${rows.length} zapisa · ${new Date().toLocaleString("sr-RS")}`,
  });
  y += 3;

  const kolone = [
    { key: "br", label: "Broj NCR", w: 28 },
    { key: "deo", label: "Deo", w: 22 },
    { key: "st", label: "Status", w: 22 },
    { key: "pri", label: "Prioritet", w: 20 },
    { key: "opis", label: "Opis", w: 48 },
    { key: "uz", label: "Uzrok", w: 36 },
    { key: "kor", label: "Korektivna", w: 40 },
    { key: "rok", label: "Rok", w: 22 },
    { key: "rn", label: "RN/serija", w: 24 },
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
      br: n.broj_ncr || "—",
      deo: n.id_deo || "—",
      st: n.status || "—",
      pri: n.prioritet || "—",
      opis: n.opis || "—",
      uz: n.uzrok || "—",
      kor: n.korektivna || "—",
      rok: n.rok || "—",
      rn: n.radni_nalog || n.serija || "—",
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
    pdf.text("Nema NCR zapisa za izabrani filter.", MARGIN, y + 4);
  }

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  return { pdf, filename: `TRI-CORE_NCR_CAPA_${datum}.pdf` };
}

export async function preuzmiNcrCapaPdf(lista, opts = {}) {
  const { pdf, filename } = await kreirajPdf(lista, opts);
  pdf.save(filename);
  return filename;
}

export function stampajNcrCapa(lista, opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(lista, opts));
}
