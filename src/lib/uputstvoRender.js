/**
 * Markdown → HTML (jednostavno, za uputstva) + štampa / PDF.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function jednostavanMdUHtml(md) {
  if (!md) return "";
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuf = [];
  let tableRows = [];

  const flushList = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const body = [];
    for (let i = 0; i < tableRows.length; i += 1) {
      const raw = tableRows[i].trim();
      if (/^\|?[\s\-:|]+\|?$/.test(raw) && raw.includes("-")) continue;
      body.push(raw);
    }
    tableRows = [];
    if (!body.length) return;
    const parseRow = (row) => {
      let r = row.trim();
      if (r.startsWith("|")) r = r.slice(1);
      if (r.endsWith("|")) r = r.slice(0, -1);
      return r.split("|").map((c) => c.trim());
    };
    const head = parseRow(body[0]);
    out.push('<table class="u-tab"><thead><tr>');
    head.forEach((c) => out.push(`<th>${inline(c)}</th>`));
    out.push("</tr></thead><tbody>");
    for (let i = 1; i < body.length; i += 1) {
      const cells = parseRow(body[i]);
      out.push("<tr>");
      cells.forEach((c) => out.push(`<td>${inline(c)}</td>`));
      out.push("</tr>");
    }
    out.push("</tbody></table>");
  };

  const inline = (s) => String(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const isTableLine = (line) => {
    const t = line.trim();
    if (!t.includes("|")) return false;
    if (/^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t)) return false;
    return (t.match(/\|/g) || []).length >= 1 && !t.startsWith("```");
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        flushTable();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    if (isTableLine(line)) {
      flushList();
      tableRows.push(line);
      continue;
    }

    if (tableRows.length) flushTable();

    if (/^---+$/.test(line.trim())) {
      flushList();
      out.push("<hr/>");
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      if (!inUl) { flushList(); out.push("<ul>"); inUl = true; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (!inOl) { flushList(); out.push("<ol>"); inOl = true; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    if (line.trim() === "") {
      flushList();
      continue;
    }

    flushList();
    out.push(`<p>${inline(line)}</p>`);
  }

  flushTable();
  flushList();
  if (inCode && codeBuf.length) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  return out.join("\n");
}

/** Zelena akcent boja (usklađena sa dugmadima u hubu). */
export const UPUTSTVO_ZELENA = "#1a6b3c";

/**
 * Beli A4 list — štampa markdown uputstava.
 * Margine: @page 16mm / 14mm (ne duplirati veliki padding u body).
 */
export const UPUTSTVO_PRINT_CSS = `
  @page {
    size: A4;
    margin: 16mm 14mm 18mm 14mm;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #1a1a1a;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-wrap {
    max-width: 182mm;
    margin: 0 auto;
  }
  .print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    padding-bottom: 8px;
    margin-bottom: 14px;
    border-bottom: 2.5px solid ${UPUTSTVO_ZELENA};
  }
  .print-header .brand {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${UPUTSTVO_ZELENA};
  }
  .print-header .doc-title {
    font-size: 11pt;
    font-weight: 600;
    color: #222;
    text-align: right;
    max-width: 65%;
  }
  .print-footer {
    margin-top: 22px;
    padding-top: 8px;
    border-top: 1px solid #ccc;
    font-size: 8pt;
    color: #666;
    display: flex;
    justify-content: space-between;
  }
  h1 {
    font-size: 17pt;
    color: #111;
    margin: 0 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #ddd;
    page-break-after: avoid;
  }
  h2 {
    font-size: 12.5pt;
    color: #111;
    margin: 1.15em 0 0.45em;
    padding-bottom: 3px;
    border-bottom: 1.5px solid ${UPUTSTVO_ZELENA};
    page-break-after: avoid;
  }
  h3 {
    font-size: 11pt;
    color: #222;
    margin: 0.95em 0 0.35em;
    page-break-after: avoid;
  }
  h4 { font-size: 10.5pt; margin: 0.8em 0 0.3em; page-break-after: avoid; }
  p { margin: 0.4em 0; orphans: 3; widows: 3; }
  ul, ol { margin: 0.35em 0 0.55em 1.15em; padding: 0; }
  li { margin: 0.2em 0; }
  table, .u-tab {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px;
    font-size: 9pt;
    background: #fff;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #333;
    padding: 5px 7px;
    text-align: left;
    vertical-align: top;
    background: #fff;
  }
  th {
    background: #e8f2ec !important;
    color: #123;
    font-weight: 700;
  }
  code { background: #f4f4f4; padding: 1px 4px; font-size: 8.5pt; border-radius: 2px; }
  pre {
    background: #f7f7f7;
    border: 1px solid #ddd;
    padding: 8px 10px;
    font-size: 8.5pt;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  blockquote {
    border-left: 3px solid ${UPUTSTVO_ZELENA};
    margin: 0.6em 0;
    padding: 4px 0 4px 12px;
    color: #333;
    background: #f8fbf9;
  }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.2em 0; }
  a { color: ${UPUTSTVO_ZELENA}; text-decoration: none; }
  .doc-break { page-break-before: always; }
  .doc-break:first-child { page-break-before: auto; }
  @media screen {
    body { background: #d8d8d8 !important; padding: 16px; }
    .print-wrap {
      background: #fff;
      padding: 16mm 14mm;
      box-shadow: 0 2px 14px rgba(0,0,0,.18);
      border: 1px solid #ccc;
    }
  }
  @media print {
    body { background: #fff !important; padding: 0 !important; }
    .print-wrap { box-shadow: none; border: none; padding: 0; max-width: none; }
    .no-print { display: none !important; }
  }
`;

