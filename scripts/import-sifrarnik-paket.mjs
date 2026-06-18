#!/usr/bin/env node
/**
 * Uvoz SPC_merljive.xlsx + SPC_atributivne.xlsx (sifrarnik-paket) u Supabase.
 * node scripts/import-sifrarnik-paket.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import {
  importMerljiveWorkbookToSupabase,
  importWorkbookToSupabase,
} from "../src/lib/excelSync.js";
import {
  merljiveXlsxPath,
  atributivneXlsxPath,
} from "../src/lib/sifrarnikPaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const pick = (flag, envKey, fallback) => {
    const i = argv.indexOf(flag);
    if (i >= 0 && argv[i + 1]) {
      return path.isAbsolute(argv[i + 1]) ? argv[i + 1] : path.join(ROOT, argv[i + 1]);
    }
    if (process.env[envKey]) return process.env[envKey];
    return fallback;
  };
  return {
    merljivePath: pick("--merljive", "SPC_MERLJIVE_XLSX", merljiveXlsxPath(ROOT)),
    atributivnePath: pick("--atributivne", "SPC_ATRIBUTIVNE_XLSX", atributivneXlsxPath(ROOT)),
  };
}

function readWb(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Nema fajla: ${filePath}`);
  return XLSX.read(fs.readFileSync(filePath));
}

export async function importSifrarnikPaketToSupabase(supabase, { merljivePath, atributivnePath } = {}) {
  const paths = {
    merljivePath: merljivePath || merljiveXlsxPath(ROOT),
    atributivnePath: atributivnePath || atributivneXlsxPath(ROOT),
  };

  const merljiveWb = readWb(paths.merljivePath);
  const atrWb = readWb(paths.atributivnePath);
  const atrSheets = ["delovi", "radni_nalozi"].filter((s) => atrWb.Sheets[s]);

  // Prvo delovi (FK), pa merljive + SOP
  const atrResults = atrSheets.length
    ? await importWorkbookToSupabase(supabase, atrWb, atrSheets)
    : [];
  const merResults = await importMerljiveWorkbookToSupabase(supabase, merljiveWb);

  return { paths, merResults, atrResults };
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.local");

  const args = parseArgs(process.argv);
  console.log("Uvoz sifrarnik-paket → Supabase");
  console.log(`  Merljive:    ${args.merljivePath}`);
  console.log(`  Atributivne: ${args.atributivnePath}\n`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { merResults, atrResults } = await importSifrarnikPaketToSupabase(supabase, args);

  console.log("Merljive:");
  merResults.forEach((r) => {
    console.log(`  ${r.table || r.sheet}: ${r.status} (${r.count ?? 0})`);
    if (r.skippedCols?.includes("fai_broj_merenja")) {
      console.log(
        `    ⚠ fai_broj_merenja preskočena — pokreni ${path.join(ROOT, "37_fai_broj_merenja.sql")} u Supabase SQL Editoru`,
      );
    }
  });
  console.log("Atributivne:");
  atrResults.forEach((r) => console.log(`  ${r.table || r.sheet}: ${r.status} (${r.count ?? 0})`));
  console.log("\n✓ Uvoz završen.");
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
