#!/usr/bin/env node
/**
 * Kreira foldere public/sifrarnik/linije/vozila|proizvodi/{KOD}/ za sve VOZ-* i PRO-* linije.
 * Čita tipovi_vozila iz Supabase; ako nema veze — koristi VOZ-01..10 i PRO-01..10.
 *
 * npm run sync:linije-crtezi
 * npm run sync:linije-crtezi -- --dry-run
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import {
  LINIJA_PODFOLDERI,
  LINIJE_CRTEZI_REL,
  citajMeKoren,
  citajMeLinija,
  kodoviLinijaIzTipova,
  podrazumevaneLinije,
  putanjaLinijeAbs,
} from "../src/lib/linijaCrteziPaths.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");
const KOD_ARG = (() => {
  const i = process.argv.indexOf("--kod");
  return i >= 0 ? String(process.argv[i + 1] || "").trim().toUpperCase() : "";
})();

async function fetchKodoviIzBaze() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("tipovi_vozila").select("kod,naziv").order("kod");
  if (error) {
    console.warn("⚠ Baza:", error.message, "— koristim podrazumevane linije.");
    return null;
  }
  return data || [];
}

async function ensureFile(filePath, content, stats) {
  try {
    await fs.access(filePath);
    return;
  } catch {
    /* novi */
  }
  if (DRY) {
    console.log(`  + ${path.relative(ROOT, filePath)}`);
    stats.files += 1;
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  stats.files += 1;
}

async function ensureDir(dirPath, stats) {
  if (DRY) {
    console.log(`  + ${path.relative(ROOT, dirPath)}/`);
    stats.dirs += 1;
    return;
  }
  await fs.mkdir(dirPath, { recursive: true });
  stats.dirs += 1;
}

async function syncLinija(kod, nazivMap, stats) {
  const abs = putanjaLinijeAbs(ROOT, kod);
  if (!abs) return;
  await ensureDir(abs, stats);
  for (const pod of LINIJA_PODFOLDERI) {
    await ensureDir(path.join(abs, pod), stats);
    await ensureFile(path.join(abs, pod, ".gitkeep"), "", stats);
  }
  await ensureFile(
    path.join(abs, "CITAJ_ME.md"),
    citajMeLinija(kod, nazivMap.get(kod) || ""),
    stats,
  );
}

async function main() {
  const tipovi = await fetchKodoviIzBaze();
  const nazivMap = new Map((tipovi || []).map((t) => [String(t.kod).toUpperCase(), t.naziv || ""]));

  let kodovi = tipovi ? kodoviLinijaIzTipova(tipovi) : [];
  const { vozila, proizvodi } = podrazumevaneLinije();
  if (!kodovi.length) {
    kodovi = [...vozila, ...proizvodi];
    console.log("Koristim podrazumevane linije VOZ-01..10 i PRO-01..10.");
  } else {
    for (const k of [...vozila, ...proizvodi]) {
      if (!kodovi.includes(k)) kodovi.push(k);
    }
    kodovi.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  const stats = { dirs: 0, files: 0 };
  const koren = path.join(ROOT, LINIJE_CRTEZI_REL);
  await ensureDir(path.join(koren, "vozila"), stats);
  await ensureDir(path.join(koren, "proizvodi"), stats);
  await ensureFile(path.join(koren, "CITAJ_ME.md"), citajMeKoren(), stats);

  console.log(`${DRY ? "[dry-run] " : ""}Sinhronizacija ${kodovi.length} linija → ${LINIJE_CRTEZI_REL}/\n`);
  for (const kod of kodovi) {
    if (KOD_ARG && kod !== KOD_ARG) continue;
    console.log(`• ${kod}`);
    await syncLinija(kod, nazivMap, stats);
  }

  console.log(`\n✓ ${stats.dirs} folder(a), ${stats.files} novih fajlova${DRY ? " (simulacija)" : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
