#!/usr/bin/env node
/**
 * Automatski dnevni ERP uvoz — bez ručnog CSV u aplikaciji.
 *
 * ERP izvozi CSV u folder (drop zone), cron/Task Scheduler pokreće ovu skriptu.
 *
 * Upotreba:
 *   node scripts/erp-dnevni-uvoz.mjs
 *   node scripts/erp-dnevni-uvoz.mjs --dry-run
 *   node scripts/erp-dnevni-uvoz.mjs --fajl C:\erp\izvoz\nalozi.csv
 *
 * Env (.env.erp ili .env.local):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ERP_DROP_DIR=erp-drop/incoming   (folder gde ERP piše CSV)
 *   ERP_MIN_AGE_MIN=2                (ne uvozi fajl mladji od N min — ERP još piše)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { upisiErpUvozLog } from "../src/lib/erpUvozLog.js";
import {
  parsirajRadniNaloziCsv,
  upsertRadniNalozi,
} from "../src/lib/radniNaloziUvoz.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { dryRun: false, fajl: null };
  for (let i = 2; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--dry-run") args.dryRun = true;
    else if (t === "--fajl" && argv[i + 1]) {
      args.fajl = path.resolve(argv[i + 1]);
      i += 1;
    } else if (!t.startsWith("--")) args.fajl = path.resolve(t);
  }
  return args;
}

async function appendLog(logPath, line) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  const stamp = new Date().toISOString();
  await fs.appendFile(logPath, `[${stamp}] ${line}\n`, "utf8");
}

async function nadjiCsv(explicit, dropDir) {
  if (explicit) return explicit;

  let entries;
  try {
    entries = await fs.readdir(dropDir, { withFileTypes: true });
  } catch {
    throw new Error(`ERP drop folder ne postoji: ${dropDir}`);
  }

  const csvs = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!/\.csv$/i.test(ent.name)) continue;
    const full = path.join(dropDir, ent.name);
    const st = await fs.stat(full);
    csvs.push({ full, mtime: st.mtimeMs, size: st.size });
  }

  if (!csvs.length) {
    return null;
  }

  csvs.sort((a, b) => b.mtime - a.mtime);
  return csvs[0].full;
}

async function arhiviraj(csvPath, processedRoot) {
  const stamp = new Date().toISOString().slice(0, 10);
  const destDir = path.join(processedRoot, stamp);
  await fs.mkdir(destDir, { recursive: true });
  const base = path.basename(csvPath);
  let dest = path.join(destDir, base);
  if (await fs.access(dest).then(() => true).catch(() => false)) {
    const ext = path.extname(base);
    const name = path.basename(base, ext);
    dest = path.join(destDir, `${name}_${Date.now()}${ext}`);
  }
  await fs.rename(csvPath, dest);
  return dest;
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const args = parseArgs(process.argv);

  const dropRel = process.env.ERP_DROP_DIR || "erp-drop/incoming";
  const dropDir = path.isAbsolute(dropRel) ? dropRel : path.join(ROOT, dropRel);
  const processedRoot = path.join(path.dirname(dropDir), "processed");
  const logPath = path.join(ROOT, "logs", "erp-uvoz.log");

  const csvPath = await nadjiCsv(args.fajl, dropDir);
  if (!csvPath) {
    const msg = `Nema CSV u ${dropDir} — preskačem (ERP još nije izvezao).`;
    console.log(msg);
    await appendLog(logPath, msg);
    return;
  }

  const minAgeMin = Number(process.env.ERP_MIN_AGE_MIN || 2);
  if (minAgeMin > 0) {
    const st = await fs.stat(csvPath);
    const ageMs = Date.now() - st.mtimeMs;
    if (ageMs < minAgeMin * 60 * 1000) {
      const msg = `Fajl ${path.basename(csvPath)} je premlad (${Math.round(ageMs / 1000)}s) — čekam da ERP završi upis.`;
      console.log(msg);
      await appendLog(logPath, msg);
      return;
    }
  }

  const txt = await fs.readFile(csvPath, "utf8");
  const parsed = parsirajRadniNaloziCsv(txt);

  console.log(`Fajl: ${csvPath}`);
  console.log(`Redova: ${parsed.ukupno} · validnih: ${parsed.validnih}`);
  if (parsed.greske.length) {
    console.log("Upozorenja:");
    parsed.greske.slice(0, 10).forEach((g) => console.log(`  ⚠ ${g}`));
    if (parsed.greske.length > 10) console.log(`  … +${parsed.greske.length - 10}`);
  }

  if (!parsed.redovi.length) {
    const msg = "Nema validnih naloga (proveri broj_naloga i id_deo u ERP izvozu).";
    console.error(msg);
    await appendLog(logPath, `GREŠKA ${csvPath}: ${msg}`);
    process.exit(1);
  }

  if (args.dryRun) {
    parsed.redovi.slice(0, 3).forEach((r) => {
      console.log(`  ${r.broj_naloga} · ${r.id_deo} · ${r.kolicina ?? "—"} · ${r.status ?? "?"}`);
    });
    console.log("\n--dry-run: bez upisa.");
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.erp ili .env.local");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const res = await upsertRadniNalozi(supabase, parsed.redovi, { mergeNulls: true });

  const aktivni = parsed.redovi.filter((r) => (r.status ?? "aktivan") === "aktivan").length;
  const detalj = parsed.greske.length
    ? parsed.greske.slice(0, 20).join("\n")
    : null;

  if (!res.ok) {
    const errMsg = res.error?.message || String(res.error);
    console.error("Greška:", errMsg);
    await upisiErpUvozLog(supabase, {
      izvor: "cron",
      fajl: path.basename(csvPath),
      ukupno: parsed.ukupno,
      validnih: parsed.validnih,
      upsertovano: res.upsertovano || 0,
      aktivnih,
      upozorenja: parsed.greske.length,
      uspeh: false,
      greska: errMsg,
      detalj,
    }).catch(() => {});
    await appendLog(logPath, `GREŠKA ${csvPath}: ${errMsg}`);
    process.exit(1);
  }

  let arhiva = null;
  if (!args.fajl || path.dirname(csvPath) === dropDir) {
    try {
      arhiva = await arhiviraj(csvPath, processedRoot);
    } catch (e) {
      console.warn("Arhiva preskočena:", e.message);
    }
  }

  await upisiErpUvozLog(supabase, {
    izvor: "cron",
    fajl: path.basename(csvPath),
    ukupno: parsed.ukupno,
    validnih: parsed.validnih,
    upsertovano: res.upsertovano,
    aktivnih,
    upozorenja: parsed.greske.length,
    uspeh: true,
    detalj,
  }).catch((e) => console.warn("Log u bazu:", e.message));

  const okMsg = `✓ Upsert ${res.upsertovano} naloga (aktivnih ~${aktivni})${arhiva ? ` · arhiva: ${arhiva}` : ""}`;
  console.log(okMsg);
  await appendLog(logPath, okMsg);
}

main().catch(async (e) => {
  const msg = e.message || String(e);
  console.error(msg);
  try {
    const logPath = path.join(ROOT, "logs", "erp-uvoz.log");
    await appendLog(logPath, `FATAL: ${msg}`);
  } catch { /* */ }
  process.exit(1);
});
