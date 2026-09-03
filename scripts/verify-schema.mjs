#!/usr/bin/env node
/**
 * Provera šeme (ista logika kao Admin → Status šeme).
 * npm run db:verify           — sve migracije iz MIGRACIJE_LISTA
 * npm run db:verify:pilot     — samo pilot blok 54–59 (moment + NCR)
 * npm run db:verify:go-live   — go-live blok 77–95 (RPC, MV, RLS, PIN, agregati)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { proveriSemu, MIGRACIJE_LISTA, GO_LIVE_IDS } from "../src/lib/schemaCheck.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PILOT_IDS = new Set([
  "moment_crtez",
  "moment_unapredjenje",
  "moment_pfmea_link",
  "ncr_capa",
]);

async function main() {
  const pilot = process.argv.includes("--pilot");
  const goLive = process.argv.includes("--go-live");
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
  console.log(
    `Provera šeme${
      pilot ? " (pilot 54–59)" : goLive ? " (go-live 77–95)" : ""
    } → ${url}\n`,
  );

  const rez = await proveriSemu(supabase);
  let lista = rez;
  if (pilot) lista = rez.filter((r) => PILOT_IDS.has(r.id));
  if (goLive) lista = rez.filter((r) => GO_LIVE_IDS.has(r.id));
  let ok = 0;
  let fail = 0;
  for (const r of lista) {
    const mark = r.ok ? "✓" : "✗";
    console.log(`${mark} ${r.fajl || r.id} — ${r.poruka || (r.ok ? "OK" : "nedostaje")}`);
    if (r.ok) ok += 1;
    else fail += 1;
  }
  console.log(`\n${ok} OK · ${fail} FAIL · ${lista.length} provereno`);
  if (fail > 0) {
    if (goLive) {
      console.error("\n✗ Nedostaju go-live migracije (77–95)");
      console.error("  Pokreni: npm run db:migrate:go-live");
      console.error("  Obavezno: 88–95 (kaskada, eskalacije FK, MV linija, dashboard, arhiva, RLS/PIN, uloge, brojači)");
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
