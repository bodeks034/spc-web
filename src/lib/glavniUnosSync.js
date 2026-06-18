/**
 * glavni unos.xlsx (inženjer) → SPC_merljive.xlsx + SPC_atributivne.xlsx
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { KARAKTERISTIKE_MERLJIVE_HEADER } from "./karakteristikaMerljive.js";
import {
  mapKarakteristikaMerljiveRow,
  dodeliSerijeMerenja,
  normalizujKarakteristikuRed,
  KARAKTERISTIKE_UPSERT_CONFLICT,
} from "./karakteristikaMerljive.js";
import { dedupeRowsForUpsert } from "./upsertUtil.js";
import { propagirajMetaKarakteristika } from "./definicijaKarakteristika.js";
import {
  generisiIzKarakteristika,
  generisiRadniNaloge,
  brojNalogaZaGrupu,
  spojiDeloviCsv,
  spojiSopCsv,
  spojiRadniNalogeCsv,
  deoRedZaExcel,
  pogonIzLinijeFaze,
  grupisiKarakteristike,
  metaIzGrupe,
} from "./syncSifrarnikIzMerljivih.js";
import { RADNI_NALOZI_EXCEL_COLS } from "./excelColumnDefs.js";
import { normHeader } from "./radniNaloziUvoz.js";
import {
  GLAVNI_UNOS_BROJ_MERENJA_DEFAULT,
  GLAVNI_UNOS_COL_BROJ_MERENJA,
} from "./spcDefaults.js";
import {
  pogonLinijaMapIzGlavnogUnosa,
  setPogonLinijaMap,
} from "./pogonLinijaLookup.js";
import { sifrarnikCsvDir } from "./sifrarnikPaths.js";

const VOZILO_SHEET_RE = /^vozilo\d+$/i;

/** Podrazumevano SPC merenja po dimenziji kad je Tip=Merljiva a kolona X prazna. */
export { GLAVNI_UNOS_BROJ_MERENJA_DEFAULT, GLAVNI_UNOS_COL_BROJ_MERENJA };

/** Kolone voziloN sheeta — V/W/X = nivo FAI + broj merenja (glavni unos). */
export const GLAVNI_UNOS_VOZILO_HEADERS = [
  "id", "Datum", "id_deo", "Broj crteza", "Radni_nalog", "Naziv dela", "Slika",
  "Linija", "Operacija", "Masina_id", "Ukupno_kom", "Kom_za_kontrolu_n",
  "Karakteristika", "Klasa", "Nominal", "USL", "LSL", "Jedinica", "Tip", // S
  "Instrument", "Kontolor",
  "Nivo_kontrole FAC", // V
  "FAC broj", // W
  GLAVNI_UNOS_COL_BROJ_MERENJA, // X
  "Reakcioni plan",
  "Podatke uneo",
];

function nk(s) {
  return normHeader(s);
}

