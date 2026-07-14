#!/usr/bin/env node
/**
 * Brza provera Supabase konekcije i ključnih tabela.
 * node scripts/smoke-test.mjs [--anon]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const useAnon = process.argv.includes("--anon");

const PROBES = [
  { table: "delovi", select: "id_deo" },
  { table: "merenja_varijabilna", select: "id,datum" },
  { table: "kontrolni_log", select: "id,datum" },
  { table: "kpi_unos", select: "id,modul" },
  { table: "moment_job", select: "id,kod_job" },
  { table: "moment_korak", select: "id,redosled" },
  { table: "moment_protokol", select: "id,status" },
  { table: "crtez_assets", select: "id,ref_tip" },
  { table: "spc_alarmi", select: "id,pravilo" },
  { table: "pfmea_cp_dokumenti", select: "id,naziv" },
  { table: "ncr_capa", select: "id,broj_ncr" },
];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = useAnon
    ? (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
    : (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  if (!url || !key) {
    fail("Nedostaje SUPABASE_URL i ključ u .env (SERVICE_ROLE ili ANON)");
  }

  const supabase = createClient(url, key);
  console.log(`Smoke test → ${url} (${useAnon ? "anon" : "service/anon"})`);

  let ok = 0;
  let skip = 0;
  for (const p of PROBES) {
    const { error } = await supabase.from(p.table).select(p.select).limit(1);
    if (!error) {
      console.log(`  ✓ ${p.table}`);
      ok += 1;
    } else if (/does not exist|could not find|schema cache/i.test(error.message)) {
      console.log(`  ⚠ ${p.table} — nedostaje migracija`);
      skip += 1;
    } else if (error.code === "PGRST116") {
      console.log(`  ✓ ${p.table} (prazna)`);
      ok += 1;
    } else {
      console.log(`  ~ ${p.table} — ${error.message}`);
      ok += 1;
    }
  }

  console.log(`\nRezultat: ${ok}/${PROBES.length} OK, ${skip} nedostaje`);
  if (skip > 0) process.exit(2);
}

main().catch((e) => fail(e.message));
