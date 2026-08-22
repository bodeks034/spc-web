/**
 * NCR Registar Master — Excel stil: tamnoplavo zaglavlje, gridlines,
 * status ZATVOREN/OTVOREN, alarm 8D (ponavljanje + Pokrenut 8D?), hyperlink.
 */
import XLSX from "xlsx-js-style";
import { REGISTAR_KOLONE, OBRAZAC_SEKCIJE, ncrIzBaze, labelStatusa } from "./ncrObrazacPolja.js";
import { stilizujSheetHeader, EXCEL_HEADER_PLAVA } from "./excelStil.js";
import { putanjaNcrObrazacExcel } from "./kvalitetFolderStruktura.js";

export const NCR_EXCEL_HEADER_RGB = EXCEL_HEADER_PLAVA;
export const NCR_EXCEL_DATE_FMT = "dd.mm.yyyy";
export const NCR_LABEL_RGB = "EAF2F8";
export const NCR_STATUS_ZELENO = "C6EFCE";
export const NCR_STATUS_ZUTO = "FFF2CC";
export const NCR_ALARM_CELIJA = "FF4444";
export const NCR_ALARM_RED = "FDE8E8";
export const NCR_GRID_RGB = "B0BEC5";
export const NCR_LINK_PLAVA = "2563EB";

const REGISTAR_KOLONE_EXCEL = REGISTAR_KOLONE.filter((k) => !k.virtual);

export const REGISTAR_HEADER_ROW = 3;
export const REGISTAR_DATA_START_ROW = 4;
export const COL_STATUS = REGISTAR_KOLONE_EXCEL.findIndex((k) => k.key === "status");
export const COL_8D = REGISTAR_KOLONE_EXCEL.findIndex((k) => k.key === "osmd_pokrenut");
export const COL_PONAVLJANJE = REGISTAR_KOLONE_EXCEL.findIndex((k) => k.key === "ponavljanje");
export const REGISTAR_DATUM_KOLONE = REGISTAR_KOLONE_EXCEL
  .map((k, i) => (k.tip === "date" ? i : -1))
  .filter((i) => i >= 0);
export const COL_DATUM_OTVARANJA = REGISTAR_KOLONE_EXCEL.findIndex((k) => k.key === "datum_otvaranja");

const OBAZAC_DATUM_LABELI = new Set();
for (const sek of OBRAZAC_SEKCIJE) {
  for (const red of sek.redovi) {
    for (const [, label, opts = {}] of red) {
      if (label && opts.tip === "date") OBAZAC_DATUM_LABELI.add(label);
    }
  }
}

function jeObrazacDatumLabel(label) {
  const t = String(label || "").trim();
  return OBAZAC_DATUM_LABELI.has(t) || t === "Datum" || t === "Rok";
}

export function postaviExcelDatumCeliju(cell) {
  if (!cell || cell.v === "" || cell.v == null) return;
  if (typeof cell.v !== "number" || !Number.isFinite(cell.v)) return;
  cell.t = "n";
  cell.z = NCR_EXCEL_DATE_FMT;
  cell.s = { ...(cell.s || {}), numFmt: NCR_EXCEL_DATE_FMT };
}

function cellRef(r, c) {
  return XLSX.utils.encode_cell({ r, c });
}

function ensureCell(ws, r, c) {
  const addr = cellRef(r, c);
  if (!ws[addr]) ws[addr] = { t: "s", v: "" };
  return ws[addr];
}

function borderGrid() {
  const b = { style: "thin", color: { rgb: NCR_GRID_RGB } };
  return { top: b, bottom: b, left: b, right: b };
}

function mergeStil(base, extra = {}) {
  return { ...(base || {}), ...extra, border: borderGrid() };
}

function baseDataStil({ fill, font = {}, wrapText = false } = {}) {
  return {
    font: {
      sz: 10,
      name: "Calibri",
      color: { rgb: font.color || "1A1A1A" },
      bold: font.bold || false,
    },
    alignment: { vertical: "center", wrapText, horizontal: font.horizontal || "left" },
    border: borderGrid(),
    ...(fill ? { fill: { patternType: "solid", fgColor: { rgb: fill } } } : {}),
  };
}

