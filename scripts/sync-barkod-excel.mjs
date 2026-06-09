/**
 * Sinhronizacija Excel ↔ CSV za barkod etikete.
 * npm run barkodi:sync        → Excel → CSV
 * npm run barkodi:seed-excel  → CSV → Excel (prvi put)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readBarkodiCsv,
  readBarkodiXlsx,
  writeBarkodiCsv,
  writeBarkodiXlsx,
} from "./lib/barkodCsv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "docs", "barkodi_sadrzaj.csv");
const XLSX_PATH = path.join(ROOT, "excel-rad", "Barkod_etikete.xlsx");

const mode = process.argv[2] || "xlsx-to-csv";

async function main() {
  if (mode === "csv-to-xlsx") {
    const redovi = await readBarkodiCsv(CSV_PATH);
    await writeBarkodiXlsx(XLSX_PATH, redovi);
    console.log(`CSV → Excel: ${XLSX_PATH}`);
    return;
  }

  const redovi = await readBarkodiXlsx(XLSX_PATH);
  await writeBarkodiCsv(CSV_PATH, redovi);
  console.log(`Excel → CSV: ${CSV_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
