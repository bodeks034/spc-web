#!/usr/bin/env node
/**
 * Pilot production build protiv cloud Supabase URL-a.
 * npm run build:pilot
 *
 * Koristi .env.production u korenu (kopiraj iz deploy/env.pilot.example).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envProd = path.join(ROOT, ".env.production");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

if (!fs.existsSync(envProd)) {
  console.error("✗ Nedostaje .env.production u korenu projekta");
  console.error("  Kopiraj: deploy/env.pilot.example → .env.production");
  console.error("  Popuni VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const raw = fs.readFileSync(envProd, "utf8");
const url = raw.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
const key = raw.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim();
if (!url || !key || url.includes("TVOJ_PROJEKT") || key === "eyJ...") {
  console.error("✗ .env.production nije popunjen (URL i ANON KEY)");
  process.exit(1);
}

console.log(`Pilot build → ${url}\n`);
const r = spawnSync(npm, ["run", "build"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key },
});

if (r.status !== 0) process.exit(r.status || 1);
console.log("\n✓ Pilot build OK — dist/ spreman za upload ili Docker");
console.log("  Provera: npm run preview");
