/**
 * Spaja CSV iz excel-rad/katalog-vozilo-po-komponentama/ → docs/katalog_gresaka_vozilo.csv
 * node scripts/spoji-katalog-vozilo.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const srcDir = path.join(root, "excel-rad", "katalog-vozilo-po-komponentama");
const outDocs = path.join(root, "docs", "katalog_gresaka_vozilo.csv");
const outPaket = path.join(root, "excel-rad", "sifrarnik-paket", "csv", "katalog_gresaka_vozilo.csv");

const REDOSLED_ZONE = ["KAROS-001", "MOTOR-001", "TRANS-001", "INT-001", "EL-001", "FINAL-001"];
const REDOSLED_VOZILA = ["NTV", "MRAP", "MRAP1"];

function sortKey(filename) {
  const base = filename.replace(/\.csv$/i, "");
  const voz = REDOSLED_VOZILA.find((p) => base.startsWith(`${p}-`)) || base;
  const zona = REDOSLED_ZONE.find((z) => base.endsWith(z)) || base;
  return `${REDOSLED_VOZILA.indexOf(voz)}-${REDOSLED_ZONE.indexOf(zona)}-${base}`;
}

async function main() {
  const files = (await fs.readdir(srcDir))
    .filter((f) => f.endsWith(".csv"))
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b), undefined, { numeric: true }));

  if (!files.length) {
    console.error(`Nema CSV u: ${srcDir}`);
    process.exit(1);
  }

  const header = "id,kategorija,podkategorija,defekt";
  const dataLines = [];

  for (const file of files) {
    const text = await fs.readFile(path.join(srcDir, file), "utf8");
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
    if (!lines.length) continue;
    const start = lines[0].toLowerCase().startsWith("id,") ? 1 : 0;
    for (let i = start; i < lines.length; i++) dataLines.push(lines[i]);
  }

  const out = `${header}\n${dataLines.join("\n")}\n`;
  await fs.writeFile(outDocs, out, "utf8");
  await fs.writeFile(outPaket, out, "utf8");

  console.log(`✓ Spojeno ${files.length} fajlova → ${dataLines.length} redova`);
  console.log(`  ${outDocs}`);
  console.log(`  ${outPaket}`);
  console.log("\nSledeće: npm run import:docs   ili   Admin → Uvezi master Excel");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
