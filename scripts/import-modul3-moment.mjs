#!/usr/bin/env node
/**
 * Uvoz moment šifrarnika iz Modul 3 Excel-a ili flat šablona.
 * node scripts/import-modul3-moment.mjs [putanja.xlsx] [--zameni] [--deo MRAP1-001]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { ucitajMomentXlsx } from "../src/lib/momentKljucXlsx.js";
import { snimiMomentListu, osigurajMomentToolMaster } from "../src/lib/momentKljucListApi.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const zameni = args.includes("--zameni");
const deoArg = args.find((a, i) => args[i - 1] === "--deo");
const fileArg = args.find((a) => !a.startsWith("--") && a !== deoArg);

async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* optional */ }
}

async function main() {
  await loadEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Nedostaje SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env");
    process.exit(1);
  }

  const defaultXlsx = path.join(ROOT, "moment-drop", "incoming", "modul 3 kljuc.xlsx");
  const fallbackXlsx = path.join(process.env.USERPROFILE || "", "Downloads", "kluc dig", "modul 3 kljuc.xlsx");
  let xlsxPath = fileArg ? path.resolve(fileArg) : defaultXlsx;
  try {
    await fs.access(xlsxPath);
  } catch {
    if (!fileArg) xlsxPath = fallbackXlsx;
  }

  let buf;
  try {
    buf = await fs.readFile(xlsxPath);
  } catch {
    console.error(`Ne mogu da pročitam: ${xlsxPath}`);
    console.error("Upotreba: node scripts/import-modul3-moment.mjs [fajl.xlsx] [--zameni] [--deo ID]");
    process.exit(1);
  }

  const redovi = ucitajMomentXlsx(buf);
  if (!redovi.length) {
    console.error("Nema prepoznatih redova u Excel-u");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const alati = await osigurajMomentToolMaster(supabase);
  console.log(`Tool master: ${alati} novih alata`);

  const r = await snimiMomentListu(supabase, redovi, {
    zameniPostojece: zameni,
    idDeoFilter: deoArg || null,
  });

  console.log(`✓ ${xlsxPath}`);
  console.log(`  JOB: ${r.jobovi} · poz: ${r.pozicije} · kor: ${r.koraci}`);
  if (r.preskoceno?.length) console.log(`  Preskočeno (postojeći): ${r.preskoceno.length}`);
  if (r.greske.length) {
    console.error(`  Greške (${r.greske.length}):`);
    r.greske.forEach((g) => console.error(`    - ${g}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
