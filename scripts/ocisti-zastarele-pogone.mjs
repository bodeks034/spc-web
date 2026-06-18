#!/usr/bin/env node
/**
 * Uklanja fantomske pogone iz Supabase (npr. Preseraj B za 5502-A kad u Excelu postoji samo G).
 *
 * node scripts/ocisti-zastarele-pogone.mjs
 * node scripts/ocisti-zastarele-pogone.mjs --deo 5502-A
 * node scripts/ocisti-zastarele-pogone.mjs --import  (čita karakteristike iz sifrarnik-paket CSV)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { purgeStalePogonsForDelove } from "../src/lib/purgeStalePogons.js";
import { mapKarakteristikaMerljiveRow } from "../src/lib/karakteristikaMerljive.js";
import { sifrarnikCsvDir } from "../src/lib/sifrarnikPaths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function ucitajKarCsv(csvPath) {
  const text = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const obj = {};
    header.forEach((h, j) => {
      obj[h] = cells[j] ?? "";
    });
    rows.push(mapKarakteristikaMerljiveRow(obj));
  }
  return rows.filter((r) => r.id_deo);
}

function parseArgs(argv) {
  const deoIdx = argv.indexOf("--deo");
  const deo = deoIdx >= 0 && argv[deoIdx + 1] ? argv[deoIdx + 1].toUpperCase() : null;
  const izCsv = argv.includes("--import") || argv.includes("--csv");
  const csvPathIdx = argv.indexOf("--csv-path");
  const csvPath = csvPathIdx >= 0 && argv[csvPathIdx + 1]
    ? (path.isAbsolute(argv[csvPathIdx + 1])
      ? argv[csvPathIdx + 1]
      : path.join(ROOT, argv[csvPathIdx + 1]))
    : path.join(sifrarnikCsvDir(ROOT), "karakteristike_merljive.csv");
  return { deo, izCsv, csvPath };
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.local");
  }

  const { deo, izCsv, csvPath } = parseArgs(process.argv);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let karRows;
  let idDeos;

  if (izCsv) {
    if (!fs.existsSync(csvPath)) throw new Error(`Nema CSV: ${csvPath}`);
    karRows = ucitajKarCsv(csvPath);
    idDeos = deo ? [deo] : [...new Set(karRows.map((r) => r.id_deo))];
    console.log(`CSV: ${csvPath} (${karRows.length} redova)`);
  } else if (deo) {
    idDeos = [deo];
    const { data, error } = await supabase
      .from("karakteristike_merljive")
      .select("*")
      .eq("id_deo", deo);
    if (error) throw error;
    karRows = data || [];
    console.log(`Baza: karakteristike za ${deo} (${karRows.length} redova)`);
  } else {
    throw new Error("Koristi --import (iz CSV) ili --deo ID (iz baze kao izvor)");
  }

  if (deo) {
    karRows = karRows.filter((r) => String(r.id_deo).toUpperCase() === deo);
    idDeos = [deo];
  }

  console.log(`Delovi: ${idDeos.join(", ")}\n`);
  const purge = await purgeStalePogonsForDelove(supabase, idDeos, karRows);

  if (!purge.total) {
    console.log("Nema zastarelih pogona za brisanje.");
    return;
  }

  console.log(`Obrisano ukupno: ${purge.total} red(ova)\n`);
  for (const d of purge.detail) {
    console.log(`  ${d.id_deo} | ${d.table} | pogon ${d.pogon_kod} → ${d.deleted}`);
  }
  console.log("\nGotovo. Osveži aplikaciju (Ctrl+F5).");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