export async function ucitajUputstvoDokument(doc) {
  const res = await fetch(doc.fajl);
  if (!res.ok) throw new Error(`Ne mogu da učitam ${doc.fajl} (${res.status})`);
  const tekst = await res.text();
  if (doc.tip === "html") {
    return { html: tekst, naslov: doc.naslov, tip: "html", sirovi: null };
  }
  return {
    html: jednostavanMdUHtml(tekst),
    naslov: doc.naslov,
    tip: "markdown",
    sirovi: tekst,
  };
}

export function otvoriZaStampu(htmlTelo, naslov) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  const jeCeoHtml = /^\s*<!DOCTYPE/i.test(htmlTelo) || /^\s*<html[\s>]/i.test(htmlTelo);
  if (jeCeoHtml) {
    w.document.write(htmlTelo);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 550);
    return true;
  }
  const safe = String(naslov || "Uputstvo").replace(/</g, "");
  w.document.write(`<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8"/><title>${safe}</title><style>${UPUTSTVO_PRINT_CSS}</style></head><body><div class="print-wrap"><header class="print-header"><div class="brand">SPC · Uputstvo</div><div class="doc-title">${safe}</div></header><main>${htmlTelo}</main><footer class="print-footer"><span>SPC Kontrola kvaliteta</span><span>${safe}</span></footer></div></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 450);
  return true;
}

/** Spoji više markdown tela za štampu (html fragmenti). */
export function spojiZaStampu(delovi) {
  return delovi.map((d) => {
    const body = d.tip === "html"
      ? `<p><em>Otvorite HTML dokument za punu štampu: ${escapeHtml(d.naslov)}</em></p>`
      : d.html;
    return `<section class="doc-break"><h1>${escapeHtml(d.naslov)}</h1>${body}</section>`;
  }).join("\n");
}

function stripMdInline(s) {
  return String(s || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function parseRowCells(row) {
  let r = row.trim();
  if (r.startsWith("|")) r = r.slice(1);
  if (r.endsWith("|")) r = r.slice(0, -1);
  return r.split("|").map((c) => stripMdInline(c));
}

function parseMdBlokovi(md) {
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  const blokovi = [];
  let tableBuf = [];

  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = [];
    for (const raw of tableBuf) {
      if (/^\|?[\s\-:|]+\|?$/.test(raw.trim()) && raw.includes("-")) continue;
      rows.push(parseRowCells(raw));
    }
    tableBuf = [];
    if (rows.length) blokovi.push({ tip: "table", rows });
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) {
      flushTable();
      continue;
    }
    if (t.includes("|") && !/^[-*]\s/.test(t) && !/^\d+\.\s/.test(t)) {
      tableBuf.push(line);
      continue;
    }
    flushTable();
    if (/^---+$/.test(t)) continue;
    const h = t.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      blokovi.push({ tip: "h", lvl: h[1].length, tekst: stripMdInline(h[2]) });
      continue;
    }
    if (/^[-*]\s+/.test(t)) {
      blokovi.push({ tip: "li", tekst: stripMdInline(t.replace(/^[-*]\s+/, "")) });
      continue;
    }
    if (/^\d+\.\s+/.test(t)) {
      blokovi.push({ tip: "li", tekst: stripMdInline(t.replace(/^\d+\.\s+/, "")) });
      continue;
    }
    if (t.startsWith(">")) {
      blokovi.push({ tip: "quote", tekst: stripMdInline(t.replace(/^>\s?/, "")) });
      continue;
    }
    if (t.startsWith("```")) continue;
    blokovi.push({ tip: "p", tekst: stripMdInline(t) });
  }
  flushTable();
  return blokovi;
}

