/**
 * Uklanja legacy FAI / broj_merenja iz CSV — vrednosti idu samo iz glavni unos.xlsx (kol. V/W/X).
 * node scripts/ocisti-legacy-fai-broj-csv.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { KARAKTERISTIKE_MERLJIVE_HEADER } from "../src/lib/karakteristikaMerljive.js";

const root = path.resolve(import.meta.dirname, "..");
const TARGETS = [
  "docs/karakteristike_merljive.csv",
  "excel rad izmenjen/sifrarnik-paket/csv/karakteristike_merljive.csv",
];

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === "," && !inQ) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function rowToCsvLine(row, headers) {
  return headers.map((h) => {
    const v = row[h] ?? "";
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",");
}

async function cleanFile(relPath) {
  const file = path.join(root, relPath);
  const txt = await fs.readFile(file, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  const clearCols = new Set(["nivo_kontrole", "fai_broj_merenja", "broj_merenja"]);
  let cleared = 0;

  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = cols[i] ?? ""; });
    for (const c of clearCols) {
      if (row[c]) {
        row[c] = "";
        cleared += 1;
      }
    }
    return row;
  });

  const outHeaders = KARAKTERISTIKE_MERLJIVE_HEADER.filter((h) => headers.includes(h) || headers.length < 5);
  const useHeaders = headers.some((h) => h === "klasa") ? headers : KARAKTERISTIKE_MERLJIVE_HEADER;
  const finalHeaders = useHeaders.length >= KARAKTERISTIKE_MERLJIVE_HEADER.length
    ? KARAKTERISTIKE_MERLJIVE_HEADER
    : headers;

  const out = [
    finalHeaders.join(","),
    ...rows.map((r) => rowToCsvLine(r, finalHeaders)),
  ];
  await fs.writeFile(file, `${out.join("\n")}\n`, "utf8");
  console.log(`✓ ${relPath} — očišćeno ${cleared} polja (nivo_kontrole / fai / broj_merenja)`);
}

for (const t of TARGETS) {
  await cleanFile(t);
}
