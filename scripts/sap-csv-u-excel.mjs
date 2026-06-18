#!/usr/bin/env node
/**
 * SAP CSV → Excel master šifrarnik (automatski popuni tabove gde ima podataka).
 *
 * Stavi CSV u sap-drop/incoming/:
 *   delovi.csv | sap_materijal.csv     → tab delovi
 *   radni_nalozi.csv | sap_radni_nalozi.csv → tab radni_nalozi
 *   kupci.csv | sap_kupci.csv           → tab kupci
 *
 * Upotreba:
 *   node scripts/sap-csv-u-excel.mjs
 *   node scripts/sap-csv-u-excel.mjs --dry-run
 *   node scripts/sap-csv-u-excel.mjs --import-db
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { syncSapCsvToExcel } from "../src/lib/sapCsvToExcel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    syncDocs: !argv.includes("--no-docs"),
    importDb: argv.includes("--import-db"),
    incoming: argv.find((a, i) => argv[i - 1] === "--incoming") || process.env.SAP_DROP_DIR || "sap-drop/incoming",
    master: argv.find((a, i) => argv[i - 1] === "--master") || process.env.SAP_MASTER_XLSX || "excel-rad/SPC_master_atributivne.xlsx",
  };
}

function abs(rel) {
  return path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
}

async function runImportDocs() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/import-all-docs.mjs"], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`import:docs exit ${code}`))));
  });
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const args = parseArgs(process.argv);
  const incomingDir = abs(args.incoming);
  const masterPath = abs(args.master);
  const docsDir = path.join(ROOT, "docs");

  console.log("SAP CSV → Excel šifrarnik");
  console.log(`  Ulaz:   ${incomingDir}`);
  console.log(`  Excel:  ${masterPath}`);
  if (args.syncDocs) console.log(`  docs:   ${docsDir}\\*.csv (sinhronizacija)`);
  if (args.dryRun) console.log("  --dry-run (bez upisa)\n");

  const res = await syncSapCsvToExcel({
    incomingDir,
    masterPath,
    docsDir,
    syncDocs: args.syncDocs,
    dryRun: args.dryRun,
  });

  if (res.poruka) {
    console.log(res.poruka);
    return;
  }

  res.sheets.forEach((s) => {
    if (s.status === "ok") {
      console.log(`✓ ${s.fajl} → tab "${s.sheet}": ${s.ukupno} iz CSV, +${s.novih} novih, ~${s.azurirano} izmena (ukupno ${s.ukupno_u_sheetu})`);
    } else {
      console.log(`⚠ ${s.fajl}: ${s.status}${s.razlog ? ` — ${s.razlog}` : ""}`);
    }
  });

  if (args.dryRun) {
    console.log("\nGotovo (dry-run).");
    return;
  }

  if (res.sheets.some((s) => s.status === "ok")) {
    console.log(`\nExcel sačuvan: ${masterPath}`);
    console.log("Sledeće: Admin → Uvezi iz Excela  ILI  npm run import:docs");
  }

  if (args.importDb) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Za --import-db postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.erp");
    }
    console.log("\nUvoz docs → Supabase...");
    await runImportDocs();
    console.log("✓ Baza ažurirana.");
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
