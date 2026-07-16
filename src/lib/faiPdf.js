/**
 * PDF i štampa — FAI zapisi na čekanju (prvo parče).
 */
import { buildListaFormaHtml, otvoriListaFormaStampu } from "./listaFormaDokument.js";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";
import { faiImaNok, formatFaiKreirao } from "./faiWorkflow.js";

const MARGIN = 12;
const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function merenjaHtml(merenja) {
  const rows = (merenja || []).map((m) => {
    const nok = String(m.status || "").toUpperCase() === "NOK";
    return `<tr>
      <td>${escHtml(m.pozicija || "—")}</td>
      <td>${escHtml(m.vrednost ?? "—")}</td>
      <td class="${nok ? "nok" : "ok"}">${escHtml(m.status || "—")}</td>
    </tr>`;
  }).join("");
  return `<table><thead><tr><th>Pozicija</th><th>Vrednost</th><th>Status</th></tr></thead>
<tbody>${rows || '<tr><td colspan="3">Nema merenja</td></tr>'}</tbody></table>`;
}

function buildPrintHtml(lista, opts = {}) {
  const rows = lista || [];
  const naslov = opts.naslov || "FAI na čekanju";
  const kartice = rows.map((rec) => {
    const imaNok = faiImaNok(rec.merenja_json);
    return `<div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;margin-bottom:14px;page-break-inside:avoid;">
      <h2 style="font-size:12px;margin:0 0 4px;color:#1e293b;">${escHtml(rec.id_deo || "—")}
        <span style="color:${imaNok ? "#b91c1c" : "#15803d"};font-weight:700;"> · ${imaNok ? "IMA NOK" : "ČEKA"}</span>
      </h2>
      <div style="color:#64748b;margin-bottom:8px;font-size:9pt;">Smena ${escHtml(rec.smena ?? "—")}
        ${rec.radni_nalog ? ` · RN ${escHtml(rec.radni_nalog)}` : ""}
        ${rec.pogon_kod ? ` · ${escHtml(rec.pogon_kod)}` : ""}
        · Uneto: ${escHtml(formatFaiKreirao(rec))}
        · ${escHtml(rec.created_at ? new Date(rec.created_at).toLocaleString("sr-RS") : "—")}
      </div>
      ${rec.komentar ? `<div style="color:#64748b;margin-bottom:8px;">Komentar: ${escHtml(rec.komentar)}</div>` : ""}
      ${merenjaHtml(rec.merenja_json)}
    </div>`;
  }).join("");

  return buildListaFormaHtml({
    naslov,
    meta: [{ label: "Zapisa", value: rows.length }],
    sekcijaNaslov: "FAI zapisi",
    tabelaHtml: kartice || "<p>Nema FAI zapisa.</p>",
  });
}

