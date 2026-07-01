/**
 * glavni unos.xlsx (inženjer) → SPC_merljive.xlsx + SPC_atributivne.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { KARAKTERISTIKE_MERLJIVE_HEADER } from "./karakteristikaMerljive.js";
import { mapKarakteristikaMerljiveRow } from "./karakteristikaMerljive.js";
import {
  generisiIzKarakteristika,
  generisiRadniNaloge,
  brojNalogaZaGrupu,
  spojiDeloviCsv,
  spojiSopCsv,
  grupisiKarakteristike,
  metaIzGrupe,
} from "./syncSifrarnikIzMerljivih.js";
import { RADNI_NALOZI_EXCEL_COLS } from "./excelColumnDefs.js";
import { sifrarnikCsvDir } from "./sifrarnikPaths.js";
import {
  GLAVNI_UNOS_BROJ_MERENJA_DEFAULT,
  GLAVNI_UNOS_COL_BROJ_MERENJA,
  GLAVNI_UNOS_VOZILO_HEADERS,
  buildGlavniUnosLookups as buildGlavniUnosLookupsCore,
  parseGlavniUnosVoziloSheets as parseGlavniUnosVoziloSheetsCore,
  mergeKarakteristike,
  pick,
  num,
  excelRawToDbPayload,
  brojMerenjaIzGlavnogUnosaReda,
  mapGlavniUnosVoziloRed,
} from "./glavniUnosCore.js";

export {
  GLAVNI_UNOS_BROJ_MERENJA_DEFAULT,
  GLAVNI_UNOS_COL_BROJ_MERENJA,
  GLAVNI_UNOS_VOZILO_HEADERS,
  brojMerenjaIzGlavnogUnosaReda,
  mapGlavniUnosVoziloRed,
  mergeKarakteristike,
};

export function buildGlavniUnosLookups(wb) {
  return buildGlavniUnosLookupsCore(wb, sheetRows);
}

export function parseGlavniUnosVoziloSheets(wb) {
  return parseGlavniUnosVoziloSheetsCore(wb, sheetRows);
}

function sheetRows(wb, name) {
  if (!wb.Sheets[name]) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
}

function csvEsc(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsvFile(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const r of rows || []) {
    lines.push(headers.map((h) => csvEsc(r[h])).join(","));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function minimalDeloviMasterIzKar(karRows) {
  const groups = grupisiKarakteristike(karRows);
  const out = [];
  for (const rows of groups.values()) {
    const m = metaIzGrupe(rows);
    out.push({
      id_deo: m.id_deo,
      pogon_kod: m.pogon_kod,
      radni_nalog: m.radni_nalog,
      naziv_dela: m.naziv_dela || m.id_deo,
      karakteristika: m.faza_naziv || "Kontrola kvaliteta",
      linija_id: Number.isFinite(m.linija_id) ? m.linija_id : 1,
      masina_id: Number.isFinite(m.masina_id) ? m.masina_id : 1,
      kom_za_kontrolu: m.kom_za_kontrolu_n ?? null,
      slika_naziv: m.slika || null,
      aktivan: true,
      tip_kontrole: "deo",
    });
  }
  return out;
}

function rowsToSheet(rows, headers) {
  const data = (rows || []).map((r) => {
    const o = {};
    headers.forEach((h) => { o[h] = r[h] ?? ""; });
    return o;
  });
  return XLSX.utils.json_to_sheet(data, { header: headers });
}

function excelToRows(wb, sheetName) {
  if (!wb?.Sheets?.[sheetName]) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
}

function karToExcelRow(r) {
  const o = {};
  KARAKTERISTIKE_MERLJIVE_HEADER.forEach((h) => {
    o[h] = r[h] ?? "";
  });
  return o;
}

function rnToExcelRow(r) {
  const o = {};
  RADNI_NALOZI_EXCEL_COLS.forEach(([key, label]) => {
    o[label] = r[key] ?? r[label] ?? "";
  });
  return o;
}

function sopToExcelRow(r) {
  return {
    id_deo: r.id_deo ?? "",
    pogon_kod: r.pogon_kod ?? "",
    radni_nalog: r.radni_nalog ?? "",
    naziv_dela: r.naziv_dela ?? "",
    slika: r.slika ?? "",
    masina: r.masina ?? "",
    linija: r.linija ?? "",
    broj_merenja: r.broj_merenja ?? "",
    kontrolor_ime: r.kontrolor_ime ?? "",
  };
}

function readWorkbookFile(filePath) {
  return XLSX.read(fs.readFileSync(filePath));
}

function loadWorkbook(filePath) {
  try {
    return readWorkbookFile(filePath);
  } catch {
    return XLSX.utils.book_new();
  }
}

export function exportSifrarnikCsv(csvDir, {
  mergedKar,
  sopExcel,
  deloviExcel,
  rnExcel,
  lookups,
}) {
  const karRows = (mergedKar || []).map(karToExcelRow);
  writeCsvFile(
    path.join(csvDir, "karakteristike_merljive.csv"),
    KARAKTERISTIKE_MERLJIVE_HEADER,
    karRows,
  );
  writeCsvFile(
    path.join(csvDir, "sop_deo_varijabilni.csv"),
    ["id_deo", "pogon_kod", "radni_nalog", "naziv_dela", "slika", "masina", "linija", "broj_merenja", "kontrolor_ime"],
    sopExcel || [],
  );
  if (deloviExcel?.length) {
    const deloviHeaders = Object.keys(deloviExcel[0]);
    writeCsvFile(path.join(csvDir, "delovi.csv"), deloviHeaders, deloviExcel);
  }
  if (rnExcel?.length) {
    const rnHeaders = Object.keys(rnExcel[0]);
    writeCsvFile(path.join(csvDir, "radni_nalozi.csv"), rnHeaders, rnExcel);
  }
  const pogonPath = path.join(csvDir, "pogon_kod.csv");
  exportPogonKodCsv(lookups, pogonPath);
  return csvDir;
}

export function exportPogonKodCsv(lookups, csvPath) {
  const rows = [];
  for (const info of lookups.pogonByLinija?.values() || []) {
    rows.push({
      linija_faza: info.linija_faza || "",
      linija_id: info.linija_id ?? "",
      pogon_kod: info.pogon || "",
    });
  }
  rows.sort((a, b) => String(a.linija_faza).localeCompare(String(b.linija_faza)));
  const header = "linija_faza,linija_id,pogon_kod\n";
  const body = rows.map((r) => [
    r.linija_faza,
    r.linija_id ?? "",
    r.pogon_kod,
  ].join(",")).join("\n");
  fs.writeFileSync(csvPath, header + body + (body ? "\n" : ""), "utf8");
  return rows.length;
}

function upsertSheet(wb, name, sheet) {
  wb.Sheets[name] = sheet;
  if (!wb.SheetNames.includes(name)) wb.SheetNames.push(name);
}

export async function syncGlavniUnosToSpc({
  glavniPath,
  merljivePath,
  atributivnePath,
  dryRun = false,
} = {}) {
  const glavniWb = readWorkbookFile(glavniPath);
  const { lookups, sheets, karakteristike: izGlavnog } = parseGlavniUnosVoziloSheets(glavniWb, sheetRows);

  if (!izGlavnog.length) {
    return {
      ok: false,
      greska: "Nema redova u vozilo* sheetovima (proveri id_deo kolonu).",
      sheets,
    };
  }

  const merljiveWb = loadWorkbook(merljivePath);
  const atrWb = loadWorkbook(atributivnePath);

  const postojeciKar = excelToRows(merljiveWb, "karakteristike_merljive").map((r) =>
    mapKarakteristikaMerljiveRow(r));
  const mergedKar = mergeKarakteristike(postojeciKar, izGlavnog);

  const postojeciSop = excelToRows(merljiveWb, "sop_deo_varijabilni");
  const postojeciDelovi = excelToRows(atrWb, "delovi");
  const postojeciRn = excelToRows(atrWb, "radni_nalozi");

  const { sopRows, deloviPogonRows, masterRows: atrMasterRows } = generisiIzKarakteristika(
    mergedKar,
    { postojeciSop, postojeciDelovi: postojeciDelovi.map((r) => ({
      id_deo: pick(r, "id dela", "id_deo"),
      pogon_kod: pick(r, "pogon kod", "pogon_kod"),
      ...r,
    })) },
  );

  const minimalMaster = minimalDeloviMasterIzKar(mergedKar);
  const sviMaster = [...atrMasterRows];
  minimalMaster.forEach((m) => {
    if (!sviMaster.some((x) => String(x.id_deo).toUpperCase() === String(m.id_deo).toUpperCase())) {
      sviMaster.push(m);
    }
  });

  const deloviExcel = spojiDeloviCsv(postojeciDelovi, deloviPogonRows, sviMaster);
  const sopExcel = spojiSopCsv(postojeciSop, sopRows).map(sopToExcelRow);

  const noviRn = generisiRadniNaloge(mergedKar, {
    postojeciRn: postojeciRn.map((r) => ({
      id: num(r.id),
      id_deo: pick(r, "id dela", "id_deo"),
      pogon_kod: pick(r, "pogon_kod", "pogon kod"),
      broj_naloga: pick(r, "radni nal", "broj_naloga"),
      ...r,
    })),
  });

  const rnFromGlavni = [];
  grupisiKarakteristike(izGlavnog).forEach((rows) => {
    const m = metaIzGrupe(rows);
    const broj = brojNalogaZaGrupu(m);
    if (!broj) return;
    rnFromGlavni.push({
      broj_naloga: broj,
      id_deo: m.id_deo,
      naziv_dela: m.naziv_dela,
      kolicina: m.ukupno_kom,
      pogon_kod: m.pogon_kod,
      status: "aktivan",
    });
  });

  let maxRnId = postojeciRn.reduce((m, r) => Math.max(m, num(r.id) || 0), 0);
  const rnByBroj = new Map();
  postojeciRn.forEach((r) => {
    const broj = pick(r, "radni nal", "broj_naloga").toUpperCase();
    if (broj) rnByBroj.set(broj, r);
  });
  [...noviRn, ...rnFromGlavni].forEach((r) => {
    const broj = String(r.broj_naloga).toUpperCase();
    const old = rnByBroj.get(broj);
    if (old) {
      rnByBroj.set(broj, { ...old, ...r, id: old.id ?? r.id });
    } else {
      maxRnId += 1;
      rnByBroj.set(broj, { ...r, id: maxRnId });
    }
  });
  const rnExcel = [...rnByBroj.values()].map(rnToExcelRow);

  const deloviIds = new Set(izGlavnog.map((r) => String(r.id_deo).toUpperCase()));

  const projectRoot = path.dirname(path.dirname(glavniPath));
  const csvDir = sifrarnikCsvDir(projectRoot);

  if (!dryRun) {
    upsertSheet(
      merljiveWb,
      "karakteristike_merljive",
      rowsToSheet(mergedKar.map(karToExcelRow), KARAKTERISTIKE_MERLJIVE_HEADER),
    );
    upsertSheet(
      merljiveWb,
      "sop_deo_varijabilni",
      rowsToSheet(sopExcel, Object.keys(sopExcel[0] || sopToExcelRow({}))),
    );

    upsertSheet(
      atrWb,
      "delovi",
      XLSX.utils.json_to_sheet(deloviExcel),
    );
    upsertSheet(
      atrWb,
      "radni_nalozi",
      rowsToSheet(rnExcel, RADNI_NALOZI_EXCEL_COLS.map(([, l]) => l)),
    );

    XLSX.writeFile(merljiveWb, merljivePath);
    XLSX.writeFile(atrWb, atributivnePath);

    exportSifrarnikCsv(csvDir, {
      mergedKar,
      sopExcel,
      deloviExcel,
      rnExcel,
      lookups,
    });
  }

  return {
    ok: true,
    dryRun,
    glavniSheets: sheets,
    delovi: deloviIds,
    karakteristike: mergedKar.length,
    izGlavnog: izGlavnog.length,
    sop: sopExcel.length,
    deloviRedova: deloviExcel.length,
    deloviPogon: deloviPogonRows.length,
    radniNalozi: rnExcel.length,
    pogonLookup: (lookups.pogonByLinija?.size) || 0,
    pogonCsvPath: path.join(csvDir, "pogon_kod.csv"),
    csvDir,
    merljivePath,
    atributivnePath,
  };
}

/** Parsiraj workbook za uvoz u app (vozilo + pogon). */
export function parseWorkbookZaUvoz(wb) {
  const redovi = [];
  const pogonRows = sheetRows(wb, "pogon_kod").map((r) => ({
    linija_faza: pick(r, "linija_faza", "linija"),
    linija_id: num(pick(r, "linija_id", "linij_id")),
    pogon_kod: pick(r, "pogon kod", "pogon_kod", "pogon").toUpperCase(),
  })).filter((r) => r.linija_faza);

  wb.SheetNames.forEach((name) => {
    if (!/^vozilo\d+$/i.test(name)) return;
    sheetRows(wb, name).forEach((raw, i) => {
      const payload = excelRawToDbPayload(raw, name, i);
      if (payload.id_deo && payload.karakteristika) redovi.push(payload);
    });
  });

  return { redovi, pogonRows };
}
