/**
 * Uvoz merljivih sheet-ova za 5501-A i 5503-A (+ osvežava SOP i karakteristike).
 * Pokreni: npm run seed:5501-5503
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (ili anon ako RLS dozvoljava upsert)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const DOCS = path.resolve("docs");
const URL = process.env.SUPABASE_URL || "https://wzxkcomeurogvfisticq.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";

const supabase = createClient(URL, KEY);

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normHeader(h) {
  return h.trim().replace(/\*+$/, "").replace(/š/gi, "s").replace(/č/gi, "c").replace(/ć/gi, "c").replace(/ž/gi, "z").replace(/đ/gi, "d");
}

async function readCsv(fileName) {
  const txt = await fs.readFile(path.join(DOCS, fileName), "utf8");
  const lines = txt.split(/\r?\n/).filter(l => l.trim());
  const headers = parseCsvLine(lines[0]).map(normHeader);
  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? "").trim(); });
    return row;
  }).filter(row => Object.values(row).some(v => v !== ""));
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return "";
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return 0;
  const chunk = 100;
  let n = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    n += part.length;
  }
  return n;
}

/** Demo merenja za SPC karte — 5 uzoraka po poziciji, serija A */
function generisiMerenja(idDeo, meta, startId) {
  const defs = meta.defs;
  const rows = [];
  let id = startId;
  const datum = "2026-06-01";
  for (const d of defs) {
    const vals = [d.nom, d.nom + 0.02, d.nom - 0.01, d.nom + 0.08, d.nom];
    for (const v of vals) {
      const st = v >= d.lsl && v <= d.usl ? "OK" : "NOK";
      rows.push({
        id,
        datum,
        smena: 1,
        radni_nalog: meta.rn,
        id_deo: idDeo,
        pozicija: d.poz,
        vrednost_raw: String(v).replace(".", ","),
        vrednost_dec: v,
        status: st,
        linija: meta.linija,
        kontrolor: meta.kontrolor,
        operater: meta.kontrolor,
        merni_instrument: d.inst,
        masina: meta.masina,
      });
      id += 1;
    }
  }
  return rows;
}

const MERENJA_DEF = {
  "5501-A": {
    rn: "RN-2024-001",
    linija: "Preseraj",
    masina: "M1",
    kontrolor: "PETROVIC DRAGOMIR",
    defs: [
      { poz: "Ukupna visina", nom: 100, lsl: 99.5, usl: 100.5, inst: "Pomicno merilo" },
      { poz: "Sirina nosaca", nom: 50, lsl: 49.8, usl: 50.2, inst: "Pomicno merilo" },
      { poz: "Dubina kanala", nom: 12, lsl: 11.7, usl: 12.3, inst: "Dubinsko pomicno merilo" },
      { poz: "Razmak rupa", nom: 25, lsl: 24.8, usl: 25.2, inst: "Pomicno merilo" },
      { poz: "Duzina kraka", nom: 75, lsl: 74.7, usl: 75.3, inst: "Pomicno merilo" },
    ],
  },
  "5503-A": {
    rn: "RN-2024-003",
    linija: "Preseraj",
    masina: "M3",
    kontrolor: "peric milic",
    defs: [
      { poz: "Ukupna duzina", nom: 200, lsl: 199.5, usl: 200.5, inst: "Pomicno merilo" },
      { poz: "Sirina poklopca", nom: 40, lsl: 39.8, usl: 40.2, inst: "Pomicno merilo" },
      { poz: "Visina zida", nom: 15, lsl: 14.8, usl: 15.2, inst: "Pomicno merilo" },
      { poz: "Zazor poklopca", nom: 1.2, lsl: 1.15, usl: 1.25, inst: "Tolerancijski cep" },
      { poz: "Dubina kanala", nom: 8, lsl: 7.8, usl: 8.2, inst: "Dubinsko pomicno merilo" },
    ],
  },
};

