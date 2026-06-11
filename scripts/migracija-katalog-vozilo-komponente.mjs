/**
 * FINAL-001 (legacy jedan id) → komponentni katalog NTV-KAROS-001, MRAP-MOTOR-001…
 * node scripts/migracija-katalog-vozilo-komponente.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { VOZILO_ZONE } from "../src/lib/voziloZoneConfig.js";

const root = path.resolve(import.meta.dirname, "..");
const docs = path.join(root, "docs");
const outKomponente = path.join(root, "excel-rad", "katalog-vozilo-po-komponentama");

const VOZILA = ["NTV", "MRAP", "MRAP1"];

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    header.forEach((h, i) => { row[h.trim()] = (cols[i] ?? "").trim(); });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function escCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function zonaZaRed(kategorija, podkategorija) {
  for (const z of VOZILO_ZONE) {
    if (z.odgovaraKategorija(kategorija) && z.odgovaraPodkategorija(kategorija, podkategorija)) {
      return z.id;
    }
  }
  return "FINAL-001";
}

function toVoziloId(prefix, zonaId) {
  return `${prefix}-${zonaId}`;
}

async function main() {
  const srcPath = path.join(docs, "katalog_gresaka_vozilo.csv");
  const raw = await fs.readFile(srcPath, "utf8");
  const rows = parseCsv(raw);

  const legacy = rows.filter((r) => (r.id || "").toUpperCase() === "FINAL-001");
  if (!legacy.length) {
    console.error("Nema redova sa id=FINAL-001 — katalog je već migriran?");
    process.exit(1);
  }

  const migrated = [];
  const poZoni = {};

  for (const prefix of VOZILA) {
    for (const r of legacy) {
      const zona = zonaZaRed(r.kategorija, r.podkategorija);
      const vid = toVoziloId(prefix, zona);
      const out = {
        id: vid,
        kategorija: r.kategorija,
        podkategorija: r.podkategorija,
        defekt: r.defekt,
      };
      migrated.push(out);
      const key = `${prefix}/${zona}`;
      if (!poZoni[key]) poZoni[key] = [];
      poZoni[key].push(out);
    }
  }

  const header = "id,kategorija,podkategorija,defekt\n";
  const body = migrated.map((r) =>
    [r.id, r.kategorija, r.podkategorija, r.defekt].map(escCsv).join(",")
  ).join("\n");

  const outPath = path.join(docs, "katalog_gresaka_vozilo.csv");
  await fs.writeFile(outPath, header + body + "\n", "utf8");

  await fs.mkdir(outKomponente, { recursive: true });
  for (const [key, list] of Object.entries(poZoni)) {
    const [prefix, zona] = key.split("/");
    const fname = `${prefix}-${zona}.csv`;
    const content = header + list.map((r) =>
      [r.id, r.kategorija, r.podkategorija, r.defekt].map(escCsv).join(",")
    ).join("\n") + "\n";
    await fs.writeFile(path.join(outKomponente, fname), content, "utf8");
  }

  const stats = {};
  for (const r of migrated.filter((x) => x.id.startsWith("NTV-"))) {
    const z = r.id.replace("NTV-", "");
    stats[z] = (stats[z] || 0) + 1;
  }

  console.log(`Migracija završena: ${legacy.length} legacy redova → ${migrated.length} redova (${VOZILA.length} vozila)`);
  console.log("NTV raspodela po zoni:");
  for (const [z, n] of Object.entries(stats).sort()) console.log(`  ${z}: ${n}`);
  console.log(`\nGlavni fajl: ${outPath}`);
  console.log(`Po komponenti: ${outKomponente} (${Object.keys(poZoni).length} fajlova)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
