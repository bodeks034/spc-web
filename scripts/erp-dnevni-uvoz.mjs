#!/usr/bin/env node
/**
 * Automatski dnevni ERP uvoz (Nivo C) — konfigurabilan SAP / Pantheon / custom.
 *
 * ERP izvozi CSV u drop folder; cron/Task Scheduler pokreće ovu skriptu.
 * Konfiguracija: config/erp/erp-uvoz.config.json + presets/sap.json | pantheon.json
 *
 * Upotreba:
 *   node scripts/erp-dnevni-uvoz.mjs
 *   node scripts/erp-dnevni-uvoz.mjs --dry-run
 *   node scripts/erp-dnevni-uvoz.mjs --preset pantheon
 *   node scripts/erp-dnevni-uvoz.mjs --entitet radni_nalozi
 *   node scripts/erp-dnevni-uvoz.mjs --config config/erp/erp-uvoz.config.json
 *
 * Env (.env.erp ili .env.local):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ERP_DROP_DIR, ERP_MIN_AGE_MIN, ERP_PRESET
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { upisiErpUvozLog } from "../src/lib/erpUvozLog.js";
import {
  ucitajErpConfig,
  pokreniErpUvoz,
} from "../src/lib/erpUvozEngine.js";
import {
  formatErpUvozRezultat,
  sumErpRezultati,
} from "../src/lib/erpUvozCore.js";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";
import { jeAutoPraviloUkljuceno, spojiAutoPodesavanja } from "../src/lib/autoPodesavanja.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "erp-uvoz.log", { jobId: "erp-dnevni-uvoz" });

function parseArgs(argv) {
  const args = {
    dryRun: false,
    preset: null,
    entitet: null,
    config: null,
    fajl: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const t = argv[i];
    if (t === "--dry-run") args.dryRun = true;
    else if (t === "--preset" && argv[i + 1]) {
      args.preset = argv[i + 1];
      i += 1;
    } else if (t === "--entitet" && argv[i + 1]) {
      args.entitet = argv[i + 1];
      i += 1;
    } else if (t === "--config" && argv[i + 1]) {
      args.config = path.resolve(argv[i + 1]);
      i += 1;
    } else if (t === "--fajl" && argv[i + 1]) {
      args.fajl = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
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

function sumRezultati(rezultati) {
  return sumErpRezultati(rezultati);
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const args = parseArgs(process.argv);

  await skriptaLog.run(`erp-uvoz${args.dryRun ? " (dry-run)" : ""}`, async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      let settings = spojiAutoPodesavanja({});
      try {
        const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
        (data || []).forEach((r) => { settings[r.kljuc] = r.vrednost ?? ""; });
        settings = spojiAutoPodesavanja(settings);
      } catch { /* */ }
      if (!jeAutoPraviloUkljuceno(settings, "erp")) {
        await skriptaLog.info("ERP uvoz iskljucen u podesavanjima");
        return;
      }
    }
    return pokreniErpUvozGlavni(args);
  });
}

async function pokreniErpUvozGlavni(args) {
  const config = await ucitajErpConfig(ROOT, {
    configPath: args.config,
    preset: args.preset,
  });

  const dropRel = config.drop_dir || process.env.ERP_DROP_DIR || "erp-drop/incoming";
  const dropDir = path.isAbsolute(dropRel) ? dropRel : path.join(ROOT, dropRel);
  const processedRoot = path.join(path.dirname(dropDir), "processed");

  console.log(`ERP uvoz — preset: ${config.preset} (${config.erp_sistem})`);
  console.log(`  Config: ${args.config || "config/erp/erp-uvoz.config.json"}`);
  console.log(`  Drop:   ${dropDir}`);
  if (args.dryRun) console.log("  --dry-run (bez upisa)\n");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!args.dryRun && (!url || !key)) {
    throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.erp ili .env.local");
  }

  const supabase = args.dryRun
    ? null
    : createClient(url, key, { auth: { persistSession: false } });

  const res = await pokreniErpUvoz(supabase, config, {
    incomingDir: dropDir,
    dryRun: args.dryRun,
    entitetFilter: args.entitet,
    minAgeMin: args.dryRun ? 0 : config.min_age_min,
    arhivirajFn: args.dryRun
      ? null
      : async (csvPath) => {
          if (args.fajl) return null;
          return arhiviraj(csvPath, processedRoot);
        },
  });

  console.log(formatErpUvozRezultat(res));

  const sum = sumRezultati(res.rezultati);
  const detalj = sum.greske.length ? sum.greske.slice(0, 30).join("\n") : null;
  const fajlovi = res.rezultati.filter((r) => r.fajl).map((r) => r.fajl).join(", ");

  const nemaPosla = res.rezultati.every(
    (r) => r.status === "iskljuceno" || r.status === "nema_fajla" || r.status === "premlad",
  );

  if (nemaPosla && !args.dryRun) {
    const msg = `Nema CSV za uvoz u ${dropDir} — preskačem.`;
    console.log(`\n${msg}`);
    await skriptaLog.info(msg);
    return;
  }

  if (!res.ok && !args.dryRun) {
    const errMsg = res.rezultati.find((r) => r.greska)?.greska || "Greška pri uvozu";
    await upisiErpUvozLog(supabase, {
      izvor: "cron",
      fajl: fajlovi || null,
      ukupno: sum.ukupno,
      validnih: sum.validnih,
      upsertovano: sum.upsertovano,
      aktivnih: 0,
      upozorenja: sum.upozorenja,
      uspeh: false,
      greska: errMsg,
      detalj: `${formatErpUvozRezultat(res)}\n${detalj || ""}`.trim(),
    }).catch(() => {});
    await skriptaLog.error(errMsg);
    throw new Error(errMsg);
  }

  if (!args.dryRun && supabase) {
    await upisiErpUvozLog(supabase, {
      izvor: "cron",
      fajl: fajlovi || null,
      ukupno: sum.ukupno,
      validnih: sum.validnih,
      upsertovano: sum.upsertovano,
      aktivnih: 0,
      upozorenja: sum.upozorenja,
      uspeh: true,
      detalj: formatErpUvozRezultat(res),
    }).catch((e) => console.warn("Log u bazu:", e.message));
  }

  const okMsg = args.dryRun
    ? "Gotovo (dry-run)."
    : `Upsert ukupno ${sum.upsertovano} redova`;
  console.log(`\n${args.dryRun ? okMsg : `✓ ${okMsg}`}`);
  await skriptaLog.info(okMsg);
}

main().catch(async (e) => {
  const msg = e.message || String(e);
  console.error(msg);
  try {
    await skriptaLog.error(`FATAL: ${msg}`);
  } catch { /* */ }
  process.exit(1);
});