async function buildXlsx() {
  const sop = await readCsv("sop_deo_varijabilni.csv");
  const kar = await readCsv("karakteristike_merljive.csv");
  const mer = [
    ...generisiMerenja("5501-A", MERENJA_DEF["5501-A"], 301),
    ...generisiMerenja("5503-A", MERENJA_DEF["5503-A"], 326),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sop), "sop_deo_varijabilni");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kar), "karakteristike_merljive");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mer), "merenja_varijabilna");
  const outDocs = path.join(DOCS, "SPC_merljive_demo_5501_5503.xlsx");
  const outPublic = path.resolve("public", "SPC_merljive_demo_5501_5503.xlsx");
  XLSX.writeFile(wb, outDocs);
  await fs.mkdir(path.dirname(outPublic), { recursive: true });
  await fs.copyFile(outDocs, outPublic);
  console.log("XLSX:", outDocs, "+ public/");
  return mer;
}

async function main() {
  console.log("Supabase:", URL);

  const sopRows = (await readCsv("sop_deo_varijabilni.csv"))
    .filter(r => ["5501-A", "5502-A", "5503-A"].includes(pick(r, "id_deo").toUpperCase()))
    .map(r => ({
      id_deo: pick(r, "id_deo").toUpperCase(),
      radni_nalog: pick(r, "radni_nalog"),
      naziv_dela: pick(r, "naziv_dela"),
      slika: pick(r, "slika"),
      masina: pick(r, "masina"),
      linija: pick(r, "linija"),
      broj_merenja: num(pick(r, "broj_merenja")) || 5,
      kontrolor_ime: pick(r, "kontrolor_ime"),
    }));

  const karRows = (await readCsv("karakteristike_merljive.csv"))
    .map(r => ({
      id: num(r.id),
      id_deo: pick(r, "id_deo").toUpperCase(),
      sifra_merenja: pick(r, "sifra_merenja"),
      pozicija: pick(r, "pozicija"),
      naziv_mere: pick(r, "naziv_mere") || null,
      nominala: num(pick(r, "nominala")),
      usl: num(pick(r, "usl")),
      lsl: num(pick(r, "lsl")),
      usl_text: pick(r, "usl_text") || null,
      lsl_text: pick(r, "lsl_text") || null,
      merni_instrument: pick(r, "merni_instrument") || null,
      jedinica: pick(r, "jedinica") || null,
      napomena: pick(r, "napomena") || null,
    }))
    .filter(r => r.id && r.id_deo && r.pozicija);

  const merRows = await buildXlsx();

  const n1 = await upsert("sop_deo_varijabilni", sopRows, "id_deo");
  console.log(`sop_deo_varijabilni: ${n1} redova`);

  const n2 = await upsert("karakteristike_merljive", karRows, "id");
  console.log(`karakteristike_merljive: ${n2} redova`);

  const n3 = await upsert("merenja_varijabilna", merRows, "id");
  console.log(`merenja_varijabilna: ${n3} demo merenja (5501-A, 5503-A)`);

  console.log("\nGotovo. U aplikaciji: osveži stranicu, unesi 5501-A ili 5503-A.");
  console.log("Excel za ručni uvoz: docs/SPC_merljive_demo_5501_5503.xlsx");
  console.log(
    "Posle seed-a pokreni u Supabase: 19_fix_merenja_varijabilna_sequence.sql"
    + " (inače Sačuvaj seriju može javiti duplicate key).",
  );
}

async function run() {
  if (process.argv.includes("--xlsx-only")) {
    await buildXlsx();
    console.log("Samo XLSX (bez Supabase).");
    return;
  }
  await main();
}

run().catch(e => {
  console.error(e.message);
  if (/row-level security/i.test(e.message)) {
    console.error("\nRLS: uloguj se u app pa Admin → Demo 5501-A/5503-A, ili pokreni docs/19_seed_5501_5503_merljive.sql u Supabase SQL Editoru, ili postavi SUPABASE_SERVICE_ROLE_KEY.");
  }
  process.exit(1);
});
