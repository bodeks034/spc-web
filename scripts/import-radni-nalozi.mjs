#!/usr/bin/env node
/**
 * Dnevni uvoz radnih naloga iz ERP CSV u Supabase.
 *
 * Upotreba:
 *   node scripts/import-radni-nalozi.mjs
 *   node scripts/import-radni-nalozi.mjs docs/erp_radni_nalozi.csv
 *   node scripts/import-radni-nalozi.mjs --dry-run
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  parsirajRadniNaloziCsv,
  upsertRadniNalozi,
} from "../src/lib/radniNaloziUvoz.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { dryRun: false, fajl: null };
  for (let i = 2; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--dry-run") args.dryRun = true;
    else if (!t.startsWith("--")) args.fajl = path.resolve(t);
  }
  return args;
}

async function nadjiCsv(explicit) {
  if (explicit) return explicit;
  const kandidati = [
    path.join(ROOT, "docs", "erp_radni_nalozi.csv"),
    path.join(ROOT, "docs", "radni_nalozi.csv"),
    path.join(ROOT, "excel-rad", "erp_radni_nalozi.csv"),
  ];
  for (const p of kandidati) {
    try {
      await fs.access(p);
      return p;
    } catch { /* */ }
  }
  throw new Error(
    "Nije pronađen CSV. Prosledi putanju ili stavi fajl u docs/erp_radni_nalozi.csv",
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const csvPath = await nadjiCsv(args.fajl);
  const txt = await fs.readFile(csvPath, "utf8");
  const parsed = parsirajRadniNaloziCsv(txt);

  console.log(`Fajl: ${csvPath}`);
  console.log(`Redova u CSV: ${parsed.ukupno} · validnih: ${parsed.validnih}`);
  if (parsed.greske.length) {
    console.log("Upozorenja:");
    parsed.greske.forEach((g) => console.log(`  ⚠ ${g}`));
  }

  if (!parsed.redovi.length) {
    console.error("Nema validnih naloga za uvoz.");
    process.exit(1);
  }

  if (args.dryRun) {
    console.log("\n--dry-run: primer prvih 3 naloga:");
    parsed.redovi.slice(0, 3).forEach((r) => {
      console.log(`  ${r.broj_naloga} · ${r.id_deo} · ${r.kolicina ?? "—"} kom · ${r.status}`);
    });
    console.log("\nGotovo (bez upisa u bazu).");
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const res = await upsertRadniNalozi(supabase, parsed.redovi);

  if (!res.ok) {
    console.error("Greška:", res.error?.message || res.error);
    process.exit(1);
  }

  const aktivni = parsed.redovi.filter((r) => r.status === "aktivan").length;
  console.log(`✓ Upsert ${res.upsertovano} naloga (aktivnih: ${aktivni})`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
