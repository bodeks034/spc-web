/**
 * PDF i štampa — lista eskalacija.
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

function metaFilter({ filter = "sve", idDeo = "" } = {}) {
  const delovi = [];
  if (idDeo) delovi.push(`Deo: ${idDeo}`);
  if (filter && filter !== "sve") delovi.push(`Status: ${filter}`);
  return delovi.length ? delovi.join(" · ") : "Sve eskalacije";
}

function buildPrintHtml(lista, opts = {}) {
  const rows = lista || [];
  const redovi = rows.map((e) => `<tr>
    <td>${escHtml(e.id_deo || "—")}</td>
    <td>${escHtml(e.prioritet || "—")}</td>
    <td class="${escHtml(e.status || "")}">${escHtml(String(e.status || "—").replace("_", " "))}</td>
    <td>${escHtml(e.opis || "—")}</td>
    <td>${escHtml(e.kreirao?.ime || "—")}</td>
    <td>${escHtml(e.dodeljen?.ime || "—")}</td>
    <td>${escHtml(e.rok || "—")}</td>
    <td>${escHtml(e.korektivna_akcija || "—")}</td>
  </tr>`).join("");

  const naslov = opts.naslov || "Eskalacije";
  const tabelaHtml = `<table>
<thead><tr>
<th>Deo</th><th>Prioritet</th><th>Status</th><th>Opis</th>
<th>Kreirao</th><th>Dodeljen</th><th>Rok</th><th>Korektivna</th>
</tr></thead>
<tbody>${redovi || '<tr><td colspan="8">Nema eskalacija</td></tr>'}</tbody>
</table>`;
  return buildListaFormaHtml({
    naslov,
    podnaslov: metaFilter(opts),
    meta: [
      { label: "Filter", value: metaFilter(opts) },
      { label: "Zapisa", value: rows.length },
    ],
    sekcijaNaslov: "Eskalacije",
    tabelaHtml,
  });
}

async function kreirajPdf(lista, opts = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const rows = lista || [];
  const naslov = opts.naslov || "Eskalacije";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov,
    podnaslov: `${metaFilter(opts)} · ${rows.length} zapisa · ${new Date().toLocaleString("sr-RS")}`,
  });
  y += 3;

  const kolone = [
    { key: "deo", label: "Deo", w: 24 },
    { key: "pri", label: "Prioritet", w: 22 },
    { key: "st", label: "Status", w: 22 },
    { key: "opis", label: "Opis", w: 70 },
    { key: "kr", label: "Kreirao", w: 28 },
    { key: "dod", label: "Dodeljen", w: 28 },
    { key: "rok", label: "Rok", w: 24 },
    { key: "kor", label: "Korektivna", w: 40 },
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

  rows.forEach((e, ri) => {
    const row = {
      deo: e.id_deo || "—",
      pri: e.prioritet || "—",
      st: String(e.status || "—").replace("_", " "),
      opis: e.opis || "—",
      kr: e.kreirao?.ime || "—",
      dod: e.dodeljen?.ime || "—",
      rok: e.rok || "—",
      kor: e.korektivna_akcija || "—",
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
    pdf.text("Nema eskalacija za izabrani filter.", MARGIN, y + 4);
  }

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  return { pdf, filename: `TRI-CORE_Eskalacije_${datum}.pdf` };
}

export async function preuzmiEskalacijePdf(lista, opts = {}) {
  const { pdf, filename } = await kreirajPdf(lista, opts);
  pdf.save(filename);
  return filename;
}

export function stampajEskalacije(lista, opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(lista, opts));
}
