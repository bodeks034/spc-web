#!/usr/bin/env node
/**
 * Deploy Resend secrets + send-email edge funkcija.
 *
 * U .env.local:
 *   RESEND_API_KEY=re_...
 *   RESEND_FROM=SPC <onboarding@resend.dev>   # ili verifikovani domen
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * npm run deploy:resend
 * npm run deploy:resend -- --test-email tvoj@email.rs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { buildEmailBody, pozoviSendEmail } from "./lib/smtpEdge.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadEnvZaSkripte(ROOT);

const args = process.argv.slice(2);
const testEmailIdx = args.indexOf("--test-email");
const testEmail = testEmailIdx >= 0 ? args[testEmailIdx + 1] : null;

const projectRef =
  process.env.SUPABASE_PROJECT_REF
  || process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  || "";

if (!projectRef) {
  console.error("✗ Nije pronađen project ref. Postavi SUPABASE_PROJECT_REF ili VITE_SUPABASE_URL");
  process.exit(1);
}

function runSupabase(cmdArgs, label) {
  console.log(`\n── ${label} ──`);
  const execCmd = process.platform === "win32" ? "cmd" : "supabase";
  const execArgs = process.platform === "win32" ? ["/c", "supabase", ...cmdArgs] : cmdArgs;
  const r = spawnSync(execCmd, execArgs, { cwd: ROOT, stdio: "inherit", shell: false });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} nije uspeo (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

const resendKeys = ["RESEND_API_KEY", "RESEND_FROM"];
const missing = ["RESEND_API_KEY", "RESEND_FROM"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`✗ Nedostaju: ${missing.join(", ")} u .env.local`);
  console.error("  Registracija: https://resend.com — API Keys → Create");
  console.error("  Test from: onboarding@resend.dev (samo na tvoj Resend nalog email)");
  process.exit(1);
}

for (const k of resendKeys) {
  if (process.env[k]) {
    runSupabase(["secrets", "set", `${k}=${process.env[k]}`, "--project-ref", projectRef], `Secret ${k}`);
  }
}

const from = process.env.RESEND_FROM || "";
if (/onboarding@resend\.dev/i.test(from)) {
  console.warn("\n⚠ RESEND_FROM koristi sandbox (onboarding@resend.dev)");
  console.warn("  Sandbox šalje SAMO na email Resend naloga.");
  console.warn("  Produkcija: verifikuj domen → docs/RESEND_PRODUKCIJA.md");
} else if (from) {
  console.log(`\n✓ RESEND_FROM izgleda kao produkcija: ${from}`);
}

runSupabase(["functions", "deploy", "send-email", "--project-ref", projectRef], "Deploy send-email");

if (testEmail) {
  console.log(`\n── Test Resend (edge) → ${testEmail} ──`);
  try {
    const body = buildEmailBody(process.env, {
      provider: "resend",
      to: testEmail,
      subject: "SPC Resend test",
      text: "Poruka iz npm run deploy:resend — alarmi u browseru.",
    });
    await pozoviSendEmail(process.env, body);
    console.log("✓ Test email poslat (Resend edge) — proveri inbox");
  } catch (e) {
    console.error("✗ Resend test nije uspeo:", e.message);
    process.exit(1);
  }
}

console.log("\n✓ Resend deploy završen");
console.log("  U aplikaciji: Admin → Obaveštenja → Email provider: Resend → Test SPC email");
console.log("  Produkcija (domen): docs/RESEND_PRODUKCIJA.md");