async function kreirajPdf(lista, opts = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const rows = lista || [];
  const naslov = opts.naslov || "FAI na čekanju";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov,
    podnaslov: `${rows.length} zapisa · ${new Date().toLocaleString("sr-RS")}`,
  });
  y += 2;

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const lineH = 4;

  const novaStranaAkoTreba = (need) => {
    if (y + need > pageH - 16) {
      pdf.addPage();
      y = MARGIN + 8;
    }
  };

  if (!rows.length) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(10);
    pdf.text("Nema FAI zapisa na čekanju.", MARGIN, y + 4);
  }

  rows.forEach((rec, idx) => {
    const merenja = rec.merenja_json || [];
    const imaNok = faiImaNok(merenja);
    const headerNeed = 22 + (rec.komentar ? 6 : 0) + 8;
    novaStranaAkoTreba(headerNeed);

    if (idx > 0) y += 3;

    pdf.setFillColor(236, 242, 250);
    pdf.rect(MARGIN, y - 3, contentW, 8, "F");
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...PDF_CRNI);
    pdf.text(String(rec.id_deo || "—"), MARGIN + 2, y + 2);
    pdf.setFontSize(8);
    if (imaNok) pdf.setTextColor(185, 28, 28);
    else pdf.setTextColor(161, 98, 7);
    pdf.text(imaNok ? "IMA NOK" : "ČEKA", pageW - MARGIN - 22, y + 2);
    y += 8;

    pdf.setTextColor(...PDF_CRNI);
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(8);
    const meta = [
      `Smena ${rec.smena ?? "—"}`,
      rec.radni_nalog ? `RN ${rec.radni_nalog}` : null,
      rec.pogon_kod || null,
      `Uneto: ${formatFaiKreirao(rec)}`,
      rec.created_at ? new Date(rec.created_at).toLocaleString("sr-RS") : null,
    ].filter(Boolean).join(" · ");
    const metaLines = pdf.splitTextToSize(meta, contentW - 2);
    metaLines.forEach((ln) => {
      novaStranaAkoTreba(lineH);
      pdf.text(ln, MARGIN, y);
      y += lineH;
    });

    if (rec.komentar) {
      novaStranaAkoTreba(lineH);
      pdf.setTextColor(161, 98, 7);
      const kom = pdf.splitTextToSize(`Komentar: ${rec.komentar}`, contentW - 2);
      kom.forEach((ln) => {
        novaStranaAkoTreba(lineH);
        pdf.text(ln, MARGIN, y);
        y += lineH;
      });
      pdf.setTextColor(...PDF_CRNI);
    }

    y += 2;
    const kolone = [
      { key: "poz", label: "Pozicija", w: 90 },
      { key: "vr", label: "Vrednost", w: 45 },
      { key: "st", label: "Status", w: 35 },
    ];
    const tabelaW = kolone.reduce((s, k) => s + k.w, 0);
    const headerH = 6;

    novaStranaAkoTreba(headerH + 8);
    pdf.setFillColor(28, 35, 51);
    pdf.rect(MARGIN, y - 3.5, Math.min(tabelaW, contentW), headerH, "F");
    pdf.setTextColor(...PDF_BELO);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(7);
    let cx = MARGIN + 1;
    for (const k of kolone) {
      pdf.text(k.label, cx, y);
      cx += k.w;
    }
    y += headerH;
    pdf.setTextColor(...PDF_CRNI);

    if (!merenja.length) {
      pdf.setFont(PDF_FONT_SR, "italic");
      pdf.setFontSize(8);
      pdf.text("Nema merenja.", MARGIN, y + 2);
      y += 6;
    } else {
      merenja.forEach((m, mi) => {
        const row = {
          poz: m.pozicija || "—",
          vr: m.vrednost ?? "—",
          st: m.status || "—",
        };
        const cells = kolone.map((k) => pdf.splitTextToSize(String(row[k.key]), Math.max(k.w - 2, 8)));
        const lines = Math.max(...cells.map((c) => c.length), 1);
        const rowH = lines * 3.5 + 2;
        novaStranaAkoTreba(rowH);
        if (mi % 2 === 0) {
          pdf.setFillColor(...PDF_ALT);
          pdf.rect(MARGIN, y - 2.8, Math.min(tabelaW, contentW), rowH, "F");
        }
        pdf.setFont(PDF_FONT_SR, "normal");
        pdf.setFontSize(7);
        let x = MARGIN + 1;
        cells.forEach((linesArr, ci) => {
          if (ci === 2 && String(row.st).toUpperCase() === "NOK") pdf.setTextColor(185, 28, 28);
          else pdf.setTextColor(...PDF_CRNI);
          linesArr.forEach((ln, li) => pdf.text(ln, x, y + li * 3.5));
          x += kolone[ci].w;
        });
        pdf.setTextColor(...PDF_CRNI);
        y += rowH;
      });
    }
    y += 4;
  });

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  return { pdf, filename: `TRI-CORE_FAI_${datum}.pdf` };
}

export async function preuzmiFaiPdf(lista, opts = {}) {
  const { pdf, filename } = await kreirajPdf(lista, opts);
  pdf.save(filename);
  return filename;
}

export function stampajFai(lista, opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(lista, opts));
}
