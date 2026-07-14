#!/usr/bin/env node
/**
 * Provera send-email edge funkcije.
 * npm run check:smtp
 * npm run check:smtp -- --send kvalitet@firma.rs   # stvarni test mail
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { buildEmailBody, pozoviSendEmail, supabaseEmailConfig } from "./lib/smtpEdge.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadEnvZaSkripte(ROOT);

const args = process.argv.slice(2);
const sendIdx = args.indexOf("--send");
const sendTo = sendIdx >= 0 ? args[sendIdx + 1] : null;

const { base, key } = supabaseEmailConfig(process.env);
if (!base || !key) {
  console.error("✗ Nedostaje VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const url = `${base}/functions/v1/send-email`;
console.log(`Provera send-email → ${url}`);

if (sendTo) {
  try {
    const provider = process.env.RESEND_API_KEY ? "resend" : undefined;
    const body = buildEmailBody(process.env, {
      provider,
      to: sendTo,
      subject: "SPC email check",
      text: "Test poruka iz npm run check:smtp -- --send",
    });
    await pozoviSendEmail(process.env, body);
    console.log(`✓ Email poslat na ${sendTo} (${body.provider || "auto"})`);
    process.exit(0);
  } catch (e) {
    console.error("✗ Slanje nije uspelo:", e.message);
    process.exit(1);
  }
}

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    apikey: key,
  },
  body: JSON.stringify({}),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text.slice(0, 200) };
}

if (res.status === 404) {
  console.error("✗ send-email nije deployovan. Pokreni: npm run deploy:smtp");
  process.exit(1);
}

if (res.status === 400 && /to.*obavezan|SMTP nije|Resend nije/i.test(json.error || text)) {
  console.log("✓ send-email je aktivan");
  const imaResend = process.env.RESEND_API_KEY && process.env.RESEND_FROM;
  const imaSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (imaResend) console.log("  Resend u .env.local: da (deploy:resend za browser alarme)");
  if (imaSmtp) console.log("  SMTP u .env.local: da (email:send direktno iz Node)");
  if (!imaResend && !imaSmtp) {
    console.log("  Nema lokalnih email secrets — pokreni deploy:resend ili deploy:smtp");
  }
  console.log("  Stvarni test: npm run check:smtp -- --send tvoj@email.rs");
  process.exit(0);
}

if (res.ok && json.ok !== false) {
  console.log("✓ send-email odgovara OK");
  process.exit(0);
}

console.warn(`~ Neočekivan odgovor (${res.status}):`, json.error || json.raw || text.slice(0, 120));
process.exit(res.status >= 500 ? 1 : 0);
