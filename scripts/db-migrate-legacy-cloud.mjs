#!/usr/bin/env node
/** Primena 60_fix_legacy_schema_gaps.sql preko Supabase CLI (cloud pilot). */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = path.join(ROOT, "60_fix_legacy_schema_gaps.sql");
const exec = process.platform === "win32" ? "cmd" : "supabase";
const args = process.platform === "win32"
  ? ["/c", "supabase", "db", "query", "--linked", "-f", sql]
  : ["db", "query", "--linked", "-f", sql];

console.log("Primena 60_fix_legacy_schema_gaps.sql na linked projekat…\n");
const r = spawnSync(exec, args, { cwd: ROOT, stdio: "inherit", shell: false });
if (r.status !== 0) {
  console.error("\n✗ Nije uspelo. Proveri: supabase link --project-ref <ref>");
  process.exit(r.status || 1);
}
console.log("\n✓ Legacy popravka primenjena — npm run db:verify");
