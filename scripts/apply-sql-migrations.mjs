#!/usr/bin/env node
/**
 * Primena SQL migracija na PostgreSQL (cloud ili on-prem).
 *
 * Zahteva DATABASE_URL ili SUPABASE_DB_URL u .env.local, npr.:
 *   postgresql://postgres.[ref]:[PASS]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 *
 * npm run db:migrate              — primeni pilot 54–59 + kvalitet 75–76 + go-live 77–97
 * npm run db:migrate -- --kvalitet — samo 75_ncr_registar_obrazac + 76_osmd_pfmea_cp_brojevi
 * npm run db:migrate -- --go-live  — 77–97 go-live (RPC + audit + MV + RLS/PIN + agregati + error_log)
 * npm run db:migrate -- --all     — svi .sql fajlovi 01–59 po broju (oprezno na postojećoj bazi)
 * npm run db:migrate -- --file 59_ncr_capa.sql
 * npm run db:migrate -- --dry-run — samo lista
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GO_LIVE_BLOK = [
  "77_ocisti_operativu_rpc.sql",
  "78_obrisi_deo_iz_sifrarnika_rpc.sql",
  "79_obrisi_demo_delove_rpc.sql",
  "80_sifrarnik_audit.sql",
  "81_sifrarnik_audit_rls.sql",
  "82_sifrarnik_filter_rpc.sql",
  "83_sifrarnik_audit_rls_roles.sql",
  "84_sifrarnik_deo_status_mv.sql",
  "85_sifrarnik_audit_retention.sql",
  "86_sifrarnik_mv_scale.sql",
  "87_tipovi_linije_privremene.sql",
  "88_obrisi_deo_kaskadno.sql",
  "89_sifrarnik_linija_i_mv_refresh.sql",
  "90_dashboard_agregati.sql",
  "91_arhiviranje_i_audit_trigger.sql",
  "92_bezbednost_rls_i_pin.sql",
  "93_rls_uloge_upisa.sql",
  "94_broj_zapisa_po_delu.sql",
  "95_obrisi_deo_eskalacije_fk.sql",
  "96_storage_crtezi.sql",
  "97_error_log.sql",
  "98_licenca_anon_grant.sql",
];

const PILOT_BLOK = [
  "54_crtez_assets_moment.sql",
  "55_moment_pilot_tockovi.sql",
  "56_moment_komplet_napomena.sql",
  "57_moment_unapredjenje.sql",
  "58_moment_pfmea_link.sql",
  "59_ncr_capa.sql",
  "75_ncr_registar_obrazac.sql",
  "76_osmd_pfmea_cp_brojevi.sql",
  ...GO_LIVE_BLOK,
];

const KVALITET_BLOK = [
  "75_ncr_registar_obrazac.sql",
  "76_osmd_pfmea_cp_brojevi.sql",
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
  if (args.includes("--go-live")) return GO_LIVE_BLOK;
  if (args.includes("--auto")) return AUTO_BLOK;
  if (args.includes("--kvalitet")) return KVALITET_BLOK;
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
    console.error("  2. Pokreni fajlove redom iz docs/MIGRACIJE.md (75–76 za NCR/8D brojeve)");
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
