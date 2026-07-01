#!/usr/bin/env node
/**
 * PFMEA + Control Plan iz jednog ili više Excel fajlova → JSON arhiva.
 *
 * node scripts/build-pfmea-cp-iz-excel.mjs [fajl.xlsx | folder/]
 * node scripts/build-pfmea-cp-iz-excel.mjs docs/knowledge/pfmea-cp/
 *
 * Bez argumenata: docs/knowledge/pfmea-cp/ + legacy PFMEA_ControlPlan_Industrijski_Delovi.xlsx
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOLDER_PFMEA = path.join(ROOT, "docs/knowledge/pfmea-cp");
const LEGACY_XLSX = path.join(ROOT, "docs/knowledge/PFMEA_ControlPlan_Industrijski_Delovi.xlsx");
const OUT = path.join(ROOT, "src/data/pfmea-control-plan-industrijski.json");

function clean(s) {
  return String(s ?? "").replace(/\r/g, "").trim();
}

function headerKey(h, i = 0) {
  return clean(h).toLowerCase()
    .replace(/[^a-z0-9čćšđž]+/gi, "_")
    .replace(/^_|_$/g, "")
    || `col_${i}`;
}

/** Proširi spojene ćelije (!merges) — vrednost iz gornjeg-levog ugla u celu merge oblast. */
function applyMergedCells(rows, merges) {
  if (!merges?.length) return { rows, filled: 0 };

  const grid = rows.map((r) => (Array.isArray(r) ? [...r] : []));
  let filled = 0;

  for (const m of merges) {
    const s = m.s;
    const e = m.e;
    if (s == null || e == null) continue;

    const val = grid[s.r]?.[s.c];
    if (!clean(val)) continue;

    for (let r = s.r; r <= e.r; r++) {
      if (!grid[r]) grid[r] = [];
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue;
        if (!clean(grid[r][c])) {
          grid[r][c] = val;
          filled++;
        }
      }
    }
  }

  return { rows: grid, filled };
}

/** Kolone koje se u PFMEA/CP često spajaju vertikalno — prazna ćelija nasleđuje vrednost iz reda iznad. */
const FORWARD_FILL_HEADER_RE = /^(br_dela|proces|operacija|mod_greske|karakteristika|col_0)/;

function forwardFillGroupedColumns(rows, headerRowIdx, startIdx, headers) {
  const fillCols = headers
    .map((h, i) => ({ i, k: headerKey(h, i) }))
    .filter(({ k }) => FORWARD_FILL_HEADER_RE.test(k))
    .map(({ i }) => i);

  if (!fillCols.length) return 0;

  let filled = 0;
  for (const c of fillCols) {
    let last = "";
    for (let r = startIdx; r < rows.length; r++) {
      if (!rows[r]) rows[r] = [];
      const v = clean(rows[r][c]);
      if (v) last = rows[r][c];
      else if (last) {
        rows[r][c] = last;
        filled++;
      }
    }
  }
  return filled;
}

const HEADER_ROW_IDX = 3;
const DATA_START_IDX = 4;

function prepareSheetRows(ws) {
  let rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const { rows: merged, filled: mergeFilled } = applyMergedCells(rows, ws["!merges"]);
  rows = merged;

  const headers = (rows[HEADER_ROW_IDX] || []).map((h, i) => headerKey(h, i));
  const forwardFilled = forwardFillGroupedColumns(rows, HEADER_ROW_IDX, DATA_START_IDX, headers);

  return { rows, mergeFilled, forwardFilled, mergeRegions: ws["!merges"]?.length || 0 };
}

function rowData(rows, headerRowIdx = HEADER_ROW_IDX, startIdx = DATA_START_IDX) {
  const headers = (rows[headerRowIdx] || []).map((h, i) => headerKey(h, i));
  const out = [];
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some((c) => clean(c))) continue;
    const obj = {};
    row.forEach((cell, j) => {
      const k = headers[j] || `col_${j}`;
      if (k && clean(cell)) obj[k] = clean(cell);
    });
    if (Object.keys(obj).length >= 2) out.push(normalizujRed(obj));
  }
  return out;
}