function htmlUBlokove(html) {
  const el = document.createElement("div");
  el.innerHTML = html;
  // Ukloni chrome (print-bar) i skripte
  el.querySelectorAll(".no-print, script, style, .print-bar").forEach((n) => n.remove());
  const blokovi = [];

  const walk = (node) => {
    if (!node || node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "noscript"].includes(tag)) return;
    if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
      const tekst = (node.textContent || "").trim();
      if (tekst) blokovi.push({ tip: "h", lvl: Number(tag[1]), tekst });
      return;
    }
    if (tag === "table") {
      const rows = [];
      node.querySelectorAll("tr").forEach((tr) => {
        const cells = [...tr.querySelectorAll("th,td")].map((c) => (c.textContent || "").trim());
        if (cells.some((c) => c)) rows.push(cells);
      });
      if (rows.length) blokovi.push({ tip: "table", rows });
      return;
    }
    if (tag === "li") {
      const tekst = (node.textContent || "").trim();
      if (tekst) blokovi.push({ tip: "li", tekst });
      return;
    }
    if (tag === "blockquote" || (node.classList && (node.classList.contains("note") || node.classList.contains("warn") || node.classList.contains("ok") || node.classList.contains("gold") || node.classList.contains("box")))) {
      const tekst = (node.textContent || "").trim();
      if (tekst) blokovi.push({ tip: "quote", tekst });
      return;
    }
    if (tag === "p" || tag === "pre") {
      const tekst = (node.textContent || "").trim();
      if (tekst) blokovi.push({ tip: "p", tekst });
      return;
    }
    if (tag === "ul" || tag === "ol") {
      [...node.children].forEach(walk);
      return;
    }
    // page / section / div — spusti se u decu, ali bez dvostrukog hvatanja već obrađenih
    if (["div", "section", "main", "article", "body", "header", "footer"].includes(tag)) {
      [...node.children].forEach(walk);
    }
  };

  [...el.children].forEach(walk);
  if (!blokovi.length) {
    const tekst = (el.innerText || el.textContent || "").trim();
    if (tekst) {
      return tekst.split("\n").filter((l) => l.trim()).map((t) => ({ tip: "p", tekst: t.trim() }));
    }
  }
  return blokovi;
}

/**
 * PDF jednog ili više dokumenata — A4, margine, zaglavlje, tabele, broj strane.
 */
