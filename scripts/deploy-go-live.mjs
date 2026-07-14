#!/usr/bin/env node
/**
 * Go-live gate — automatske provere + izveštaj.
 * npm run deploy:go-live
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;

const rezultati = [];

function runStep(naziv, fn) {
  console.log(`\n── ${naziv} ──`);
  const ok = fn();
  rezultati.push({ naziv, ok });
  if (!ok) {
    console.error(`✗ ${naziv} — FAIL`);
    return false;
  }
  console.log(`✓ ${naziv}`);
  return true;
}

function npmRun(script, extra = []) {
  const r = spawnSync(npm, ["run", script, ...extra], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status === 0;
}

function nodeScript(rel) {
  const r = spawnSync(node, [path.join(ROOT, rel)], { cwd: ROOT, stdio: "inherit" });
  return r.status === 0;
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  console.log("══ GO-LIVE GATE ══\n");

  let fail = 0;

  if (!runStep("Licenca", () => nodeScript("scripts/verify-license.mjs"))) fail += 1;
  if (!runStep("Unit testovi", () => npmRun("test"))) fail += 1;
  if (!runStep("Auto smoke", () => npmRun("auto:smoke"))) fail += 1;
  if (!runStep("Production build", () => npmRun("build"))) fail += 1;

  const imaDb = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));
  if (imaDb) {
    if (!runStep("Provera šeme", () => npmRun("db:verify"))) fail += 1;
  } else {
    console.log("\n── Provera šeme ──\n⚠ Preskočeno (nema SUPABASE u .env.local)");
    rezultati.push({ naziv: "Provera šeme", ok: null });
  }

  const imaE2e = !!(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
  if (imaE2e) {
    if (!runStep("Deploy check firma", () => npmRun("deploy:check:firma"))) fail += 1;
  } else {
    if (!runStep("Deploy check", () => npmRun("deploy:check"))) fail += 1;
    console.log("\n⚠ Za pun gate postavi E2E_EMAIL i E2E_PASSWORD");
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = path.join(ROOT, "logs");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `go-live-${stamp}.txt`);
  const lines = [
    `GO-LIVE IZVEŠTAJ — ${new Date().toLocaleString("sr-RS")}`,
    "",
    ...rezultati.map((r) => `${r.ok === true ? "OK" : r.ok === false ? "FAIL" : "SKIP"} — ${r.naziv}`),
    "",
    `Ukupno FAIL: ${fail}`,
    "",
    "RUČNI KORACI:",
    "  1. npm run db:migrate && npm run db:migrate:auto",
    "  2. npm run auto:install:admin",
    "  3. Admin → Status šeme + ISO audit panel test",
    "  4. Test login (operater + kvalitet)",
    "  5. Backup restore test (SPC-Postgres-Backup)",
    "  6. Obuka 30 min (šef/kvalitet)",
    "",
    "Dokumentacija: docs/obuka-paket/GO_LIVE_RUNBOOK.md",
  ];
  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`\n══ Izveštaj: ${reportPath} ══`);

  if (fail > 0) {
    console.error(`\n✗ Go-live gate: ${fail} korak(a) palo`);
    process.exit(1);
  }
  console.log("\n✓ Go-live gate prošao — spremno za ručne korake iz runbook-a");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
