/**
 * Uklanja duplirane kolone usl_text / lsl_text iz docs/karakteristike_merljive.csv
 * node scripts/cisti-karakteristike-csv.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const file = path.join(import.meta.dirname, "..", "docs", "karakteristike_merljive.csv");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function esc(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

const txt = await fs.readFile(file, "utf8");
const lines = txt.split(/\r?\n/).filter((l) => l.trim());
const headers = parseCsvLine(lines[0]);
const drop = new Set(["usl_text", "lsl_text"]);
const keep = headers.map((h, i) => (drop.has(h) ? -1 : i)).filter((i) => i >= 0);
const newHeaders = headers.filter((h) => !drop.has(h));

const out = [newHeaders.join(",")];
for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  out.push(keep.map((idx) => esc(cols[idx])).join(","));
}

await fs.writeFile(file, `${out.join("\n")}\n`, "utf8");
console.log("Zaglavlje:", newHeaders.join(" | "));
console.log(`Kolona: ${newHeaders.length}, redova: ${out.length - 1}`);