export async function pdfIzUputstvaDokumenata(dokumenti, { onProgress } = {}) {
  const { default: jsPDF } = await import("jspdf");
  const { pdfSetFont } = await import("./pdfFontSr.js");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const ML = 16;
  const MR = 16;
  const MT = 20;
  const MB = 16;
  const maxW = W - ML - MR;
  const zelena = [26, 107, 60];
  let prva = true;
  let pageNo = 0;

  const crtajZaglavlje = async (naslovDok) => {
    pageNo += 1;
    pdf.setDrawColor(...zelena);
    pdf.setLineWidth(0.7);
    pdf.line(ML, 12, W - MR, 12);
    await pdfSetFont(pdf, "bold", 8);
    pdf.setTextColor(...zelena);
    pdf.text("SPC · UPUTSTVO", ML, 9);
    await pdfSetFont(pdf, "normal", 8);
    pdf.setTextColor(90, 90, 90);
    const short = pdf.splitTextToSize(String(naslovDok || ""), maxW * 0.55);
    pdf.text(short[0] || "", W - MR, 9, { align: "right" });
    pdf.setTextColor(26, 26, 26);
  };

  const crtajPodnozje = async () => {
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(ML, H - 11, W - MR, H - 11);
    await pdfSetFont(pdf, "normal", 8);
    pdf.setTextColor(110, 110, 110);
    pdf.text("SPC Kontrola kvaliteta", ML, H - 7);
    pdf.text(String(pageNo), W - MR, H - 7, { align: "right" });
    pdf.setTextColor(26, 26, 26);
  };

  const novaStrana = async (naslovDok) => {
    if (!prva) pdf.addPage();
    prva = false;
    await crtajZaglavlje(naslovDok);
    await crtajPodnozje();
    return MT;
  };

  const ensureSpace = async (y, need, naslovDok) => {
    if (y + need <= H - MB) return y;
    return novaStrana(naslovDok);
  };

  const wrapText = (tekst, fontSize) => {
    pdf.setFontSize(fontSize);
    return pdf.splitTextToSize(tekst || " ", maxW);
  };

  for (let i = 0; i < dokumenti.length; i += 1) {
    const doc = dokumenti[i];
    onProgress?.(i + 1, dokumenti.length, doc.naslov);
    const ucitano = await ucitajUputstvoDokument(doc);

    let y = await novaStrana(doc.naslov);

    await pdfSetFont(pdf, "bold", 15);
    pdf.setTextColor(20, 20, 20);
    const naslovLines = wrapText(doc.naslov, 15);
    for (const wl of naslovLines) {
      y = await ensureSpace(y, 8, doc.naslov);
      pdf.text(wl, ML, y);
      y += 6.5;
    }
    pdf.setDrawColor(...zelena);
    pdf.setLineWidth(0.45);
    pdf.line(ML, y - 1, ML + 28, y - 1);
    y += 6;

    const blokovi = ucitano.sirovi
      ? parseMdBlokovi(ucitano.sirovi)
      : htmlUBlokove(ucitano.html);

    for (const b of blokovi) {
      if (b.tip === "h") {
        const size = b.lvl === 1 ? 13 : b.lvl === 2 ? 11.5 : 10.5;
        const lines = wrapText(b.tekst, size);
        y = await ensureSpace(y, 6 + lines.length * 5.2, doc.naslov);
        y += b.lvl <= 2 ? 3 : 1.5;
        await pdfSetFont(pdf, "bold", size);
        pdf.setTextColor(20, 20, 20);
        for (const wl of lines) {
          y = await ensureSpace(y, 5.5, doc.naslov);
          pdf.text(wl, ML, y);
          y += size * 0.42;
        }
        if (b.lvl <= 2) {
          pdf.setDrawColor(...zelena);
          pdf.setLineWidth(0.35);
          pdf.line(ML, y - 1, W - MR, y - 1);
          y += 3;
        } else {
          y += 1.5;
        }
        continue;
      }

      if (b.tip === "table" && b.rows?.length) {
        const cols = Math.max(...b.rows.map((r) => r.length));
        const colW = maxW / cols;
        const pad = 1.4;
        await pdfSetFont(pdf, "normal", 8);

        for (let ri = 0; ri < b.rows.length; ri += 1) {
          const row = b.rows[ri];
          const cellLines = [];
          let rowH = 6;
          for (let ci = 0; ci < cols; ci += 1) {
            const cell = String(row[ci] ?? "");
            const wrapped = pdf.splitTextToSize(cell, colW - pad * 2);
            cellLines.push(wrapped);
            rowH = Math.max(rowH, wrapped.length * 3.6 + pad * 2);
          }
          y = await ensureSpace(y, rowH + 1, doc.naslov);
          const y0 = y;
          for (let ci = 0; ci < cols; ci += 1) {
            const x = ML + ci * colW;
            if (ri === 0) {
              pdf.setFillColor(232, 242, 236);
              pdf.rect(x, y0, colW, rowH, "F");
            }
            pdf.setDrawColor(60, 60, 60);
            pdf.setLineWidth(0.2);
            pdf.rect(x, y0, colW, rowH, "S");
            await pdfSetFont(pdf, ri === 0 ? "bold" : "normal", 8);
            pdf.setTextColor(25, 25, 25);
            let ty = y0 + pad + 3.2;
            for (const wl of cellLines[ci]) {
              pdf.text(wl, x + pad, ty);
              ty += 3.6;
            }
          }
          y = y0 + rowH;
        }
        y += 4;
        continue;
      }

      if (b.tip === "quote") {
        const lines = wrapText(b.tekst, 9.5);
        y = await ensureSpace(y, lines.length * 4.4 + 3, doc.naslov);
        pdf.setDrawColor(...zelena);
        pdf.setLineWidth(0.8);
        pdf.line(ML, y - 2, ML, y + lines.length * 4.4);
        await pdfSetFont(pdf, "normal", 9.5);
        pdf.setTextColor(50, 50, 50);
        for (const wl of lines) {
          pdf.text(wl, ML + 3, y);
          y += 4.4;
        }
        y += 2;
        pdf.setTextColor(26, 26, 26);
        continue;
      }

      const prefix = b.tip === "li" ? "• " : "";
      const lines = wrapText(prefix + b.tekst, 9.5);
      await pdfSetFont(pdf, "normal", 9.5);
      pdf.setTextColor(30, 30, 30);
      for (const wl of lines) {
        y = await ensureSpace(y, 4.6, doc.naslov);
        pdf.text(wl, ML, y);
        y += 4.4;
      }
      y += b.tip === "p" ? 1.2 : 0.6;
    }
  }

  const ime = dokumenti.length === 1
    ? `Uputstvo_${dokumenti[0].id}.pdf`
    : `Uputstvo_paket_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(ime);
}
