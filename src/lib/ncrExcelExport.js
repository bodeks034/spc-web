/**
 * NCR Excel — NCR_KVALITET/
 *   NCR_Registar_Master.xlsx       (master lista)
 *   A4_NCR_Obrazac_Template.xlsx   (blanko šablon)
 *   Pojedinacni_Obrasci/NCR-*.xlsx (po jedan obrazac)
 */
import XLSX from "xlsx-js-style";
import {
  REGISTAR_KOLONE,
  OBRAZAC_SEKCIJE,
  ncrIzBaze,
  labelStatusa,
  praznaNcrForma,
} from "./ncrObrazacPolja.js";
import {
  NCR_REGISTAR_MASTER,
  NCR_OBRAZAC_TEMPLATE,
  NCR_EXCEL_IME,
  putanjaNcrObrazacExcel,
} from "./kvalitetFolderStruktura.js";
import {
  labelStatusaExcel,
  stilizujNcrMasterWorkbook,
  stilizujNcrObrazacWorkbook,
} from "./ncrRegistarExcelStil.js";

export {
  NCR_REGISTAR_MASTER,
  NCR_OBRAZAC_TEMPLATE,
  NCR_EXCEL_IME,
};

export function imeNcrExcelFajla() {
  return NCR_REGISTAR_MASTER;
}

export function linkKaNcrObrazcuExcel(brojNcr) {
  if (!brojNcr) return "";
  return putanjaNcrObrazacExcel(brojNcr);
}

export function gruppisiNcrPoPogonu(lista) {
  const map = new Map();
  for (const row of lista || []) {
    const p = String(row.pogon || "").trim() || "Nepoznat pogon";
    if (!map.has(p)) map.set(p, []);
    map.get(p).push(row);
  }
  return map;
}

const REGISTAR_KOLONE_EXCEL = REGISTAR_KOLONE.filter((k) => !k.virtual);

export const REGISTAR_EXCEL_HEADERS = [
  ...REGISTAR_KOLONE_EXCEL.map((k) => (k.key === "osmd_pokrenut" ? "Pokrenut 8D?" : k.label)),
  "Link ka fajlu",
];

const OTVORENI = new Set(["open", "containment", "disposition", "osmd_progress", "verification"]);

export function isoToExcelSerial(iso) {
  if (!iso) return "";
  const s = String(iso).slice(0, 10);
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return Math.round((d - epoch) / 86400000);
}

function vrednostZaExcel(forma, key, opts = {}) {
  if (key === "status") return labelStatusaExcel(forma.status);
  if (key === "osmd_pokrenut") return forma.osmd_pokrenut || forma.osmd_id ? "DA" : "NE";
  const v = forma[key];
  if (v == null || v === "") return "";
  if (opts.tip === "date") return isoToExcelSerial(v);
  if (opts.tip === "number") return Number(v) || v;
  if (opts.tip === "bool") return v ? "DA" : "NE";
  return String(v);
}

export function ncrRedZaRegistarExcel(row) {
  const forma = ncrIzBaze(row);
  const red = REGISTAR_KOLONE_EXCEL.map((k) => vrednostZaExcel(forma, k.key, k));
  red.push(linkKaNcrObrazcuExcel(forma.broj_ncr));
  return red;
}

function sortirajPoPogonu(lista) {
  return [...(lista || [])].sort((a, b) => {
    const pa = String(a.pogon || "").localeCompare(String(b.pogon || ""), "sr");
    if (pa !== 0) return pa;
    return String(b.created_at || "").localeCompare(String(a.created_at || ""));
  });
}

function vrednostObrazacPolja(forma, key, opts = {}) {
  if (!key) return "";
  if (opts.tip === "status") return labelStatusa(forma.status);
  if (opts.tip === "bool") return forma[key] ? "DA" : "NE";
  const v = forma[key];
  if (v == null || v === "") return "";
  if (opts.tip === "date") return isoToExcelSerial(v);
  return String(v);
}

