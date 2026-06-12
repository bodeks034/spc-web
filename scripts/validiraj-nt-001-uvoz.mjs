/**
 * Provera NT-001 šifrarnika pre uvoza u Supabase.
 * node scripts/validiraj-nt-001-uvoz.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import {
  generisiIzKarakteristika,
  generisiRadniNaloge,
} from "../src/lib/syncSifrarnikIzMerljivih.js";
import { previewMerljiveImport } from "../src/lib/excelSync.js";

const root = path.resolve(import.meta.dirname, "..");
const docs = path.join(root, "docs");
const paket = path.join(root, "excel-rad", "sifrarnik-paket");
const backupDir = path.join(root, "backup supabase");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

async function readCsv(file) {
  const txt = await fs.readFile(file, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
  return rows;
}

function ok(msg) { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.warn(`  ⚠ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); }

async function main() {
  console.log("NT-001 validacija\n");

  const kar = (await readCsv(path.join(docs, "karakteristike_merljive.csv")))
    .filter((r) => String(r.id_deo).toUpperCase() === "NT-001");

  if (!kar.length) {
    fail("Nema NT-001 u docs/karakteristike_merljive.csv");
    process.exit(1);
  }
  ok(`${kar.length} karakteristika NT-001 u CSV`);

  const bezPogona = kar.filter((r) => !String(r.pogon_kod || "").trim());
  if (bezPogona.length) fail(`${bezPogona.length} redova bez pogon_kod`);
  else ok("Svi redovi imaju pogon_kod");

  const ulazna = kar.filter((r) => String(r.pogon_kod).toUpperCase() === "A");
  const debljina = ulazna.find((r) => String(r.pozicija || "").includes("Debljina lima"));
  const komA = debljina ? Number(debljina.kom_za_kontrolu_n) : null;
  if (komA === 3) ok("Ulazna (pogon A): kom_za_kontrolu_n Debljina lima = 3");
  else warn(`Ulazna (pogon A): kom_za_kontrolu_n = ${komA ?? "?"} (očekivano 3)`);

  const viz = ulazna.filter((r) => /vizueln/i.test(String(r.merni_instrument || "")));
  if (viz.length >= 1) ok(`${viz.length} vizuelna merenja na ulaznoj (→ atributivne)`);
  else warn("Nema vizuelnih redova na ulaznoj");

  const visina = kar.find((r) => String(r.pozicija || "").includes("Visina nosaca"));
  if (visina && Number(visina.lsl) === 154.8) ok("LSL Visina nosaca = 154.8");
  else if (visina) warn(`LSL Visina nosaca = ${visina.lsl} (očekivano 154.8)`);

  const gen = generisiIzKarakteristika(kar);
  const rn = generisiRadniNaloge(kar, { postojeciRn: [] });
  ok(`Auto-sync iz CSV: SOP ${gen.sopRows.length}, delovi pogon ${gen.deloviPogonRows.length}, RN ${rn.length}`);

  const rnCsv = (await readCsv(path.join(docs, "radni_nalozi.csv")))
    .filter((r) => {
      const id = String(r["id dela*"] || r["id dela"] || r.id_deo || "").toUpperCase();
      return id === "NT-001";
    });
  ok(`radni_nalozi.csv: ${rnCsv.length} NT-001 redova`);
  if (rnCsv.length < 8) warn(`Očekivano 8 RN za pogone A–H, ima ${rnCsv.length}`);

  const merPath = path.join(paket, "SPC_merljive.xlsx");
  try {
    await fs.access(merPath);
    const wb = XLSX.readFile(merPath);
    const prev = previewMerljiveImport(wb);
    const ntKar = (await readCsv(path.join(docs, "karakteristike_merljive.csv")))
      .filter((r) => String(r.id_deo).toUpperCase() === "NT-001");
    const genX = generisiIzKarakteristika(ntKar);
    const rnX = generisiRadniNaloge(ntKar, { postojeciRn: rnCsv });
    for (const p of prev) {
      if (p.mappedCount) ok(`Excel tab ${p.sheet}: ${p.mappedCount} redova`);
    }
    ok(`NT-001 auto-sync (CSV): SOP ${genX.sopRows.length}, delovi ${genX.deloviPogonRows.length}, RN ${rnX.length}`);
  } catch {
    warn("Nema SPC_merljive.xlsx — pokreni: npm run pakuj:sifrarnik");
  }

  await fs.mkdir(backupDir, { recursive: true });
  const copies = [
    [path.join(paket, "SPC_merljive.xlsx"), "SPC_merljive_NT001_ispravno.xlsx"],
    [path.join(paket, "SPC_master_atributivne.xlsx"), "SPC_master_NT001_ispravno.xlsx"],
  ];
  for (const [src, name] of copies) {
    try {
      await fs.copyFile(src, path.join(backupDir, name));
      ok(`Kopija: backup supabase/${name}`);
    } catch {
      warn(`Nije kopirano: ${name}`);
    }
  }

  console.log("\nUvoz u aplikaciji:");
  console.log("  1. Admin → SPC_master_NT001_ispravno.xlsx (ili sifrarnik-paket master)");
  console.log("  2. Admin → SPC_merljive_NT001_ispravno.xlsx");
  console.log("  3. Ctrl+F5");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
