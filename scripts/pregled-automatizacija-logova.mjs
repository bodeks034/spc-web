#!/usr/bin/env node
/**
 * Pregled logova automatizacije (ERP, digest, podsetnici).
 *
 * npm run logs:auto
 * npm run logs:auto -- --lines 80
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTO_LOG_FAJLOVI, procitajPoslednjeLinije } from "./lib/skriptaLog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const linesArg = args.indexOf("--lines");
const limit = linesArg >= 0 ? Number(args[linesArg + 1]) || 40 : 40;

for (const fajl of AUTO_LOG_FAJLOVI) {
  const { logPath, linije, postoji } = await procitajPoslednjeLinije(ROOT, fajl, limit);
  console.log(`\n══ ${fajl} ══`);
  console.log(postoji ? logPath : `${logPath} (jos nema zapisa)`);
  if (!linije.length) {
    console.log("  (prazno)");
    continue;
  }
  for (const l of linije) console.log(l);
}

console.log("");
