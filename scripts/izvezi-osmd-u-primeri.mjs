#!/usr/bin/env node
/**
 * Izvoz završenih 8D iz Supabase → JSON primeri za pregled.
 *
 * Zahteva .env u root-u:
 *   VITE_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...  (ili VITE_SUPABASE_ANON_KEY)
 *
 * node scripts/izvezi-osmd-u-primeri.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/knowledge/primeri-8d/izvezeno-iz-baze.json");

async function loadEnv() {
  try {
    const envText = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of envText.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch { /* nema .env */ }
}

await loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Nedostaje VITE_SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY u .env");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const { osmdD4uPrimer8d, validirajPrimer8d } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/troubleshootingPrimeri.js")).href
);

const supabase = createClient(url, key);

const { data, error } = await supabase
  .from("osmd_izvestaji")
  .select("id,id_deo,d2_opis_problema,d3_privremena_akcija,d4_uzrok,d5_korektivna,d7_prevencija,status,created_at")
  .not("d4_uzrok", "is", null)
  .order("created_at", { ascending: false })
  .limit(50);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const primeri = [];
const preskoceno = [];

for (const row of data || []) {
  const p = osmdD4uPrimer8d(row);
  if (!p) {
    preskoceno.push({ id: row.id, id_deo: row.id_deo, razlog: "D4 bez dovoljno 5-Why / 6M" });
    continue;
  }
  const v = validirajPrimer8d(p, primeri.length);
  if (v.ok) primeri.push(v.primer);
  else preskoceno.push({ id: row.id, greske: v.greske });
}

const out = {
  verzija: 1,
  opis: "Automatski izvezeno — ANONIMIZUJ pre ubacivanja u src/data/primeri-8d.json",
  generisano: new Date().toISOString(),
  primeri,
  preskoceno,
};

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");

console.log(`\n✓ Izvezeno ${primeri.length} primera → ${OUT}`);
console.log(`  Preskočeno: ${preskoceno.length}\n`);