function normalizujRed(o) {
  const map = {
    br_dela: ["br_dela", "br_dela_id", "col_0"],
    proces: ["proces_operacija", "proces", "operacija_proces", "operacija"],
    mod_greske: ["mod_greske", "mod_greške"],
    uzrok_greske: ["uzrok_greske", "uzrok_greške"],
    efekat_greske: ["efekat_greske", "efekat_greške"],
    s: ["s_ozbiljnost", "s"],
    uzrok_mehanizam: ["uzrok_mehanizam", "uzrok_pojavljivanje"],
    o: ["o_pojavl", "o"],
    postojece_kontrole: ["postojeće_kontrole", "postojece_kontrole"],
    d: ["d_otkrivanje", "d"],
    rpn_before: ["rpn_before", "rpn_before_1"],
    akcija: ["preporučena_akcija", "preporucena_akcija", "preporučene_akcije_korektivne_mere"],
    odgovorni: ["odgovorni", "odgovornost"],
    rok: ["rok"],
    karakteristika: ["karakteristika_kontrole", "karakteristika_ksk_vsk", "karakteristika"],
    klasifikacija: ["klasifikacija_karakt", "klasifikacija"],
    nominalna: ["nominalna_vrednost", "nominalna"],
    tolerancija: ["tolerancija_spec", "tolerancija"],
    metoda: ["metoda_merenja_kontrole", "metoda_merenja", "metoda_kontrole"],
    oprema: ["oprema_instrument", "oprema"],
    msa: ["msa_status", "msa"],
    ucestalost: ["učestalost_kontrole", "ucestalost_kontrole", "u_estalost"],
    velicina_uzoraka: ["veličina_uzorka", "velicina_uzoraka"],
    reakcija_nekontrolisano: ["reakcija_na_nekontrolisano_stanje", "reakcija_nekontrolisano"],
    reakcija_neispravno: ["reakcija_na_neispravan_deo", "reakcija_neispravno"],
  };
  const out = {};
  for (const [canon, keys] of Object.entries(map)) {
    for (const k of keys) {
      if (o[k]) { out[canon] = o[k]; break; }
    }
  }
  for (const [k, v] of Object.entries(o)) {
    if (!Object.values(out).includes(v)) {
      const canon = Object.keys(out).find((c) => out[c] === v);
      if (!canon && !out[k]) out[k] = v;
    }
  }
  return out;
}

function parseRpnSummary(rows) {
  const out = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const dio = clean(r[0]);
    if (!dio || dio.startsWith("PROSEK")) continue;
    out.push({
      dio,
      mod_greske: clean(r[1]),
      s: clean(r[2]),
      o: clean(r[3]),
      d: clean(r[4]),
      rpn_before: clean(r[5]),
      rpn_after: clean(r[6]),
      poboljsanje: clean(r[7]),
    });
  }
  return out;
}

function spojiRpnAfter(pfmea, rpnSummary) {
  for (const p of pfmea) {
    const hit = rpnSummary.find((r) =>
      p.mod_greske && r.mod_greske && (
        r.mod_greske.toLowerCase().includes(p.mod_greske.slice(0, 12).toLowerCase())
        || p.mod_greske.toLowerCase().includes(r.mod_greske.slice(0, 12).toLowerCase())
      ),
    );
    if (hit?.rpn_after) p.rpn_after = hit.rpn_after;
  }
}

