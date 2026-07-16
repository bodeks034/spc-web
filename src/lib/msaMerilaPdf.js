/**
 * PDF i štampa — lista merila / kalibracija (MSA · MERILA).
 */
import { buildListaFormaHtml, otvoriListaFormaStampu } from "./listaFormaDokument.js";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";

const MARGIN = 14;
const DANA_UPOZORENJE = 30;
const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getDani(sledeca) {
  if (!sledeca) return null;
  return Math.ceil((new Date(sledeca) - new Date()) / 86400000);
}

/** Status kalibracije merila — ista logika kao UI panel. */
export function statusMerilaKalibracije(m, danaUpoz = DANA_UPOZORENJE) {
  const kal = [...(m.kalibracije || [])].sort(
    (a, b) => new Date(b.datum_kal) - new Date(a.datum_kal),
  )[0];
  if (!kal) return { label: "NIJE KALIBRISANO", nivo: "isteklo", dani: null, kal: null };
  const dani = getDani(kal.sledeca_kal);
  if (dani === null) return { label: "NEMA DATUMA", nivo: "nepoznato", dani: null, kal };
  if (dani < 0) return { label: `ISTEKLO ${Math.abs(dani)}d`, nivo: "isteklo", dani, kal };
  if (dani < danaUpoz) return { label: `USKORO ${dani}d`, nivo: "uskoro", dani, kal };
  return { label: `OK ${dani}d`, nivo: "ok", dani, kal };
}

export function filtrirajMerila(merila, filter = "sva") {
  return (merila || []).filter((m) => {
    const s = statusMerilaKalibracije(m);
    if (filter === "istekla") return s.dani !== null && s.dani < 0;
    if (filter === "uskoro") return s.dani !== null && s.dani >= 0 && s.dani < DANA_UPOZORENJE;
    return true;
  });
}

function buildPrintHtml(merila, { filter = "sva", naslov = "MSA · Merila / kalibracija" } = {}) {
  const lista = filtrirajMerila(merila, filter);
  const redovi = lista.map((m) => {
    const st = statusMerilaKalibracije(m);
    const cls = st.nivo === "ok" ? "ok" : st.nivo === "uskoro" ? "uskoro" : "isteklo";
    return `<tr>
      <td>${escHtml(m.naziv)}</td>
      <td>${escHtml(m.serijski_broj || "—")}</td>
      <td>${escHtml(m.tip || "—")}</td>
      <td>${escHtml(m.lokacija || "—")}</td>
      <td>${escHtml(st.kal?.datum_kal || "—")}</td>
      <td>${escHtml(st.kal?.sledeca_kal || "—")}</td>
      <td>${escHtml(st.kal?.sertifikat_br || "—")}</td>
      <td class="${cls}">${escHtml(st.label)}</td>
    </tr>`;
  }).join("");

  const tabelaHtml = `<table>
<thead><tr>
<th>Naziv</th><th>S/N</th><th>Tip</th><th>Lokacija</th>
<th>Posl. kal.</th><th>Sledeća</th><th>Cert.</th><th>Status</th>
</tr></thead>
<tbody>${redovi || '<tr><td colspan="8">Nema merila</td></tr>'}</tbody>
</table>`;
  return buildListaFormaHtml({
    naslov,
    meta: [
      { label: "Filter", value: filter },
      { label: "Merila", value: lista.length },
    ],
    sekcijaNaslov: "Merila / kalibracija",
    tabelaHtml,
  });
}

async function kreirajPdf(merila, { filter = "sva", naslov = "MSA · Merila / kalibracija" } = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const lista = filtrirajMerila(merila, filter);
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov,
    podnaslov: `Filter: ${filter} · ${lista.length} merila · ${new Date().toLocaleString("sr-RS")}`,
  });
  y += 3;

  const kolone = [
    { key: "naziv", label: "Naziv", w: 48 },
    { key: "sn", label: "S/N", w: 28 },
    { key: "tip", label: "Tip", w: 28 },
    { key: "lok", label: "Lokacija", w: 28 },
    { key: "posl", label: "Posl. kal.", w: 26 },
    { key: "sled", label: "Sledeća", w: 26 },
    { key: "cert", label: "Cert.", w: 26 },
    { key: "stat", label: "Status", w: 32 },
  ];
  const pageW = pdf.internal.pageSize.getWidth();
  const tabelaW = pageW - MARGIN * 2;
  const lineH = 4;
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

  lista.forEach((m, ri) => {
    const st = statusMerilaKalibracije(m);
    const row = {
      naziv: m.naziv || "—",
      sn: m.serijski_broj || "—",
      tip: m.tip || "—",
      lok: m.lokacija || "—",
      posl: st.kal?.datum_kal || "—",
      sled: st.kal?.sledeca_kal || "—",
      cert: st.kal?.sertifikat_br || "—",
      stat: st.label,
    };
    const cells = kolone.map((k) => pdf.splitTextToSize(String(row[k.key]), Math.max(k.w - 2, 8)));
    const lines = Math.max(...cells.map((c) => c.length), 1);
    const rowH = lines * lineH + 2.5;

    if (y + rowH > 190) {
      pdf.addPage();
      y = MARGIN + 8;
      y = drawHeader(y);
    }

    if (ri % 2 === 0) {
      pdf.setFillColor(...PDF_ALT);
      pdf.rect(MARGIN, y - 3.2, tabelaW, rowH, "F");
    }

    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(7);
    if (st.nivo === "isteklo") pdf.setTextColor(185, 28, 28);
    else if (st.nivo === "uskoro") pdf.setTextColor(161, 98, 7);
    else pdf.setTextColor(...PDF_CRNI);

    let cx = MARGIN + 1.5;
    cells.forEach((linesArr, ci) => {
      if (ci < kolone.length - 1) pdf.setTextColor(...PDF_CRNI);
      else if (st.nivo === "ok") pdf.setTextColor(21, 128, 61);
      linesArr.forEach((ln, li) => pdf.text(ln, cx, y + li * lineH));
      cx += kolone[ci].w;
    });
    pdf.setTextColor(...PDF_CRNI);
    y += rowH;
  });

  if (!lista.length) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(10);
    pdf.text("Nema merila za izabrani filter.", MARGIN, y + 4);
  }

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  return { pdf, filename: `TRI-CORE_MSA_Merila_${filter}_${datum}.pdf` };
}

export async function preuzmiMsaMerilaPdf(merila, opts = {}) {
  const { pdf, filename } = await kreirajPdf(merila, opts);
  pdf.save(filename);
  return filename;
}

export function stampajMsaMerila(merila, opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(merila, opts));
}
