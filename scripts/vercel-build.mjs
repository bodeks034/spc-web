#!/usr/bin/env node
/**
 * Vercel build gate — unit testovi + licenca pre production build-a.
 * Koristi se kao buildCommand u vercel.json.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;

function run(label, fn) {
  console.log(`\n── ${label} ──`);
  const r = fn();
  if (r.status !== 0) {
    console.error(`\n✗ ${label} nije prošao (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

run("Licenca", () => spawnSync(node, [path.join(ROOT, "scripts/verify-license.mjs")], { cwd: ROOT, stdio: "inherit" }));
run("Unit testovi", () => spawnSync(npm, ["test"], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" }));
run("Production build", () => spawnSync(npm, ["run", "build"], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" }));

console.log("\n✓ Vercel build gate prošao");
