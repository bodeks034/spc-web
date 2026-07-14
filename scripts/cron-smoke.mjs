#!/usr/bin/env node
/**
 * Smoke test cron skripti (bez slanja emaila).
 * npm run auto:smoke
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sumirajLogove } from "./lib/skriptaLog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;

function run(label, script, extra = []) {
  console.log(`\n-- ${label} --`);
  const r = spawnSync(node, [path.join(ROOT, script), ...extra], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`FAIL: ${label}`);
    process.exit(r.status || 1);
  }
}

run("Podsetnici dry-run", "scripts/auto-podsetnici.mjs", ["--dry-run"]);
run("Digest dry-run", "scripts/smenski-digest.mjs", ["--dry-run"]);

const sum = await sumirajLogove(ROOT);
console.log("\n-- Log sumar --");
for (const s of sum) {
  console.log(`  ${s.fajl}: ${s.status}`);
}
console.log("\nOK auto:smoke");
