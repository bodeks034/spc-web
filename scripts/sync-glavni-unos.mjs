#!/usr/bin/env node
/**
 * glavni unos.xlsx → SPC_merljive.xlsx + SPC_atributivne.xlsx
 *
 * Inženjer unosi u: excel rad izmenjen/glavni unos.xlsx (vozilo1, vozilo2, …)
 * Skripta puni:      sifrarnik-paket/SPC_merljive.xlsx + SPC_atributivne.xlsx
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { syncGlavniUnosToSpc } from "../src/lib/glavniUnosSync.js";
import { importSifrarnikPaketToSupabase } from "./import-sifrarnik-paket.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DEFAULT_BASE = path.join(ROOT, "excel rad izmenjen");

function abs(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    importDb: argv.includes("--import-db"),
    glavni: abs(argv.find((a, i) => argv[i - 1] === "--glavni")
      || process.env.GLAVNI_UNOS_XLSX
      || path.join(DEFAULT_BASE, "glavni unos.xlsx")),
    merljive: abs(argv.find((a, i) => argv[i - 1] === "--merljive")
      || process.env.SPC_MERLJIVE_XLSX
      || path.join(DEFAULT_BASE, "sifrarnik-paket", "SPC_merljive.xlsx")),
    atributivne: abs(argv.find((a, i) => argv[i - 1] === "--atributivne")
      || process.env.SPC_ATRIBUTIVNE_XLSX
      || path.join(DEFAULT_BASE, "sifrarnik-paket", "SPC_atributivne.xlsx")),
  };
}

async function runImportPaket(merljivePath, atributivnePath) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Za --import-db postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");
  }
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { merResults, atrResults } = await importSifrarnikPaketToSupabase(supabase, {
    merljivePath,
    atributivnePath,
  });
  console.log("\nMerljive:");
  merResults.forEach((r) => console.log(`  ${r.table || r.sheet}: ${r.status} (${r.count ?? 0})`));
  console.log("Atributivne:");
  atrResults.forEach((r) => console.log(`  ${r.table || r.sheet}: ${r.status} (${r.count ?? 0})`));
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const args = parseArgs(process.argv);

  console.log("Glavni unos → SPC merljive + atributivne");
  console.log(`  Ulaz:        ${args.glavni}`);
  console.log(`  Merljive:    ${args.merljive}`);
  console.log(`  Atributivne: ${args.atributivne}`);
  if (args.dryRun) console.log("  --dry-run\n");

  const res = await syncGlavniUnosToSpc({
    glavniPath: args.glavni,
    merljivePath: args.merljive,
    atributivnePath: args.atributivne,
    dryRun: args.dryRun,
  });

  if (!res.ok) {
    console.error(res.greska || "Greška");
    process.exit(1);
  }

  console.log("\nSheets iz glavnog unosa:");
  res.glavniSheets.forEach((s) => console.log(`  ${s.name}: ${s.redova} redova`));

  console.log(`\nDelovi (id): ${[...res.delovi].join(", ")}`);
  console.log(`Karakteristike u merljive: ${res.karakteristike} (iz glavnog: ${res.izGlavnog})`);
  console.log(`SOP redova: ${res.sop}`);
  console.log(`Delovi redova (atributivne): ${res.deloviRedova}`);
  console.log(`Radni nalozi: ${res.radniNalozi}`);

  if (args.dryRun) {
    console.log("\nGotovo (dry-run).");
    return;
  }

  console.log("\n✓ Excel ažuriran.");
  console.log("Sledeće: npm run sync:glavni-unos:import  ILI  npm run import:sifrarnik-paket");

  if (args.importDb) {
    console.log("\nUvoz u Supabase (sifrarnik-paket Excel)...");
    await runImportPaket(args.merljive, args.atributivne);
    console.log("✓ Baza ažurirana.");
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
