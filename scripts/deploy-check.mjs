#!/usr/bin/env node
/**
 * Provera pre deploy-a.
 * npm run deploy:check          — dev-safe (bez E2E kredencijala)
 * npm run deploy:check:firma    — build + pun E2E ako ima kredencijale + ručni checklist
 *
 * CI napomena: koraci koji traže pravu Supabase bazu / infrastrukturu
 * (smoke, auto:smoke, verify-schema, check-send-email, docker) preskaču se
 * automatski kada nema kredencijala (npr. CI sa placeholder URL-om). Postavi
 * DEPLOY_STRICT=1 da postanu obavezni (kad su GitHub Secrets podešeni).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;
const firma = process.argv.includes("--firma");

await loadEnvZaSkripte(ROOT);

const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || "";
const placeholder = supaUrl === "" || /placeholder/i.test(supaUrl) || /placeholder/i.test(supaKey);
const imaBazu = !!supaUrl && !!supaKey && !placeholder;
const strict = process.env.DEPLOY_STRICT === "1";

function npmR(args, opts = {}) {
  return spawnSync(npm, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
}

function nodeR(script, extraArgs = []) {
  return spawnSync(node, [script, ...extraArgs], { cwd: ROOT, stdio: "inherit" });
}

/** Obavezan korak — pad ruši deploy. */
function obavezno(label, thunk) {
  console.log(`\n── ${label} ──`);
  const r = thunk();
  if (r.status !== 0) {
    console.error(`\n✗ ${label} nije prošao (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

/** Opcioni korak — traži bazu/infrastrukturu; bez kredencijala se preskače. */
function opcionoDb(label, thunk, dostupno = imaBazu) {
  console.log(`\n── ${label} ──`);
  if (!dostupno) {
    console.warn(`⚠ Preskačem "${label}" — nema kredencijala/infrastrukture (CI/placeholder).`);
    if (strict) {
      console.error(`✗ ${label} je obavezan u strict modu (DEPLOY_STRICT=1)`);
      process.exit(1);
    }
    return;
  }
  const r = thunk();
  if (r.status !== 0) {
    console.error(`\n✗ ${label} nije prošao (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

if (!imaBazu) {
  console.log("ℹ Bez Supabase kredencijala — DB/infra provere se preskaču (postavi DEPLOY_STRICT=1 da budu obavezne).");
}

obavezno("Licenca (potpis)", () => nodeR(path.join(ROOT, "scripts/verify-license.mjs")));
obavezno("Unit testovi", () => npmR(["test"]));
opcionoDb("Smoke test", () => npmR(["run", "smoke:test"]));
opcionoDb("Auto cron smoke", () => npmR(["run", "auto:smoke"]));
opcionoDb("Provera šeme (pilot 54–59)", () => nodeR(path.join(ROOT, "scripts/verify-schema.mjs"), ["--pilot"]));
obavezno("E2E login (bez kredencijala)", () => npmR(["run", "e2e", "--", "e2e/login.spec.js"]));
obavezno("E2E workflow (bez kredencijala)", () => npmR(["run", "e2e:workflow"]));
opcionoDb("Email endpoint", () => nodeR(path.join(ROOT, "scripts/check-send-email.mjs")));

if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
  console.log("\n── E2E NCR→SPC (preskače ako nema alarma u bazi) ──");
  const r = npmR(["run", "e2e:ncr-spc"]);
  if (r.status !== 0) {
    console.warn("⚠ E2E NCR→SPC nije prošao — proveri alarme ili E2E_EMAIL_KVALITET");
    if (strict) process.exit(r.status || 1);
  }

  console.log("\n── E2E puni tok (merenje + NCR) ──");
  const rFull = npmR(["run", "e2e:full-tok"]);
  if (rFull.status !== 0) {
    console.warn("⚠ E2E puni tok nije prošao — proveri E2E_EMAIL_KVALITET");
    if (strict) process.exit(rFull.status || 1);
  }
}

if (firma) {
  obavezno("Production build", () => npmR(["run", "build"]));
  const distIndex = path.join(ROOT, "dist/index.html");
  if (!fs.existsSync(distIndex)) {
    console.error("✗ dist/index.html ne postoji posle build-a");
    process.exit(1);
  }
  console.log("✓ dist/index.html postoji");

  opcionoDb("Provera šeme (puna)", () => nodeR(path.join(ROOT, "scripts/verify-schema.mjs")));
  // Docker build je spor/težak za CI — obavezan samo u strict modu.
  opcionoDb("Docker build check", () => nodeR(path.join(ROOT, "scripts/docker-build-check.mjs")), strict);

  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    obavezno("E2E puni suite", () => npmR(["run", "e2e"]));
  } else {
    console.warn("\n⚠ Preskačem pun E2E — postavi E2E_EMAIL i E2E_PASSWORD za firmu gate");
    if (strict) process.exit(1);
  }

  if (process.env.RESEND_API_KEY && (process.env.SMTP_TO || process.env.E2E_EMAIL)) {
    const testTo = process.env.SMTP_TO || process.env.E2E_EMAIL;
    opcionoDb("Resend test email", () => nodeR(path.join(ROOT, "scripts/check-send-email.mjs"), ["--send", testTo]));
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
