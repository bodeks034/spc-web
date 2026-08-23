#!/usr/bin/env node
/**
 * Arhiva starih audit zapisa šifrarnika.
 * npm run auto:sifrarnik-audit-retention
 * npm run auto:sifrarnik-audit-retention -- --dry-run
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "auto-sifrarnik-audit-retention.log", { jobId: "auto-sifrarnik-audit-retention" });
const dryRun = process.argv.includes("--dry-run");
const meseci = Number(process.argv.find((a, i) => process.argv[i - 1] === "--meseci") || 12);

async function main() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");

  await skriptaLog.run(`audit retention ${meseci}m${dryRun ? " dry-run" : ""}`, async () => {
    const supabase = createClient(url, key);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - meseci);

    const { count } = await supabase
      .from("sifrarnik_audit")
      .select("*", { count: "exact", head: true })
      .lt("created_at", cutoff.toISOString());

    await skriptaLog.info(`Zapisa za arhivu: ${count || 0}`);

    if (dryRun || !count) return;

    const { data, error } = await supabase.rpc("sifrarnik_audit_arhiviraj", { p_meseci: meseci });
    if (error) throw error;
    await skriptaLog.info(`Arhivirano: ${data ?? 0}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
