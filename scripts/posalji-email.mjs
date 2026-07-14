#!/usr/bin/env node
/**
 * Slanje emaila van aplikacije (cron, IT test, skripte).
 *
 * SMTP: secrets na Supabase edge (npm run deploy:smtp) ILI SMTP_* u .env.local
 *
 * npm run email:send -- --to kvalitet@firma.rs --subject "Test" --text "Poruka"
 * npm run email:send -- --to a@b.rs --subject "Izveštaj" --file poruka.txt
 * npm run email:send -- --to a@b.rs --html "<p>HTML</p>"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { buildSmtpBody, pozoviSendEmail } from "./lib/smtpEdge.mjs";
import { posaljiSmtpDirektno, smtpConfigFromEnv } from "./lib/smtpDirect.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadEnvZaSkripte(ROOT);

const args = process.argv.slice(2);

function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const to = arg("--to") || process.env.SMTP_TO;
const subject = arg("--subject") || "SPC obaveštenje";
const file = arg("--file");
const text = arg("--text") || (file ? fs.readFileSync(path.resolve(file), "utf8") : null);
const html = arg("--html");
const useEdge = args.includes("--edge");

if (!text && !html) {
  console.error(`Upotreba:
  npm run email:send -- --to primalac@firma.rs --subject "Naslov" --text "Tekst"
  npm run email:send -- --to primalac@firma.rs --subject "Naslov" --file poruka.txt

Env (.env.local): SMTP_HOST, SMTP_USER, SMTP_PASS ili deploy:smtp secrets na edge-u.`);
  process.exit(1);
}

try {
  console.log(`Šaljem → ${to} · ${subject}`);

  const imaLokalniSmtp = (() => {
    try { smtpConfigFromEnv(process.env); return true; } catch { return false; }
  })();

  if (!useEdge && imaLokalniSmtp) {
    console.log(`SMTP: direktno ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
    await posaljiSmtpDirektno(process.env, { to, subject, text, html });
  } else {
    const body = buildSmtpBody(process.env, { to, subject, text, html });
    if (body.smtp_host) {
      console.log(`SMTP: edge + ${body.smtp_host}:${body.smtp_port}`);
    } else {
      console.log("SMTP: edge secrets");
    }
    await pozoviSendEmail(process.env, body);
  }
  console.log("✓ Email poslat");
} catch (e) {
  console.error("✗", e.message);
  process.exit(1);
}