function parseWorkbook(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath);
  const pfmeaSheet = wb.Sheets.PFMEA;
  const cpSheet = wb.Sheets["Control Plan"];
  if (!pfmeaSheet && !cpSheet) {
    console.warn(`  ⚠ Preskačem (nema listova PFMEA / Control Plan): ${path.basename(xlsxPath)}`);
    return { pfmea: [], controlPlan: [], rpnSummary: [] };
  }

  let pfmea = [];
  let controlPlan = [];

  if (pfmeaSheet) {
    const prep = prepareSheetRows(pfmeaSheet);
    pfmea = rowData(prep.rows);
    if (prep.mergeRegions || prep.mergeFilled || prep.forwardFilled) {
      console.log(`  PFMEA merge: ${prep.mergeRegions} regiona, ${prep.mergeFilled} ćelija + ${prep.forwardFilled} nasleđeno`);
    }
  }

  if (cpSheet) {
    const prep = prepareSheetRows(cpSheet);
    controlPlan = rowData(prep.rows);
    if (prep.mergeRegions || prep.mergeFilled || prep.forwardFilled) {
      console.log(`  CP merge: ${prep.mergeRegions} regiona, ${prep.mergeFilled} ćelija + ${prep.forwardFilled} nasleđeno`);
    }
  }

  const rpnRows = wb.Sheets["RPN Summary"]
    ? XLSX.utils.sheet_to_json(wb.Sheets["RPN Summary"], { header: 1, defval: "" })
    : [];
  const rpnSummary = rpnRows.length ? parseRpnSummary(rpnRows) : [];
  spojiRpnAfter(pfmea, rpnSummary);

  return { pfmea, controlPlan, rpnSummary };
}

async function resolveXlsxPaths(arg) {
  if (arg) {
    const stat = await fs.stat(arg).catch(() => null);
    if (!stat) {
      console.error(`Putanja ne postoji: ${arg}`);
      process.exit(1);
    }
    if (stat.isDirectory()) {
      const names = await fs.readdir(arg);
      const fromDir = names
        .filter((n) => n.toLowerCase().endsWith(".xlsx") && !n.startsWith("~$"))
        .map((n) => path.join(arg, n))
        .sort();
      if (fromDir.length) return fromDir;
      try {
        await fs.access(LEGACY_XLSX);
        console.warn(`Folder prazan — koristim legacy: ${path.basename(LEGACY_XLSX)}`);
        return [LEGACY_XLSX];
      } catch { return []; }
    }
    return [arg];
  }

  const paths = [];
  const folderFiles = await fs.readdir(FOLDER_PFMEA).catch(() => []);
  for (const n of folderFiles.filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$")).sort()) {
    paths.push(path.join(FOLDER_PFMEA, n));
  }
  try {
    await fs.access(LEGACY_XLSX);
    if (!paths.some((p) => path.resolve(p) === path.resolve(LEGACY_XLSX))) {
      paths.push(LEGACY_XLSX);
    }
  } catch { /* nema legacy */ }
  return paths;
}

async function main() {
  const arg = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : null;
  const xlsxPaths = await resolveXlsxPaths(arg);

  if (!xlsxPaths.length) {
    console.error("Nema .xlsx fajlova. Stavite ih u docs/knowledge/pfmea-cp/ ili prosledite putanju.");
    process.exit(1);
  }

  const allPfmea = [];
  const allCp = [];
  const allRpn = [];
  const izvori = [];

  for (const xlsxPath of xlsxPaths) {
    console.log(`→ ${path.relative(ROOT, xlsxPath)}`);
    const { pfmea, controlPlan, rpnSummary } = parseWorkbook(xlsxPath);
    allPfmea.push(...pfmea);
    allCp.push(...controlPlan);
    allRpn.push(...rpnSummary);
    izvori.push(path.basename(xlsxPath));
    console.log(`  PFMEA ${pfmea.length}, CP ${controlPlan.length}`);
  }

  const payload = {
    verzija: 1,
    izvor: izvori.length === 1 ? izvori[0] : izvori,
    pfmea: { redovi: allPfmea },
    controlPlan: { redovi: allCp },
    rpnSummary: allRpn,
  };

  await fs.writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`\n✓ Ukupno PFMEA ${allPfmea.length}, CP ${allCp.length} redova → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
