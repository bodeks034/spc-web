#!/usr/bin/env node
/**
 * Deploy Supabase edge funkcije send-email (SMTP) + secrets.
 *
 * U .env.local:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (opciono)
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * npm run deploy:smtp
 * npm run deploy:smtp -- --test-email kvalitet@firma.rs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { buildEmailBody, pozoviSendEmail } from "./lib/smtpEdge.mjs";
import { posaljiSmtpDirektno, smtpConfigFromEnv } from "./lib/smtpDirect.mjs";

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

const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_TLS"];
const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`⚠ Nedostaju env za secrets: ${missing.join(", ")}`);
  console.warn("  Postavi u .env.local pa ponovi, ili: supabase secrets set SMTP_HOST=...");
} else {
  for (const k of smtpKeys) {
    if (process.env[k]) {
      runSupabase(["secrets", "set", `${k}=${process.env[k]}`, "--project-ref", projectRef], `Secret ${k}`);
    }
  }
}

runSupabase(["functions", "deploy", "send-email", "--project-ref", projectRef], "Deploy send-email");

if (testEmail) {
  console.log(`\n── Test email → ${testEmail} ──`);
  const payload = {
    to: testEmail,
    subject: "SPC SMTP test",
    text: "send-email edge funkcija je aktivna. Poruka poslata iz npm run deploy:smtp.",
  };

  let poslato = false;
  try {
    smtpConfigFromEnv(process.env);
    console.log("  Pokušaj 1: direktno SMTP iz Node (preporučeno za Gmail)…");
    await posaljiSmtpDirektno(process.env, payload);
    console.log("✓ Test email poslat (direktno) — proveri inbox");
    poslato = true;
  } catch (directErr) {
    console.warn(`  Direktno nije uspelo: ${directErr.message}`);
    if (/Application-specific password|Invalid login/i.test(directErr.message)) {
      console.warn("  Gmail: kreiraj App Password → https://myaccount.google.com/apppasswords");
      console.warn("  U .env.local stavi SMTP_PASS na 16-znak app password (ne običnu lozinku).");
    }
  }

  if (!poslato && process.env.RESEND_API_KEY) {
    try {
      console.log("  Pokušaj 2: Resend (edge, za browser alarme)…");
      const body = buildEmailBody(process.env, {
        provider: "resend",
        ...payload,
        subject: "SPC Resend test",
      });
      await pozoviSendEmail(process.env, body);
      console.log("✓ Test email poslat (Resend edge) — proveri inbox");
      poslato = true;
    } catch (resendErr) {
      console.warn(`  Resend edge nije uspeo: ${resendErr.message}`);
    }
  }

  if (!poslato) {
    try {
      console.log("  Pokušaj 3: Supabase edge SMTP…");
      const body = buildEmailBody(process.env, { ...payload, provider: "smtp" });
      await pozoviSendEmail(process.env, body);
      console.log("✓ Test email poslat (edge) — proveri inbox");
      poslato = true;
    } catch (e) {
      console.error("✗ Edge slanje nije uspelo:", e.message);
      if (/503/.test(e.message)) {
        console.error("  Supabase Edge često blokira SMTP portove 587/465. Za alarme u browseru koristi Resend API ili firminski mail na portu 2587.");
      }
      process.exit(1);
    }
  }
}

console.log("\n✓ SMTP deploy završen");
console.log("  U aplikaciji: Admin → Obaveštenja → unesi primalce (to) → Test SPC email");
console.log("  Van aplikacije: npm run email:send -- --to ... --subject ... --text ...");