function sekcijaHeaderStil() {
  return {
    fill: { patternType: "solid", fgColor: { rgb: NCR_EXCEL_HEADER_RGB } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
    alignment: { horizontal: "left", vertical: "center" },
    border: borderGrid(),
  };
}

function labelPoljeStil({ wrapText = false } = {}) {
  return baseDataStil({
    fill: NCR_LABEL_RGB,
    font: { bold: true, color: "1E3A5F" },
    wrapText,
  });
}

function vrednostPoljeStil({ wrapText = false } = {}) {
  return baseDataStil({ wrapText });
}

function naslovObrazacStil() {
  return {
    font: { bold: true, color: { rgb: NCR_EXCEL_HEADER_RGB }, sz: 16, name: "Calibri" },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function podnaslovObrazacStil() {
  return {
    font: { italic: true, color: { rgb: "546E7A" }, sz: 10, name: "Calibri" },
    alignment: { horizontal: "left", vertical: "center" },
  };
}

function jeSekcijaRed(v) {
  return /^[A-H]\.\s/.test(String(v || "").trim());
}

function jePotpisRed(v) {
  const t = String(v || "").trim().toUpperCase();
  return t === "ZVANIČNI POTPISI" || t === "ZVANICNI POTPISI";
}

function mergeRed(ws, r, cStart, cEnd) {
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({ s: { r, c: cStart }, e: { r, c: cEnd } });
}

function primeniObrazacStilove(ws) {
  if (!ws?.["!ref"]) return ws;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  ws["!rows"] = ws["!rows"] || [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const prva = ws[cellRef(r, range.s.c)]?.v;
    const prvaTxt = prva == null ? "" : String(prva).trim();

    if (r === range.s.r) {
      mergeRed(ws, r, range.s.c, range.e.c);
      ensureCell(ws, r, range.s.c).s = naslovObrazacStil();
      ws["!rows"][r] = { hpt: 28 };
      continue;
    }

    if (r === range.s.r + 1 && prvaTxt) {
      mergeRed(ws, r, range.s.c, range.e.c);
      ensureCell(ws, r, range.s.c).s = podnaslovObrazacStil();
      ws["!rows"][r] = { hpt: 16 };
      continue;
    }

    if (jeSekcijaRed(prvaTxt) || jePotpisRed(prvaTxt)) {
      mergeRed(ws, r, range.s.c, range.e.c);
      const cell = ensureCell(ws, r, range.s.c);
      cell.s = sekcijaHeaderStil();
      ws["!rows"][r] = { hpt: 22 };
      continue;
    }

    if (!prvaTxt) continue;

    let imaPar = false;
    for (let c = range.s.c; c <= range.e.c; c += 2) {
      const labelCell = ws[cellRef(r, c)];
      const label = labelCell?.v == null ? "" : String(labelCell.v).trim();
      if (!label) continue;
      imaPar = true;
      labelCell.s = labelPoljeStil({ wrapText: label.length > 28 });
      const valCell = ensureCell(ws, r, c + 1);
      valCell.s = vrednostPoljeStil({ wrapText: String(valCell.v || "").length > 24 });
      if (jeObrazacDatumLabel(label)) postaviExcelDatumCeliju(valCell);
    }

    if (imaPar && /Opis neusaglašenosti|Containment|Root cause|Verifikacija|Lekcije/i.test(prvaTxt)) {
      ws["!rows"][r] = { hpt: 48 };
    } else if (imaPar && /Ime i prezime/i.test(prvaTxt)) {
      ws["!rows"][r] = { hpt: 36 };
    } else if (imaPar) {
      ws["!rows"][r] = { hpt: 20 };
    }
  }

  return ws;
}

export function labelStatusaExcel(status) {
  if (status === "closed") return "ZATVOREN";
  if (status === "open") return "OTVOREN";
  return labelStatusa(status);
}

export function jeNcr8dAlarmRed(forma) {
  if (!forma) return false;
  const pon = String(forma.ponavljanje || "").toUpperCase() === "DA";
  const osmd = Boolean(forma.osmd_pokrenut || forma.osmd_id);
  return pon && osmd;
}

function statusStil(status) {
  if (status === "closed") {
    return baseDataStil({ fill: NCR_STATUS_ZELENO, font: { bold: true, color: "1B5E20" } });
  }
  if (status === "open") {
    return baseDataStil({ fill: NCR_STATUS_ZUTO, font: { bold: true, color: "854D0E" } });
  }
  return baseDataStil({});
}

function alarm8dCelijaStil() {
  return baseDataStil({
    fill: NCR_ALARM_CELIJA,
    font: { bold: true, color: "FFFFFF", horizontal: "center" },
  });
}

function alarmRedStil() {
  return baseDataStil({ fill: NCR_ALARM_RED });
}

function linkStil() {
  return baseDataStil({
    font: { color: NCR_LINK_PLAVA, bold: true },
  });
}

function postaviHyperlink(ws, r, c, putanja, prikaz = "Otvori") {
  if (!putanja) return;
  const esc = putanja.replace(/"/g, '""');
  const cell = ensureCell(ws, r, c);
  cell.f = `HYPERLINK("${esc}","${prikaz}")`;
  cell.t = "s";
  cell.v = prikaz;
  cell.l = { Target: putanja, Tooltip: putanja };
  cell.s = linkStil();
}

export function primeniRegistarStilove(ws, sortirana = []) {
  if (!ws?.["!ref"]) return ws;

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const linkCol = range.e.c;
  const dataStart = REGISTAR_DATA_START_ROW;

  for (let i = 0; i < (sortirana || []).length; i++) {
    const r = dataStart + i;
    const row = sortirana[i];
    const forma = ncrIzBaze(row);
    const alarm = jeNcr8dAlarmRed(forma);

    if (COL_STATUS >= 0) {
      const stCell = ensureCell(ws, r, COL_STATUS);
      stCell.v = labelStatusaExcel(forma.status);
      stCell.t = "s";
      stCell.s = statusStil(forma.status);
    }

    for (let c = range.s.c; c <= range.e.c; c++) {
      if (c === COL_STATUS) continue;
      if (c === linkCol) continue;

      const cell = ensureCell(ws, r, c);
      const zebra = i % 2 === 1;
      if (c === COL_8D && alarm) {
        cell.s = alarm8dCelijaStil();
      } else if (alarm) {
        cell.s = mergeStil(cell.s, alarmRedStil());
      } else {
        cell.s = baseDataStil({
          fill: zebra ? "F8FAFC" : undefined,
          wrapText: c === REGISTAR_KOLONE_EXCEL.findIndex((k) => k.key === "opis"),
        });
      }
      if (REGISTAR_DATUM_KOLONE.includes(c)) postaviExcelDatumCeliju(cell);
    }

    const path = putanjaNcrObrazacExcel(forma.broj_ncr);
    if (path) postaviHyperlink(ws, r, linkCol, path, "Otvori obrazac");
  }

  ws["!views"] = [{
    showGridLines: true,
    state: "frozen",
    ySplit: dataStart,
    topLeftCell: cellRef(dataStart, range.s.c),
    activePane: "bottomLeft",
  }];
  ws["!freeze"] = {
    xSplit: 0,
    ySplit: dataStart,
    topLeftCell: cellRef(dataStart, range.s.c),
    activePane: "bottomLeft",
    state: "frozen",
  };

  return ws;
}

export function stilizujNcrMasterWorkbook(wb, { lista = [] } = {}) {
  if (!wb?.SheetNames?.length) return wb;
  const sortirana = [...(lista || [])].sort((a, b) => {
    const pa = String(a.pogon || "").localeCompare(String(b.pogon || ""), "sr");
    if (pa !== 0) return pa;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;

    if (name === "Registar") {
      stilizujSheetHeader(ws, {
        headerRgb: NCR_EXCEL_HEADER_RGB,
        headerRow: REGISTAR_HEADER_ROW,
        zebra: false,
        freezeHeader: false,
        mergeTitle: true,
        wrapData: true,
        minColW: 8,
        maxColW: 42,
      });
      primeniRegistarStilove(ws, sortirana);
      ws["!views"] = [{
        showGridLines: true,
        state: "frozen",
        ySplit: REGISTAR_DATA_START_ROW,
        topLeftCell: cellRef(REGISTAR_DATA_START_ROW, 0),
        activePane: "bottomLeft",
      }];
    } else {
      stilizujSheetHeader(ws, {
        headerRgb: NCR_EXCEL_HEADER_RGB,
        zebra: true,
        freezeHeader: true,
        mergeTitle: true,
      });
      ws["!views"] = [{ showGridLines: true, ...(ws["!views"]?.[0] || {}) }];
    }
  }

  return wb;
}

export function stilizujNcrObrazacWorkbook(wb) {
  if (!wb?.SheetNames?.length) return wb;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    primeniObrazacStilove(ws);
    ws["!views"] = [{ showGridLines: true, showRuler: true }];
    ws["!margins"] = {
      left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3,
    };
    ws["!pageSetup"] = {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalDpi: 300,
      verticalDpi: 300,
    };
    ws["!printHeader"] = ["&CNCR A4 obrazac"];
    if (ws["!ref"]) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      ws["!cols"] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        ws["!cols"].push({ wch: c % 2 === 0 ? 32 : 24 });
      }
    }
  }
  return wb;
}
