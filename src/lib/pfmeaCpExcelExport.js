/**
 * Izvoz PFMEA + Control Plan u .xlsx — stilizovani listovi (header, zebra, freeze).
 */

import XLSX from "xlsx-js-style";
import {
  PFMEA_EDIT_KOLONE,
  CP_EDIT_KOLONE,
  RPN_SUMMARY_KOLONE,
} from "./pfmeaControlPlan.js";
import { agregirajRpnSummary } from "./pfmeaCpPolja.js";
import {
  stilizujSheetHeader,
  EXCEL_HEADER_PFMEA,
  EXCEL_HEADER_CP,
  EXCEL_HEADER_RPN,
} from "./excelStil.js";

const PFMEA_HEADERS = [
  "Br. Dela / ID dela",
  "Proces / Operacija",
  "Mod greške",
  "Uzrok greške",
  "Efekat greške",
  "S (ozbiljnost)",
  "Uzrok / Mehanizam pojave",
  "O (pojavl.)",
  "Postojeće kontrole",
  "D (otkriv.)",
  "RPN Before",
  "Preporučena akcija",
  "Odgovorni",
  "Rok",
  "Status",
  "RPN After",
  "S posle",
  "O posle",
  "D posle",
  "Odobrio",
  "Datum",
  "PFMEA veza",
  "Control Plan ref.",
];

const CP_HEADERS = [
  "Br. Dela / ID dela",
  "Operacija / Proces",
  "Karakteristika kontrole",
  "Klasifikacija (KSK/VSK)",
  "Nominalna vrednost",
  "Tolerancija / spec.",
  "Metoda merenja / kontrole",
  "Oprema / instrument",
  "MSA status",
  "Učestalost kontrole",
  "Veličina uzorka",
  "Reakcija na nekontrolisano stanje",
  "Reakcija na neispravan deo",
  "Zapis / forma",
  "PFMEA referenca",
  "Mod greške (PFMEA)",
  "Status CP",
  "Odgovorni",
];

const PFMEA_KEYS = PFMEA_EDIT_KOLONE.map((k) => k.key);
const CP_KEYS = CP_EDIT_KOLONE.map((k) => k.key);

/** Red indeksa sa kolonama tabele (naslov, podnaslov, prazno, header). */
const HEADER_ROW = 3;

function redUFizicki(red, keys) {
  return keys.map((k) => red[k] ?? "");
}

function sheetSaZaglavljem({ naslov, podnaslov, headers, redovi, keys, headerRgb, maxColW = 28 }) {
  const aoa = [
    [naslov],
    [podnaslov || ""],
    [],
    headers,
    ...redovi.map((r) => redUFizicki(r, keys)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  stilizujSheetHeader(ws, {
    headerRgb,
    headerRow: HEADER_ROW,
    zebra: true,
    freezeHeader: true,
    minColW: 10,
    maxColW,
    wrapData: true,
    mergeTitle: true,
  });
  return ws;
}

function rpnSummarySheet(redovi) {
  const headers = RPN_SUMMARY_KOLONE.map((k) => k.label);
  const keys = RPN_SUMMARY_KOLONE.map((k) => k.key);
  const dataRows = (redovi || []).filter((r) => !r._agregat);
  const { prosek, ukupno } = agregirajRpnSummary(dataRows);
  const footer = [prosek, ukupno].filter(Boolean);
  const aoa = [
    ["RPN SUMMARY — Pregled poboljšanja rizika"],
    ["Sažetak rizika pre / posle korektivnih mera"],
    [],
    headers,
    ...dataRows.map((r) => redUFizicki(r, keys)),
    ...footer.map((r) => redUFizicki(r, keys)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  stilizujSheetHeader(ws, {
    headerRgb: EXCEL_HEADER_RPN,
    headerRow: HEADER_ROW,
    zebra: true,
    freezeHeader: true,
    minColW: 12,
    maxColW: 32,
    wrapData: true,
    mergeTitle: true,
  });

  // Istakni agregatne (footer) redove
  if (!ws["!ref"] || !footer.length) return ws;
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const footerStart = range.e.r - footer.length + 1;
  for (let r = footerStart; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;
      cell.s = {
        ...(cell.s || {}),
        font: { bold: true, sz: 10, name: "Calibri", color: { rgb: "1A1A1A" } },
        fill: { patternType: "solid", fgColor: { rgb: "FFF3CD" } },
      };
    }
  }
  return ws;
}

/**
 * @param {{ pfmeaRedovi, cpRedovi, rpnSummary, naziv?, revizija?, idDeo? }} doc
 * @returns {ArrayBuffer}
 */
export function generisiPfmeaCpWorkbookBuffer(doc) {
  const naziv = doc.naziv || "PFMEA_ControlPlan";
  const meta = [
    doc.idDeo ? `Deo: ${doc.idDeo}` : "",
    doc.revizija ? `Revizija: ${doc.revizija}` : "",
    `Izvezeno: ${new Date().toLocaleString("sr-RS")}`,
  ].filter(Boolean).join(" · ");

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    sheetSaZaglavljem({
      naslov: "PFMEA — Process Failure Mode and Effects Analysis",
      podnaslov: `${naziv} — ${meta}`,
      headers: PFMEA_HEADERS,
      redovi: doc.pfmeaRedovi || [],
      keys: PFMEA_KEYS,
      headerRgb: EXCEL_HEADER_PFMEA,
      maxColW: 26,
    }),
    "PFMEA",
  );
  XLSX.utils.book_append_sheet(
    wb,
    sheetSaZaglavljem({
      naslov: "CONTROL PLAN — Plan kontrole procesa",
      podnaslov: meta,
      headers: CP_HEADERS,
      redovi: doc.cpRedovi || [],
      keys: CP_KEYS,
      headerRgb: EXCEL_HEADER_CP,
      maxColW: 28,
    }),
    "Control Plan",
  );
  XLSX.utils.book_append_sheet(
    wb,
    rpnSummarySheet(doc.rpnSummary || []),
    "RPN Summary",
  );
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

/** Samo RPN Summary list — za paket kvaliteta. */
export function generisiRpnSummaryWorkbookBuffer(redovi) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, rpnSummarySheet(redovi || []), "RPN Summary");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export function pfmeaCpDocZaIzvoz(dokument) {
  if (!dokument) return null;
  const pfmeaRedovi = dokument.pfmeaRedovi || dokument.pfmea?.redovi || [];
  const cpRedovi = dokument.cpRedovi || dokument.controlPlan?.redovi || [];
  const rpnSummary = dokument.rpnSummary?.length
    ? dokument.rpnSummary
    : null;
  return {
    pfmeaRedovi,
    cpRedovi,
    rpnSummary,
    naziv: dokument.naziv || "",
    revizija: dokument.revizija || "",
    idDeo: dokument.idDeo || dokument.id_deo || "",
  };
}

export function preuzmiPfmeaCpExcel(doc, imeFajla) {
  const buf = generisiPfmeaCpWorkbookBuffer(doc);
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (imeFajla || doc.naziv || "PFMEA_ControlPlan")
    .replace(/[^\w\s\-./čćšđžČĆŠĐŽ]+/g, "_")
    .slice(0, 80);
  a.href = url;
  a.download = safe.endsWith(".xlsx") ? safe : `${safe}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