function pick(row, ...keys) {
  for (const k of keys) {
    for (const [hk, val] of Object.entries(row || {})) {
      if (nk(hk) === nk(k) && val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
  }
  return "";
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function sheetRows(wb, name) {
  if (!wb.Sheets[name]) return [];
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });
}

/** Lookup tabele iz glavni unos (pogon_kod, Pomocni). */
export function buildGlavniUnosLookups(wb) {
  const pogonByLinija = new Map();
  sheetRows(wb, "pogon_kod").forEach((r) => {
    const faza = pick(r, "linija_faza", "linija");
    if (!faza) return;
    pogonByLinija.set(nk(faza), {
      linija_id: num(pick(r, "linija_id", "linij_id")),
      pogon: pick(r, "pogon kod", "pogon_kod", "pogon").toUpperCase(),
      linija_faza: faza,
    });
  });

  const linijaByName = new Map();
  const masinaByLinijaOperacija = new Map();
  sheetRows(wb, "Pomocni").forEach((r) => {
    const linija = pick(r, "linija");
    if (linija) {
      linijaByName.set(nk(linija), {
        id_linija: num(pick(r, "id_linija", "linija id")),
        linija,
      });
    }
    const op = pick(r, "operacija");
    const masinaNaziv = pick(r, "naziv masine", "masina");
    if (linija && op && masinaNaziv) {
      masinaByLinijaOperacija.set(`${nk(linija)}|${nk(op)}`, masinaNaziv);
    }
  });

  return { pogonByLinija, linijaByName, masinaByLinijaOperacija };
}

/** Tip=S + prazna X → 5 za Merljiva; Atributivna ignoriše X. */
export function brojMerenjaIzGlavnogUnosaReda(raw, tip) {
  const tipL = String(tip || "").toLowerCase();
  const n = num(pick(
    raw,
    GLAVNI_UNOS_COL_BROJ_MERENJA,
    "Broj merenja ucestalost (1/h)",
    "Broj merenja",
    "broj_merenja",
    "Broj_merenja",
  ));
  if (tipL.includes("atributiv")) return null;
  if (tipL.includes("merljiv") && !n) return GLAVNI_UNOS_BROJ_MERENJA_DEFAULT;
  return n;
}

/** Jedan red iz voziloN sheeta → kanonski oblik za mapKarakteristikaMerljiveRow. */
export function mapGlavniUnosVoziloRed(raw, lookups) {
  const idDeo = pick(raw, "id_deo", "id dela").toUpperCase();
  if (!idDeo) return null;

  const linijaFaza = pick(raw, "Linija", "linija", "linija_faza");
  const pogonInfo = lookups.pogonByLinija.get(nk(linijaFaza));
  const linijaInfo = lookups.linijaByName.get(nk(linijaFaza));
  let pogon = pogonInfo?.pogon || pogonIzLinijeFaze(linijaFaza) || "";
  if (!pogon && linijaFaza) {
    // Poslednji pokušaj: sufiks RN (RN-2026-NT001-B)
    const rnProbe = pick(raw, "Radni_nalog", "radni_nalog", "radni nalog");
    const m = String(rnProbe || "").trim().toUpperCase().match(/-([A-H])$/);
    if (m) pogon = m[1];
  }

  const operacija = pick(raw, "Operacija", "operacija", "faza_naziv");
  let masinaId = num(pick(raw, "Masina_id", "masina_id", "masina id"));
  if (!masinaId) {
    const masinaNaziv = lookups.masinaByLinijaOperacija.get(`${nk(linijaFaza)}|${nk(operacija)}`);
    if (masinaNaziv) masinaId = num(masinaNaziv.replace(/\D/g, "")) || 1;
  }

  const karakteristika = pick(raw, "Karakteristika", "karakteristika", "pozicija");
  const tip = pick(raw, "Tip", "tip").toLowerCase();
  let instrument = pick(raw, "Instrument", "merni_instrument", "merni instrument");
  if (tip.includes("atributiv")) {
    if (!instrument) instrument = /dokument/i.test(karakteristika) ? "Dokumentacija" : "Vizuelno";
  }

  const nivoRaw = pick(raw, "Nivo_kontrole FAC", "nivo_kontrole", "nivo kontrole");
  const faiRaw = pick(raw, "FAC broj", "fai_broj_merenja", "fai broj merenja");

  return {
    id_deo: idDeo,
    pogon_kod: pogon,
    sifra_merenja: pick(raw, "sifra_merenja", "sifra merenja"),
    broj_merenja: brojMerenjaIzGlavnogUnosaReda(raw, tip),
    klasa: pick(raw, "Klasa", "klasa"),
    radni_nalog: pick(raw, "Radni_nalog", "radni_nalog", "radni nalog"),
    faza_naziv: operacija,
    linija_faza: linijaFaza,
    linija_id: pogonInfo?.linija_id ?? linijaInfo?.id_linija ?? null,
    masina_id: masinaId,
    naziv_dela: pick(raw, "Naziv dela", "naziv_dela"),
    slika: pick(raw, "Slika", "slika"),
    ukupno_kom: num(pick(raw, "Ukupno_kom", "ukupno_kom")),
    kom_za_kontrolu_n: num(pick(raw, "Kom_za_kontrolu_n", "kom za kontrolu n")),
    pozicija: karakteristika,
    naziv_mere: karakteristika,
    nominala: num(pick(raw, "Nominal", "nominala")),
    usl: num(pick(raw, "USL", "usl")),
    lsl: num(pick(raw, "LSL", "lsl")),
    jedinica: pick(raw, "Jedinica", "jedinica") || "mm",
    merni_instrument: instrument,
    napomena: pick(raw, "Reakcioni plan", "napomena"),
    nivo_kontrole: nivoRaw || null,
    fai_broj_merenja: num(faiRaw),
  };
}

/** Svi redovi iz vozilo1, vozilo2, … sheeta. */
export function parseGlavniUnosVoziloSheets(wb) {
  const lookups = buildGlavniUnosLookups(wb);
  setPogonLinijaMap(pogonLinijaMapIzGlavnogUnosa(lookups.pogonByLinija));
  const sheets = [];
  const karakteristike = [];

  wb.SheetNames.forEach((name) => {
    if (!VOZILO_SHEET_RE.test(name)) return;
    const rows = sheetRows(wb, name).filter((r) => pick(r, "id_deo", "id dela"));
    if (!rows.length) return;
    sheets.push({ name, redova: rows.length });

    rows.forEach((raw) => {
      const mapped = mapGlavniUnosVoziloRed(raw, lookups);
      if (!mapped) return;
      const kar = mapKarakteristikaMerljiveRow(mapped);
      if (kar.id_deo && kar.pozicija) karakteristike.push(kar);
    });
  });

  const saSerijama = dodeliSerijeMerenja(propagirajMetaKarakteristika(karakteristike));

  return { lookups, sheets, karakteristike: saSerijama };
}

function karKey(r) {
  const nr = normalizujKarakteristikuRed(r);
  const pogon = String(nr.pogon_kod || "").trim().toUpperCase();
  return [
    String(nr.id_deo).toUpperCase(),
    pogon,
    String(nr.sifra_merenja || "").trim(),
    String(nr.pozicija).trim(),
  ].join("|");
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

/** Upiši generisane tabele u sifrarnik-paket/csv (pored Excela). */
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

/** Zameni karakteristike za delove iz glavnog unosa; ostali delovi ostaju. */
export function mergeKarakteristike(postojeci, izGlavnog) {
  const touchedDeo = new Set(izGlavnog.map((r) => String(r.id_deo).toUpperCase()));
  const kept = (postojeci || []).filter((r) => !touchedDeo.has(String(r.id_deo).toUpperCase()));

  let maxId = [...kept, ...izGlavnog].reduce((m, r) => Math.max(m, num(r.id) || 0), 0);
  const byKey = new Map();
  kept.forEach((r) => byKey.set(karKey(r), { ...r }));

  izGlavnog.forEach((r) => {
    const key = karKey(r);
    const old = byKey.get(key);
    const id = old?.id ?? (++maxId);
    byKey.set(key, { ...old, ...r, id });
  });

  return dedupeRowsForUpsert(
    [...byKey.values()].map(normalizujKarakteristikuRed),
    KARAKTERISTIKE_UPSERT_CONFLICT,
  ).sort((a, b) => {
    const c = String(a.id_deo).localeCompare(String(b.id_deo));
    return c !== 0 ? c : String(a.pozicija).localeCompare(String(b.pozicija));
  });
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

function loadWorkbook(path) {
  try {
    return readWorkbookFile(path);
  } catch {
    return XLSX.utils.book_new();
  }
}

/** Upiši tab pogon_kod iz glavnog unosa u docs/pogon_kod.csv (referenca + uvoz). */
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

/**
 * Sync glavni unos → merljive + atributivne Excel fajlovi.
 */
export async function syncGlavniUnosToSpc({
  glavniPath,
  merljivePath,
  atributivnePath,
  dryRun = false,
} = {}) {
  const glavniWb = readWorkbookFile(glavniPath);
  const { lookups, sheets, karakteristike: izGlavnog } = parseGlavniUnosVoziloSheets(glavniWb);

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
