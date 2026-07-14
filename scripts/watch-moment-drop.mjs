#!/usr/bin/env node
/**
 * Obrada moment-drop fascikli:
 *   incoming/*.xlsx  → uvoz šifrarnika (kao import-modul3-moment)
 *   izvoz/*          → uvoz protokola zatezanja u moment_protokol
 *
 * node scripts/watch-moment-drop.mjs [--zameni] [--dry-run] [--job-id N] [--deo ID]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { ucitajMomentXlsx } from "../src/lib/momentKljucXlsx.js";
import { snimiMomentListu, osigurajMomentToolMaster } from "../src/lib/momentKljucListApi.js";
import { uveziMomentProtokolIzTeksta } from "../src/lib/momentIzvozUvoz.js";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "moment-drop.log", { jobId: "moment-drop" });
const INCOMING = path.join(ROOT, "moment-drop", "incoming");
const IZVOZ = path.join(ROOT, "moment-drop", "izvoz");
const PROCESSED = path.join(ROOT, "moment-drop", "processed");

const args = process.argv.slice(2);
const zameni = args.includes("--zameni");
const dryRun = args.includes("--dry-run");
const jobIdArg = Number(args.find((a, i) => args[i - 1] === "--job-id"));
const deoArg = args.find((a, i) => args[i - 1] === "--deo");

const IZVOZ_EXT = new Set([".csv", ".txt", ".log", ".xml", ".json"]);

async function listFiles(dir, filterFn) {
  try {
    const names = await fs.readdir(dir);
    return (await Promise.all(names.map(async (n) => {
      const full = path.join(dir, n);
      const st = await fs.stat(full);
      if (!st.isFile()) return null;
      return filterFn(n) ? full : null;
    }))).filter(Boolean);
  } catch {
    return [];
  }
}

async function arhiviraj(srcPath, podfolder) {
  if (dryRun) return;
  const destDir = path.join(PROCESSED, podfolder);
  await fs.mkdir(destDir, { recursive: true });
  const base = path.basename(srcPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = path.join(destDir, `${stamp}_${base}`);
  await fs.rename(srcPath, dest);
  console.log(`  → arhiva: ${path.relative(ROOT, dest)}`);
}

async function obradiIncoming(supabase) {
  const fajlovi = await listFiles(INCOMING, (n) => /\.xlsx?$/i.test(n));
  if (!fajlovi.length) {
    console.log("incoming: nema novih Excel fajlova");
    return;
  }

  const alati = await osigurajMomentToolMaster(supabase);
  console.log(`incoming: ${fajlovi.length} fajl(ova), tool master +${alati}`);

  for (const fp of fajlovi) {
    console.log(`\nUvoz šifrarnika: ${path.basename(fp)}`);
    const buf = await fs.readFile(fp);
    const redovi = ucitajMomentXlsx(buf);
    if (!redovi.length) {
      console.warn("  ⚠ nema prepoznatih redova — preskačem");
      continue;
    }
    if (dryRun) {
      console.log(`  (dry-run) ${redovi.length} redova`);
      continue;
    }
    const r = await snimiMomentListu(supabase, redovi, {
      zameniPostojece: zameni,
      idDeoFilter: deoArg || null,
    });
    console.log(`  ✓ JOB: ${r.jobovi} · poz: ${r.pozicije} · kor: ${r.koraci}`);
    if (r.greske?.length) r.greske.forEach((g) => console.error(`    ! ${g}`));
    await arhiviraj(fp, "incoming");
  }
}

async function resolveJobId(supabase, idDeo) {
  if (Number.isFinite(jobIdArg)) return jobIdArg;
  const { data } = await supabase.from("moment_job")
    .select("id,kod_job")
    .eq("id_deo", idDeo)
    .eq("aktivan", true)
    .order("id")
    .limit(1);
  return data?.[0]?.id ?? null;
}

async function obradiIzvoz(supabase) {
  const fajlovi = await listFiles(IZVOZ, (n) => IZVOZ_EXT.has(path.extname(n).toLowerCase()));
  if (!fajlovi.length) {
    console.log("izvoz: nema novih fajlova");
    return;
  }

  console.log(`\nizvoz: ${fajlovi.length} fajl(ova)`);
  for (const fp of fajlovi) {
    const text = await fs.readFile(fp, "utf8");
    const base = path.basename(fp, path.extname(fp));
    const deoMatch = base.match(/([A-Z0-9]+-[A-Z0-9]+)/i);
    const idDeo = (deoArg || deoMatch?.[1] || "").toUpperCase();
    if (!idDeo) {
      console.warn(`  ⚠ ${path.basename(fp)}: navedite --deo ID_DELO`);
      continue;
    }

    const jobId = await resolveJobId(supabase, idDeo);
    if (!jobId) {
      console.warn(`  ⚠ ${path.basename(fp)}: nema aktivnog JOB-a za ${idDeo} (koristite --job-id)`);
      continue;
    }

    const r = await uveziMomentProtokolIzTeksta(supabase, {
      text,
      jobId,
      idDeo,
      vendorProfil: "generic",
      dryRun,
    });
    if (r.greska) console.warn(`  ⚠ ${r.greska}`);
    else console.log(`  ✓ ${path.basename(fp)}: ${r.uvezeno}/${r.ukupno} u JOB ${r.kodJob}`);
    if (r.greske?.length) r.greske.forEach((g) => console.warn(`    ! ${g}`));
    if (!r.greska && !dryRun) await arhiviraj(fp, "izvoz");
  }
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Nedostaje SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env");
    process.exit(1);
  }

  const watchMode = args.includes("--watch");
  await fs.mkdir(PROCESSED, { recursive: true });
  const supabase = createClient(url, key);

  const run = async () => {
    const label = `moment-drop${dryRun ? " dry-run" : ""}${watchMode ? " watch" : ""}`;
    await skriptaLog.run(label, async () => {
      console.log(dryRun ? "\nDRY RUN — bez upisa u bazu" : "\nMoment-drop obrada");
      await obradiIncoming(supabase);
      await obradiIzvoz(supabase);
      console.log("Gotovo.");
    });
  };

  if (!watchMode) {
    await run();
    return;
  }

  console.log("Watch režim — prati incoming/ i izvoz/ (Ctrl+C za izlaz)");
  await run();
  for (const dir of [INCOMING, IZVOZ]) {
    const { watch } = await import("node:fs");
    watch(dir, { persistent: true }, (evt, name) => {
      if (!name) return;
      console.log(`\n[${evt}] ${name}`);
      run().catch((e) => console.error(e.message));
    });
  }
}

main().catch(async (e) => {
  console.error(e);
  try { await skriptaLog.error(e.message || String(e)); } catch { /* */ }
  process.exit(1);
});
