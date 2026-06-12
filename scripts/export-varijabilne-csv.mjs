/**
 * Izvoz Varijabilne_SPC.xlsm → docs/*.csv
 * node scripts/export-varijabilne-csv.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import {
  KARAKTERISTIKE_MERLJIVE_HEADER,
  mapKarakteristikaMerljiveRow,
} from "../src/lib/karakteristikaMerljive.js";
import { parseDefinicijaRed } from "../src/lib/definicijaKarakteristika.js";

const DOCS = path.resolve("docs");
const XLSM = path.join(DOCS, "Varijabilne_SPC.xlsm");

function normHeader(h) {
  return String(h || "")
    .trim()
    .replace(/\*+$/, "")
    .replace(/š/gi, "s")
    .replace(/č/gi, "c")
    .replace(/ć/gi, "c")
    .replace(/ž/gi, "z")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

function sheetRows(wb, name) {
  const s = wb.Sheets[name];
  if (!s) return [];
  return XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
}

function toCsv(rows) {
  return rows
    .map(r => r.map(c => {
      const v = c == null ? "" : String(c);
      return v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(","))
    .join("\n") + "\n";
}

function excelDate(v) {
  if (typeof v === "number" && v > 40000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(v.trim())) {
    const [dd, mm, yy] = v.trim().split(".");
    return `${yy}-${mm}-${dd}`;
  }
  return String(v || "").trim();
}

function parseNum(v) {
  if (v === "" || v == null) return "";
  const s = String(v).replace(",", ".").replace(/[^\d.\-+eE]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : "";
}

function parseSmena(v) {
  const s = String(v || "").trim();
  if (!s) return "1";
  const first = s.split(",")[0].trim();
  const n = Number(first);
  return Number.isFinite(n) && n >= 1 && n <= 3 ? String(n) : "1";
}

async function main() {
  const wb = XLSX.readFile(XLSM);

  // ── karakteristike_merljive ← tab karakteristike_merljive ili legacy Definicija_Karakteristika
  const karHdr = KARAKTERISTIKE_MERLJIVE_HEADER;
  const karOut = [karHdr.join(",")];
  const karSheet = sheetRows(wb, "karakteristike_merljive");
  if (karSheet.length > 1) {
    const hdr = karSheet[0].map(normHeader);
    for (let i = 1; i < karSheet.length; i++) {
      const raw = {};
      hdr.forEach((h, j) => { raw[h] = karSheet[i][j] ?? ""; });
      const mapped = mapKarakteristikaMerljiveRow(raw);
      if (!mapped.id_deo || !mapped.pozicija) continue;
      karOut.push(karHdr.map((c) => mapped[c] ?? "").join(","));
    }
  } else {
    const defRows = sheetRows(wb, "Definicija_Karakteristika");
    let kid = 0;
    for (let i = 1; i < defRows.length; i++) {
      const parsed = parseDefinicijaRed(defRows[i]);
      if (!parsed) continue;
      kid += 1;
      const mapped = mapKarakteristikaMerljiveRow({ id: kid, ...parsed });
      karOut.push(karHdr.map((c) => mapped[c] ?? "").join(","));
    }
  }

  // ── merenja_varijabilna ← DATA
  const dataRows = sheetRows(wb, "DATA");
  const merHdr = [
    "id", "datum", "smena", "radni_nalog", "id_deo", "naziv_dela",
    "dimenzija", "izmereno", "status", "linija", "operater", "kontrolor",
    "merni_instrument", "masina",
  ];
  const merOut = [merHdr.join(",")];
  let mid = 0;
  for (let i = 2; i < dataRows.length; i++) {
    const r = dataRows[i];
    const idDeo = String(r[3] || "").trim().toUpperCase();
    const izm = parseNum(r[5]);
    if (!idDeo || izm === "") continue;
    mid += 1;
    merOut.push([
      mid,
      excelDate(r[0]),
      parseSmena(r[1]),
      String(r[2] || "").trim(),
      idDeo,
      String(r[4] || "").trim(),
      String(r[11] || r[6] || "").trim(),
      izm,
      String(r[6] || "").trim().toUpperCase(),
      String(r[7] || "").trim(),
      String(r[8] || "").trim(),
      "",
      String(r[9] || "").trim(),
      String(r[10] || "").replace(/^Ma[sš]ina:\s*/i, "").trim(),
    ].join(","));
  }

  // ── sop_deo_varijabilni ← SOP (zaglavlje po delu, kol. 21 = broj_merenja)
  const sopRows = sheetRows(wb, "SOP");
  const sopDeoHdr = [
    "id_deo", "radni_nalog", "naziv_dela", "slika", "masina", "linija",
    "broj_merenja", "kontrolor_ime",
  ];
  const sopDeoOut = [sopDeoHdr.join(",")];
  const sopDeoSeen = new Set();
  for (let i = 1; i < sopRows.length; i++) {
    const r = sopRows[i];
    const idDeo = String(r[3] || "").trim().toUpperCase();
    if (!idDeo || sopDeoSeen.has(idDeo)) continue;
    sopDeoSeen.add(idDeo);
    const br = parseNum(r[20]) || 5;
    sopDeoOut.push([
      idDeo, r[2], r[4], r[10], r[11], r[15], br, r[13],
    ].join(","));
  }

  // ── sop_varijabilni ← SOP (pun zapis, arhiva)
  const sopHdr = [
    "id", "datum", "smena", "radni_nalog", "id_deo", "naziv_dela",
    "karakteristika", "lsl", "usl", "target", "jedinica", "slika",
    "masina", "operater", "kontrolor", "merni_instrument", "linija", "proces", "operacija",
  ];
  const sopOut = [sopHdr.join(",")];
  for (let i = 1; i < sopRows.length; i++) {
    const r = sopRows[i];
    if (!String(r[3] || "").trim()) continue;
    sopOut.push([
      i,
      excelDate(r[0]),
      String(r[1] || "1"),
      r[2], String(r[3]).toUpperCase(), r[4], r[5],
      `"${String(r[6] || "").replace(/"/g, '""')}"`,
      `"${String(r[7] || "").replace(/"/g, '""')}"`,
      parseNum(r[8]),
      `"${String(r[9] || "").replace(/"/g, '""')}"`,
      r[10], r[11], r[12], r[13], r[14], r[15], r[16], r[17], r[18],
    ].join(","));
  }

  // ── linije_procesi ← Linije (prošireni katalog)
  const linRows = sheetRows(wb, "Linije");
  const linHdr = ["id", "linija", "proces", "operacija", "greska"];
  const linOut = [linHdr.join(",")];
  let lid = 0;
  const seen = new Set();
  for (let i = 1; i < linRows.length; i++) {
    const r = linRows[i];
    const linija = String(r[0] || "").trim();
    if (!linija) continue;
    const key = `${linija}|${r[1]}|${r[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lid += 1;
    linOut.push([lid, `"${linija}"`, `"${r[1] || ""}"`, `"${r[2] || ""}"`, `"${r[3] || ""}"`].join(","));
  }

  const files = {
    "karakteristike_merljive.csv": karOut.join("\n"),
    "merenja_varijabilna.csv": merOut.join("\n"),
    "sop_deo_varijabilni.csv": sopDeoOut.join("\n"),
    "sop_varijabilni.csv": sopOut.join("\n"),
    "linije_procesi_varijabilne.csv": linOut.join("\n"),
  };

  for (const [name, body] of Object.entries(files)) {
    await fs.writeFile(path.join(DOCS, name), body, "utf8");
    const lines = body.split("\n").length - 1;
    console.log(`✓ docs/${name} (${lines} redova)`);
  }

  console.log("\nSheet-ovi u xlsm:", wb.SheetNames.join(", "));
}

main().catch(e => { console.error(e); process.exit(1); });
