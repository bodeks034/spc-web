import XLSX from "xlsx";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getCodeLetter,
  getAcRePlan,
  planZaKlasu,
} from "../src/lib/aqlIso2859.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const wb = XLSX.read(readFileSync(join(__dirname, "../docs/AQL_Kalkulator.xlsm")), { type: "buffer" });

const AQLS = ["0.065", "0.1", "0.25", "0.4", "0.65", "1.0", "1.5", "2.5", "4.0", "6.5"];
const CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R"];

function parseLookup() {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Ac-Re Lookup"], { header: 1, defval: null });
  const out = {};
  for (let r = 4; r < rows.length; r++) {
    const row = rows[r];
    if (!row[0]) continue;
    const code = String(row[0]).trim();
    out[code] = { n: row[1], aql: {} };
    for (let i = 0; i < AQLS.length; i++) {
      const ac = row[2 + i * 2];
      const re = row[3 + i * 2];
      if (ac != null && re != null) out[code].aql[AQLS[i]] = { ac, re };
    }
  }
  return out;
}

function parseTableI() {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Z1.4 Tabele"], { header: 1, defval: null });
  const levels = ["I", "II", "III", "S-1", "S-2", "S-3", "S-4"];
  const out = [];
  for (const row of rows) {
    if (typeof row[2] === "number" && typeof row[3] === "number" && row[4]) {
      const lotMin = row[2];
      const lotMax = row[3] === "500001+" ? 999999999 : row[3];
      const codes = {};
      levels.forEach((lv, i) => { codes[lv] = row[4 + i]; });
      out.push({ lotMin, lotMax, codes });
    }
  }
  return out;
}

const lookup = parseLookup();
const tableI = parseTableI();
let mismatches = [];

for (const { lotMin, lotMax, codes } of tableI) {
  const lot = lotMin === 500001 ? 600000 : Math.floor((lotMin + Math.min(lotMax, 500000)) / 2);
  for (const [lv, expected] of Object.entries(codes)) {
    const got = getCodeLetter(lot, lv);
    if (got !== expected) mismatches.push({ type: "Table I", lot, level: lv, expected, got });
  }
}

for (const code of CODES) {
  const excel = lookup[code];
  if (!excel) continue;
  for (const aql of AQLS) {
    const ex = excel.aql[aql];
    if (!ex) continue;
    const got = getAcRePlan(code, aql, "Normalna");
    if (got.ac !== ex.ac || got.re !== ex.re) {
      mismatches.push({ type: "Ac/Re", code, aql, expected: ex, got: { ac: got.ac, re: got.re } });
    }
  }
}

const cases = [
  { lot: 5000, lv: "II", tip: "Normalna", aqls: { critical: "0", major: "1.0", minor: "4.0" },
    expect: { code: "L", major: { n: 200, ac: 5, re: 6 }, minor: { n: 200, ac: 14, re: 15 } } },
  { lot: 3000, lv: "II", tip: "Normalna", aqls: { critical: "1.0", major: "2.5", minor: "4.0" },
    expect: { code: "K", critical: { n: 125, ac: 3, re: 4 }, major: { n: 125, ac: 7, re: 8 }, minor: { n: 125, ac: 10, re: 11 } } },
  { lot: 1200, lv: "II", tip: "Normalna", aqls: { major: "0.65", minor: "2.5" },
    expect: { code: "J" } },
  { lot: 280, lv: "II", tip: "Pojacana", aqls: { major: "1.5", minor: "4.0" }, expect: {} },
  { lot: 500, lv: "I", tip: "Normalna", aqls: { major: "1.0", minor: "4.0" }, expect: {} },
];

for (const c of cases) {
  const expRoot = c.expect || {};
  const code = getCodeLetter(c.lot, c.lv);
  if (expRoot.code && code !== expRoot.code) {
    mismatches.push({ type: "case code", lot: c.lot, expected: expRoot.code, got: code });
  }
  for (const [cls, aql] of Object.entries(c.aqls || {})) {
    const p = planZaKlasu(c.lot, c.lv, aql, c.tip);
    const exp = expRoot[cls];
    if (exp) {
      if (p.n !== exp.n || p.ac !== exp.ac || p.re !== exp.re) {
        mismatches.push({ type: "case plan", lot: c.lot, cls, aql, expected: exp, got: { n: p.n, ac: p.ac, re: p.re, slovo: p.slovo } });
      }
    }
  }
}

console.log("Table I rows:", tableI.length);
console.log("Lookup codes:", Object.keys(lookup).length);
console.log("Mismatches:", mismatches.length);
if (mismatches.length) console.log(JSON.stringify(mismatches.slice(0, 20), null, 2));
else console.log("OK — web kalkulator = Excel Ac-Re Lookup + Z1.4 Table I");

// Kalkulator sheet snapshot
const k = XLSX.utils.sheet_to_json(wb.Sheets.Kalkulator, { header: 1 });
console.log("\nExcel Kalkulator (default):");
console.log("  Lot:", k[5][2], "Level:", k[9][2], "Tip:", k[10][2]);
console.log("  Kod:", k[17][2], k[17][5], k[17][8]);
console.log("  n:", k[18][2], k[18][5], k[18][8]);
console.log("  Ac:", k[19][2], k[19][5], k[19][8]);
console.log("  Re:", k[20][2], k[20][5], k[20][8]);

console.log("\nWeb:");
const wC = planZaKlasu(5000, "II", "0", "Normalna");
const wM = planZaKlasu(5000, "II", "1.0", "Normalna");
const wMi = planZaKlasu(5000, "II", "4.0", "Normalna");
console.log("  Kod:", getCodeLetter(5000, "II"), wM.slovo, wMi.slovo);
console.log("  n:", wC.n, wM.n, wMi.n);
console.log("  Ac:", wC.ac, wM.ac, wMi.ac);
console.log("  Re:", wC.re, wM.re, wMi.re);
