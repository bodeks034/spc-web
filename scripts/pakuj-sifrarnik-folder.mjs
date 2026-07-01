/**
 * Pakuje CSV iz excel rad izmenjen/sifrarnik-paket/csv → Excel master fajlovi.
 * node scripts/pakuj-sifrarnik-folder.mjs
 */
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { KARAKTERISTIKE_MERLJIVE_HEADER } from "../src/lib/karakteristikaMerljive.js";
import { sifrarnikPaketDir, sifrarnikCsvDir } from "../src/lib/sifrarnikPaths.js";

const root = path.resolve(import.meta.dirname, "..");
const csvDir = sifrarnikCsvDir(root);
const out = sifrarnikPaketDir(root);

const ATRIBUTIVNI = [
  ["linije", "linije.csv"],
  ["masine", "masine.csv"],
  ["smene", "smene.csv"],
  ["greske_katalog", "greske_katalog.csv"],
  ["katalog_gresaka_vozilo", "katalog_gresaka_vozilo.csv"],
  ["tipovi_vozila", "tipovi_vozila.csv"],
  ["kategorije_vozila", "kategorije_vozila.csv"],
  ["delovi_vozila", "delovi_vozila.csv"],
  ["delovi", "delovi.csv"],
  ["ciljevi", "ciljevi.csv"],
  ["radnici", "radnici.csv"],
  ["radni_nalozi", "radni_nalozi.csv"],
  ["kupci", "kupci.csv"],
  ["kontrolna_lista_stavke", "kontrolna_lista_stavke.csv"],
  ["merila", "merila.csv"],
  ["kalibracije", "kalibracije.csv"],
];

const MERLJIVE = [
  ["sop_deo_varijabilni", "sop_deo_varijabilni.csv"],
  ["karakteristike_merljive", "karakteristike_merljive.csv"],
  ["merenja_varijabilna", "merenja_varijabilna.csv"],
];

const KOPIRAJ_CSV = [
  ...ATRIBUTIVNI.map(([, f]) => f),
  ...MERLJIVE.map(([, f]) => f),
  "pogon_kod.csv",
  "ciljevi.csv",
  "kupci.csv",
  "merila.csv",
  "kalibracije.csv",
  "barkodi_sadrzaj.csv",
  "erp_radni_nalozi.example.csv",
  "deo_rucni.csv",
];

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
    if (ch === "," && !inQuotes) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function csvToSheet(csvPath) {
  const txt = readFileSync(csvPath, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return XLSX.utils.aoa_to_sheet([]);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
  return XLSX.utils.json_to_sheet(rows, { header: headers });
}

async function buildWorkbook(pairs, outName) {
  const wb = XLSX.utils.book_new();
  for (const [sheet, file] of pairs) {
    const p = path.join(csvDir, file);
    try {
      await fs.access(p);
      XLSX.utils.book_append_sheet(wb, csvToSheet(p), sheet.slice(0, 31));
    } catch {
      console.warn(`  preskačem (nema): ${file}`);
    }
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const target = path.join(out, outName);
  try {
    await fs.writeFile(target, buf);
    console.log(`  ${outName}`);
  } catch (e) {
    if (e?.code === "EBUSY") {
      const alt = outName.replace(/\.xlsx$/i, "_novo.xlsx");
      await fs.writeFile(path.join(out, alt), buf);
      console.warn(`  ${outName} zaključan — upisano: ${alt}`);
    } else {
      throw e;
    }
  }
}

const README = `# SPC — šifrarnik paket

**Radni folder:** \`excel rad izmenjen/sifrarnik-paket\`

## Tok (glavni unos → aplikacija)

1. Inženjer unosi u **\`../glavni unos.xlsx\`** (tabovi vozilo1, vozilo2, tab **pogon_kod**).
2. \`npm run sync:glavni-unos\` — automatski puni:
   - \`SPC_merljive.xlsx\` (karakteristike + SOP)
   - \`SPC_atributivne.xlsx\` (delovi po pogonu + radni nalozi)
   - \`csv/*.csv\` (iste tabele)
3. \`npm run sync:glavni-unos:import\` — uvoz u Supabase.

Ručna izmena: edituj CSV ovde ili Excel, pa \`npm run import:sifrarnik-paket\`.

### karakteristike_merljive — kolone
${KARAKTERISTIKE_MERLJIVE_HEADER.join(", ")}

**Pogon:** kolona \`Linija\` u glavnom unosu → tab \`pogon_kod\` → \`pogon_kod\` u šifrarniku.
`;

async function main() {
  await fs.mkdir(csvDir, { recursive: true });
  console.log("CSV izvor:", csvDir);
  console.log("Excel izlaz:", out);

  console.log("\nExcel:");
  await buildWorkbook(ATRIBUTIVNI, "SPC_atributivne.xlsx");
  await buildWorkbook(MERLJIVE, "SPC_merljive.xlsx");

  const demo = path.join(root, "public", "SPC_merljive_demo_5501_5503.xlsx");
  try {
    await fs.copyFile(demo, path.join(out, "SPC_merljive_demo_5501_5503.xlsx"));
    console.log("  SPC_merljive_demo_5501_5503.xlsx (kopija)");
  } catch { /* */ }

  await fs.writeFile(path.join(out, "CITAJ_ME.md"), README, "utf8");
  console.log("\nGotovo:", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
