#!/usr/bin/env node
/**
 * Provera šeme (ista logika kao Admin → Status šeme).
 * npm run db:verify           — sve migracije iz MIGRACIJE_LISTA
 * npm run db:verify:pilot     — samo pilot blok 54–59 (moment + NCR)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { proveriSemu, MIGRACIJE_LISTA } from "../src/lib/schemaCheck.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PILOT_IDS = new Set([
  "moment_crtez",
  "moment_unapredjenje",
  "moment_pfmea_link",
  "ncr_capa",
]);

async function main() {
  const pilot = process.argv.includes("--pilot");
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("✗ Nedostaje SUPABASE_URL i ključ u .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  console.log(`Provera šeme${pilot ? " (pilot 54–59)" : ""} → ${url}\n`);

  const rez = await proveriSemu(supabase);
  const lista = pilot ? rez.filter((r) => PILOT_IDS.has(r.id)) : rez;
  let ok = 0;
  let fail = 0;
  for (const r of lista) {
    const mark = r.ok ? "✓" : "✗";
    console.log(`  ${mark} ${r.fajl} — ${r.naziv}`);
    if (!r.ok && r.detalji?.length) {
      for (const d of r.detalji) {
        if (!d.ok) console.log(`      ${d.poruka}`);
      }
    }
    if (r.ok) ok += 1;
    else fail += 1;
  }

  console.log(`\nRezultat: ${ok}/${lista.length} migracija OK`);
  if (fail > 0) {
    console.error("\n✗ Nedostaju migracije — pokreni: npm run db:migrate");
    console.error("  ili ručno u Supabase SQL Editoru (redosled u docs/MIGRACIJE.md)");
    process.exit(1);
  }
  console.log("\n✓ Šema OK");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