function buildObrazacRows(forma) {
  if (!forma) return [["NCR – IZVEŠTAJ O NEUSAGLAŠENOSTI"], []];
  const rows = [
    ["NCR – IZVEŠTAJ O NEUSAGLAŠENOSTI"],
    ["Kompaktan zapis neusaglašenosti; detaljna analiza uzroka se vodi kroz 8D kada je pokrenut."],
    [],
  ];
  for (const sek of OBRAZAC_SEKCIJE) {
    rows.push([sek.naslov]);
    for (const red of sek.redovi) {
      const line = [];
      for (const [key, label, opts = {}] of red) {
        if (!label) continue;
        line.push(label, vrednostObrazacPolja(forma, key, opts));
      }
      if (line.length) rows.push(line);
    }
    rows.push([]);
  }
  rows.push([
    "Napomena: Obavezna polja označena žutom. NCR se zatvara tek nakon containment-a, dispozicije i verifikacije efektivnosti.",
  ]);
  rows.push(["ZVANIČNI POTPISI"]);
  rows.push(["Kontrola", "", "Proizvodnja", "", "Menadžer kvaliteta (zatvaranje)", ""]);
  rows.push(["Ime i prezime · datum", "", "Ime i prezime · datum", "", "Ime i prezime · datum", ""]);
  return rows;
}

function buildDashboardRows(lista) {
  const rows = sortirajPoPogonu(lista);
  const otv = rows.filter((r) => OTVORENI.has(r.status)).length;
  const zat = rows.filter((r) => r.status === "closed").length;
  const high = rows.filter((r) => {
    const o = ncrIzBaze(r).ozbiljnost;
    return o === "High" || o === "Critical";
  }).length;
  const sa8d = rows.filter((r) => r.osmd_id || r.osmd_pokrenut).length;
  const pon = rows.filter((r) => ncrIzBaze(r).ponavljanje === "DA").length;

  const poPogonu = gruppisiNcrPoPogonu(rows);
  const pogonRedovi = [["Pogon", "Ukupno", "Otvoreni", "Zatvoreni"]];
  for (const [pg, redovi] of poPogonu) {
    pogonRedovi.push([
      pg,
      redovi.length,
      redovi.filter((r) => OTVORENI.has(r.status)).length,
      redovi.filter((r) => r.status === "closed").length,
    ]);
  }

  return [
    ["NCR DASHBOARD – PREGLED (CELA FIRMA)"],
    [`Ažurirano ${new Date().toLocaleString("sr-RS")} · ${NCR_REGISTAR_MASTER}`],
    [],
    ["Ukupno NCR", "Otvoreni", "Zatvoreni", "High / Critical", "Sa 8D", "Ponavljanja"],
    [rows.length, otv, zat, high, sa8d, pon],
    [],
    ["Po pogonima"],
    ...pogonRedovi,
    [],
    ["Brzi vodič"],
    ["1. NCR_Registar_Master.xlsx — master registar (statistika)."],
    ["2. A4_NCR_Obrazac_Template.xlsx → Save As u Pojedinacni_Obrasci/."],
    ["3. PDF obrazac u istom folderu pored Excel-a (NCR-2026-001.pdf)."],
    ["4. Kolona Link ka fajlu — HYPERLINK do NCR-*.xlsx."],
  ];
}

const UPUTSTVO_ROWS = [
  ["NCR – UPUTSTVO I LOGIKA"],
  [],
  ["Tema", "Opis"],
  [],
  ["Svrha", "Master registar + pojedinačni Excel i PDF obrasci po NCR-u."],
  ["Folder", "KONTROLA_KVALITETA/NCR_KVALITET · Pojedinacni_Obrasci/"],
  ["Master", `${NCR_REGISTAR_MASTER} — statistika, uvek otvoren na ekranu.`],
  ["Šablon", `${NCR_OBRAZAC_TEMPLATE} — blanko A4; ne menjati, uvek Save As.`],
  ["Obrasci", "Pojedinacni_Obrasci/NCR-2026-001.xlsx i NCR-2026-001.pdf"],
  ["Potpisi", "PDF i Excel: Kontrola · Proizvodnja · Menadžer kvaliteta (zatvaranje)"],
  ["Link", "Kolona Link ka fajlu u Masteru — direktan put do Excel obrasca."],
  ["Zatvaranje", "Containment + dispozicija + verifikacija + sistemske akcije."],
  [],
  ["STATUSI", "OTVOREN · CONTAINMENT · DISPOSITION · 8D · VERIFICATION · ZATVOREN"],
];

