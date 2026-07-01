/**
 * Izvoz PFMEA + Control Plan u .xlsx — isti raspored listova kao Excel šablon.
 */

import * as XLSX from "xlsx";
import {
  PFMEA_EDIT_KOLONE,
  CP_EDIT_KOLONE,
  RPN_SUMMARY_KOLONE,
} from "./pfmeaControlPlan.js";
import { agregirajRpnSummary } from "./pfmeaCpPolja.js";

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

function redUFizicki(red, keys) {
  return keys.map((k) => red[k] ?? "");
}

function sheetSaZaglavljem({ naslov, podnaslov, headers, redovi, keys }) {
  const aoa = [
    [naslov],
    [podnaslov || ""],
    [],
    headers,
    ...redovi.map((r) => redUFizicki(r, keys)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
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
  return XLSX.utils.aoa_to_sheet(aoa);
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
