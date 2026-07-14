#!/usr/bin/env node
/**
 * Primena SQL migracija na PostgreSQL (cloud ili on-prem).
 *
 * Zahteva DATABASE_URL ili SUPABASE_DB_URL u .env.local, npr.:
 *   postgresql://postgres.[ref]:[PASS]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 *
 * npm run db:migrate              — primeni 54–59 ako nedostaju
 * npm run db:migrate -- --all     — svi .sql fajlovi 01–59 po broju (oprezno na postojećoj bazi)
 * npm run db:migrate -- --file 59_ncr_capa.sql
 * npm run db:migrate -- --dry-run — samo lista
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PILOT_BLOK = [
  "54_crtez_assets_moment.sql",
  "55_moment_pilot_tockovi.sql",
  "56_moment_komplet_napomena.sql",
  "57_moment_unapredjenje.sql",
  "58_moment_pfmea_link.sql",
  "59_ncr_capa.sql",
];

const LEGACY_FIX = ["60_fix_legacy_schema_gaps.sql"];

const AUTO_BLOK = ["61_auto_telemetrija.sql"];

function sortSqlFiles(files) {
  return files
    .filter((f) => /^\d+_.+\.sql$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      return na - nb;
    });
}

function resolveFiles(args) {
  if (args.includes("--legacy-fix")) return LEGACY_FIX;
  if (args.includes("--auto")) return AUTO_BLOK;
  if (args.includes("--all")) {
    return sortSqlFiles(fs.readdirSync(ROOT).filter((f) => f.endsWith(".sql")));
  }
  const fileIdx = args.indexOf("--file");
  if (fileIdx >= 0) {
    const name = args[fileIdx + 1];
    if (!name) throw new Error("Navedi ime fajla posle --file");
    return [name];
  }
  return PILOT_BLOK;
}

async function getClient() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error("✗ Nedostaje DATABASE_URL ili SUPABASE_DB_URL u .env.local");
    console.error("");
    console.error("Cloud Supabase: Dashboard → Project Settings → Database → Connection string (URI)");
    console.error("On-prem: postgresql://postgres:LOZINKA@127.0.0.1:5432/postgres");
    console.error("");
    console.error("Alternativa bez DATABASE_URL:");
    console.error("  1. Otvori Supabase SQL Editor");
    console.error("  2. Pokreni fajlove redom iz docs/MIGRACIJE.md (54–59)");
    console.error("  3. npm run db:verify");
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("✗ Paket pg nije instaliran. Pokreni: npm install");
    process.exit(1);
  }

  const client = new pg.default.Client({ connectionString: dbUrl, ssl: dbUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  return client;
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const files = resolveFiles(args);

  console.log(dryRun ? "Dry-run — migracije za primenu:\n" : "Primena SQL migracija:\n");
  for (const f of files) {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full)) {
      console.error(`✗ Nedostaje fajl: ${f}`);
      process.exit(1);
    }
    console.log(`  • ${f}`);
  }

  if (dryRun) {
    console.log("\n✓ Dry-run završen");
    return;
  }

  const client = await getClient();
  try {
    for (const f of files) {
      const sql = fs.readFileSync(path.join(ROOT, f), "utf8");
      console.log(`\n── ${f} ──`);
      await client.query(sql);
      console.log(`✓ ${f}`);
    }
    console.log("\n✓ Migracije primenjene — pokreni: npm run db:verify");
  } catch (e) {
    console.error(`\n✗ Greška: ${e.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
