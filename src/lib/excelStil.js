/**
 * Stilizacija Excel izvoza (Modul 2) — header boja, zebra, freeze, širine kolona.
 * Koristi xlsx-js-style (zajednički xlsx API + ćelijski stilovi).
 */
import XLSX from "xlsx-js-style";

/** SPC plava (atributivne / default) */
export const EXCEL_HEADER_PLAVA = "1B4F72";
/** SPC zelena (merljive) */
export const EXCEL_HEADER_ZELENA = "1E6B4A";
/** Alternativni red */
const ZEBRA_RGB = "EAF2F8";
const BORDER_RGB = "B0BEC5";

function borderThin(rgb = BORDER_RGB) {
  const b = { style: "thin", color: { rgb } };
  return { top: b, bottom: b, left: b, right: b };
}

/** Tamnija plava — PFMEA naslov / akcent */
export const EXCEL_HEADER_PFMEA = "1A365D";
/** Control Plan / zeleni akcent */
export const EXCEL_HEADER_CP = "1E6B4A";
/** RPN summary — tamno siva-plava */
export const EXCEL_HEADER_RPN = "2C3E50";

function headerStil(headerRgb) {
  return {
    fill: { patternType: "solid", fgColor: { rgb: headerRgb } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: borderThin("0D2B3E"),
  };
}

function titleStil(headerRgb) {
  return {
    font: { bold: true, color: { rgb: headerRgb }, sz: 14, name: "Calibri" },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function subtitleStil() {
  return {
    font: { italic: true, color: { rgb: "546E7A" }, sz: 10, name: "Calibri" },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function cellStil({ zebra = false, wrapText = false } = {}) {
  return {
    font: { sz: 10, name: "Calibri", color: { rgb: "1A1A1A" } },
    alignment: { vertical: "center", wrapText },
    border: borderThin(),
    ...(zebra ? { fill: { patternType: "solid", fgColor: { rgb: ZEBRA_RGB } } } : {}),
  };
}

function cellRef(r, c) {
  return XLSX.utils.encode_cell({ r, c });
}

function ensureCell(ws, r, c) {
  const addr = cellRef(r, c);
  if (!ws[addr]) ws[addr] = { t: "s", v: "" };
  return ws[addr];
}

/**
 * Stilizuje header red + opciono zebra + freeze + auto širine.
 * Podržava naslovne redove iznad tabele (headerRow > 0).
 * @param {object} ws SheetJS worksheet
 * @param {{
 *   headerRgb?: string,
 *   zebra?: boolean,
 *   freezeHeader?: boolean,
 *   minColW?: number,
 *   maxColW?: number,
 *   headerRow?: number,
 *   wrapData?: boolean,
 *   mergeTitle?: boolean,
 * }} [opts]
 */
export function stilizujSheetHeader(ws, opts = {}) {
  if (!ws || !ws["!ref"]) return ws;
  const {
    headerRgb = EXCEL_HEADER_PLAVA,
    zebra = true,
    freezeHeader = true,
    minColW = 8,
    maxColW = 36,
    headerRow = 0,
    wrapData = false,
    mergeTitle = false,
  } = opts;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const headerR = Math.max(range.s.r, Math.min(headerRow, range.e.r));
  const hStil = headerStil(headerRgb);

  // Naslov / podnaslov iznad headera
  for (let r = range.s.r; r < headerR; r++) {
    const stil = r === range.s.r ? titleStil(headerRgb) : subtitleStil();
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ensureCell(ws, r, c);
      if (c === range.s.c || (cell.v != null && String(cell.v).trim() !== "")) {
        cell.s = { ...(cell.s || {}), ...stil };
      }
    }
  }

  if (mergeTitle && headerR > range.s.r) {
    ws["!merges"] = ws["!merges"] || [];
    for (let r = range.s.r; r < headerR; r++) {
      const aCell = ws[cellRef(r, range.s.c)];
      if (aCell?.v != null && String(aCell.v).trim() !== "") {
        ws["!merges"].push({
          s: { r, c: range.s.c },
          e: { r, c: range.e.c },
        });
      }
    }
  }

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ensureCell(ws, headerR, c);
    cell.s = hStil;
  }

  for (let r = headerR + 1; r <= range.e.r; r++) {
    const zebraRow = zebra && ((r - headerR) % 2 === 0);
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ensureCell(ws, r, c);
      cell.s = { ...(cell.s || {}), ...cellStil({ zebra: zebraRow, wrapText: wrapData }) };
    }
  }

  if (freezeHeader) {
    const ySplit = headerR + 1;
    const topLeft = cellRef(ySplit, range.s.c);
    ws["!freeze"] = { xSplit: 0, ySplit, topLeftCell: topLeft, activePane: "bottomLeft", state: "frozen" };
    ws["!views"] = [{ state: "frozen", ySplit, topLeftCell: topLeft }];
  }

  ws["!rows"] = ws["!rows"] || [];
  if (headerR > range.s.r) {
    ws["!rows"][range.s.r] = { ...(ws["!rows"][range.s.r] || {}), hpt: 24 };
    if (headerR > range.s.r + 1) {
      ws["!rows"][range.s.r + 1] = { ...(ws["!rows"][range.s.r + 1] || {}), hpt: 16 };
    }
  }
  ws["!rows"][headerR] = { ...(ws["!rows"][headerR] || {}), hpt: 28 };

  const cols = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    let maxLen = minColW;
    for (let r = headerR; r <= range.e.r; r++) {
      const cell = ws[cellRef(r, c)];
      const v = cell?.v == null ? "" : String(cell.v);
      maxLen = Math.max(maxLen, Math.min(maxColW, v.length + 2));
    }
    cols.push({ wch: maxLen });
  }
  ws["!cols"] = cols;

  return ws;
}

/** Stilizuj sve listove u workbook-u. */
export function stilizujWorkbook(wb, opts = {}) {
  if (!wb?.SheetNames?.length) return wb;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const lower = String(name).toLowerCase();
    const headerRgb = /merenja|merljiv|kpi|sop|karakteristik/.test(lower)
      ? EXCEL_HEADER_ZELENA
      : opts.headerRgb || EXCEL_HEADER_PLAVA;
    stilizujSheetHeader(ws, { ...opts, headerRgb });
  }
  return wb;
}

/** json_to_sheet + header stil. */
export function jsonToStyledSheet(rows, jsonOpts, stilOpts) {
  const ws = XLSX.utils.json_to_sheet(rows || [], jsonOpts);
  return stilizujSheetHeader(ws, stilOpts);
}

export function downloadStyledWorkbook(wb, filename, stilOpts) {
  stilizujWorkbook(wb, stilOpts);
  XLSX.writeFile(wb, filename);
}

export function workbookToArrayBuffer(wb, stilOpts) {
  stilizujWorkbook(wb, stilOpts);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}
