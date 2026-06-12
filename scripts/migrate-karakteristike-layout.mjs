/**
 * Konvertuje stari karakteristike_merljive.csv u novi layout (jedan tab).
 * node scripts/migrate-karakteristike-layout.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { propagirajMetaKarakteristika } from "../src/lib/definicijaKarakteristika.js";
import {
  KARAKTERISTIKE_MERLJIVE_HEADER,
  mapKarakteristikaMerljiveRow,
} from "../src/lib/karakteristikaMerljive.js";

const root = path.resolve(import.meta.dirname, "..");

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

async function readCsv(file) {
  const txt = await fs.readFile(file, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = cols[i] ?? ""; });
    return row;
  });
}

function rowToCsvLine(row, headers) {
  return headers.map((h) => {
    const v = row[h] ?? "";
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",");
}

async function convertFile(relPath) {
  const file = path.join(root, relPath);
  const raw = await readCsv(file);
  const propagated = propagirajMetaKarakteristika(raw.map((r) => {
    const legacy = { ...r };
    if (legacy.broj_merenja && !legacy.kom_za_kontrolu_n) {
      legacy.kom_za_kontrolu_n = legacy.broj_merenja;
    }
    if (!legacy.nivo_kontrole) {
      legacy.nivo_kontrole = legacy.atributivne === "DA" ? "DA" : "";
    }
    if (!legacy.ukupno_kom) legacy.ukupno_kom = "50";
    return legacy;
  }));
  const mapped = propagated.map(mapKarakteristikaMerljiveRow);
  const lines = [
    KARAKTERISTIKE_MERLJIVE_HEADER.join(","),
    ...mapped.map((r) => rowToCsvLine(r, KARAKTERISTIKE_MERLJIVE_HEADER)),
  ];
  await fs.writeFile(file, `${lines.join("\n")}\n`, "utf8");
  console.log(`✓ ${relPath} — ${mapped.length} redova`);
}

async function main() {
  await convertFile("docs/karakteristike_merljive.csv");
  await convertFile("excel-rad/sifrarnik-paket/csv/karakteristike_merljive.csv");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