export function buildNcrRegistarMasterWorkbook({ lista = [] } = {}) {
  const wb = XLSX.utils.book_new();
  const sortirana = sortirajPoPogonu(lista);

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildDashboardRows(sortirana)), "Dashboard");

  const regRows = [
    ["REGISTAR NEUSAGLAŠENOSTI (NCR) — MASTER"],
    ["Centralni pregled · sortirano po pogonu · bojenje statusa i 8D alarma"],
    [],
    REGISTAR_EXCEL_HEADERS,
    ...sortirana.map((r) => ncrRedZaRegistarExcel(r)),
  ];
  const regWs = XLSX.utils.aoa_to_sheet(regRows);
  XLSX.utils.book_append_sheet(wb, regWs, "Registar");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(UPUTSTVO_ROWS), "Uputstvo");

  stilizujNcrMasterWorkbook(wb, { lista: sortirana });
  return wb;
}

export function buildNcrObrazacTemplateWorkbook() {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["BLANKO ŠABLON A4 — NE MENJATI DIREKTNO"],
    ["Popuni podatke pa File → Save As u folder Pojedinacni_Obrasci/ (npr. NCR-2026-003.xlsx)."],
    [],
    ...buildObrazacRows(praznaNcrForma()).slice(2),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Obrazac");
  stilizujNcrObrazacWorkbook(wb);
  return wb;
}

export function buildNcrPojedinacniObrazacWorkbook(forma) {
  const wb = XLSX.utils.book_new();
  const f = forma || praznaNcrForma();
  const rows = [
    [`NCR obrazac · ${f.broj_ncr || "—"}`],
    [`Sačuvano ${new Date().toLocaleString("sr-RS")}`],
    [],
    ...buildObrazacRows(f).slice(2),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Obrazac");
  stilizujNcrObrazacWorkbook(wb);
  return wb;
}

/** @deprecated koristi buildNcrRegistarMasterWorkbook */
export function buildNcrExcelWorkbook({ lista = [] } = {}) {
  return buildNcrRegistarMasterWorkbook({ lista });
}

export function preuzmiNcrRegistarMaster({ lista }) {
  const wb = buildNcrRegistarMasterWorkbook({ lista });
  XLSX.writeFile(wb, NCR_REGISTAR_MASTER);
}

export function preuzmiNcrObrazacTemplate() {
  const wb = buildNcrObrazacTemplateWorkbook();
  XLSX.writeFile(wb, NCR_OBRAZAC_TEMPLATE);
}

export function preuzmiNcrPojedinacniObrazac(forma) {
  const wb = buildNcrPojedinacniObrazacWorkbook(forma);
  const ime = forma?.broj_ncr ? `${forma.broj_ncr}.xlsx` : "NCR_obrazac.xlsx";
  XLSX.writeFile(wb, ime);
}

/** @deprecated koristi preuzmiNcrRegistarMaster */
export function preuzmiNcrExcel({ lista }) {
  preuzmiNcrRegistarMaster({ lista });
}

export function ncrRegistarMasterArrayBuffer({ lista }) {
  const wb = buildNcrRegistarMasterWorkbook({ lista });
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

export function ncrObrazacTemplateArrayBuffer() {
  const wb = buildNcrObrazacTemplateWorkbook();
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

export function ncrPojedinacniObrazacArrayBuffer(forma) {
  const wb = buildNcrPojedinacniObrazacWorkbook(forma);
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

/** @deprecated koristi ncrRegistarMasterArrayBuffer */
export function ncrExcelArrayBuffer({ lista }) {
  return ncrRegistarMasterArrayBuffer({ lista });
}

export function preuzmiNcrExcelPoPogonima(lista) {
  preuzmiNcrRegistarMaster({ lista });
  return 1;
}
