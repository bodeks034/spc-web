#!/usr/bin/env node
/**
 * Provera pre deploy-a.
 * npm run deploy:check          — dev-safe (bez E2E kredencijala)
 * npm run deploy:check:firma    — build + pun E2E ako ima kredencijale + ručni checklist
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;
const firma = process.argv.includes("--firma");

function run(label, args, opts = {}) {
  console.log(`\n── ${label} ──`);
  const r = spawnSync(npm, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} nije prošao (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

function runNode(label, script, extraArgs = []) {
  console.log(`\n── ${label} ──`);
  const r = spawnSync(node, [script, ...extraArgs], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} nije prošao (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

runNode("Licenca (potpis)", path.join(ROOT, "scripts/verify-license.mjs"));
run("Unit testovi", ["test"]);
run("Smoke test", ["run", "smoke:test"]);
run("Auto cron smoke", ["run", "auto:smoke"]);
runNode("Provera šeme (pilot 54–59)", path.join(ROOT, "scripts/verify-schema.mjs"), ["--pilot"]);
run("E2E login (bez kredencijala)", ["run", "e2e", "--", "e2e/login.spec.js"]);
run("E2E workflow (bez kredencijala)", ["run", "e2e:workflow"]);
runNode("Email endpoint", path.join(ROOT, "scripts/check-send-email.mjs"));

if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
  console.log("\n── E2E NCR→SPC (preskače ako nema alarma u bazi) ──");
  const r = spawnSync(npm, ["run", "e2e:ncr-spc"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.warn("⚠ E2E NCR→SPC nije prošao — proveri alarme ili E2E_EMAIL_KVALITET");
    if (process.env.DEPLOY_STRICT === "1") process.exit(r.status || 1);
  }

  console.log("\n── E2E puni tok (merenje + NCR) ──");
  const rFull = spawnSync(npm, ["run", "e2e:full-tok"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (rFull.status !== 0) {
    console.warn("⚠ E2E puni tok nije prošao — proveri E2E_EMAIL_KVALITET");
    if (process.env.DEPLOY_STRICT === "1") process.exit(rFull.status || 1);
  }
}

if (firma) {
  run("Production build", ["run", "build"]);
  const distIndex = path.join(ROOT, "dist/index.html");
  if (!fs.existsSync(distIndex)) {
    console.error("✗ dist/index.html ne postoji posle build-a");
    process.exit(1);
  }
  console.log("✓ dist/index.html postoji");

  runNode("Provera šeme (puna)", path.join(ROOT, "scripts/verify-schema.mjs"));
  runNode("Docker build check", path.join(ROOT, "scripts/docker-build-check.mjs"));

  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    run("E2E puni suite", ["run", "e2e"]);
  } else {
    console.warn("\n⚠ Preskačem pun E2E — postavi E2E_EMAIL i E2E_PASSWORD za firmu gate");
    if (process.env.DEPLOY_STRICT === "1") process.exit(1);
  }

  if (process.env.RESEND_API_KEY && (process.env.SMTP_TO || process.env.E2E_EMAIL)) {
    const testTo = process.env.SMTP_TO || process.env.E2E_EMAIL;
    runNode("Resend test email", path.join(ROOT, "scripts/check-send-email.mjs"), ["--send", testTo]);
  }
}

console.log("\n── Ručni checklist (firma) ──");
const rucno = [
  "Admin → Status servera / šeme — sve zeleno",
  "Admin → Obaveštenja → Test SPC email (Resend domen)",
  "Admin → Auto pravila — pregled + Teams auto webhook",
  "Task Scheduler: npm run auto:install (digest, podsetnici, health)",
  "Operater login + unos merenja na liniji",
  "Licenca aktivna (LicencaStatusPanel)",
  "HTTPS + backup noćni (IT)",
  "SQL migracije 01–59 primenjene (npm run db:verify)",
];
for (const s of rucno) console.log(`  [ ] ${s}`);
console.log("  Detalji: docs/obuka-paket/CHECKLIST_PRE_INSTALACIJA_FIRMA.md");

console.log(firma
  ? "\n✓ Deploy provera (firma) OK — automatizovano + ručni koraci iznad"
  : "\n✓ Deploy provera OK — unit + smoke + E2E login + email endpoint");
console.log("  Za puni gate: npm run deploy:check:firma");
