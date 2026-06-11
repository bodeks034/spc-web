/**
 * Iz karakteristike_merljive (+ kolone atributivne/merljive) generiše:
 *   - docs/sop_deo_varijabilni.csv
 *   - docs/delovi.csv (master + pogon redovi za atributivne)
 *
 *   node scripts/sync-sifrarnik-iz-merljivih.mjs
 *   node scripts/sync-sifrarnik-iz-merljivih.mjs --dry-run
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  generisiIzKarakteristika,
  spojiDeloviCsv,
  spojiSopCsv,
} from "../src/lib/syncSifrarnikIzMerljivih.js";

const root = path.resolve(import.meta.dirname, "..");
const docs = path.join(root, "docs");
const dryRun = process.argv.includes("--dry-run");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function esc(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

async function readCsvObjects(file) {
  const txt = await fs.readFile(file, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

function writeCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

const SOP_HEADERS = [
  "id_deo", "pogon_kod", "radni_nalog", "naziv_dela", "slika",
  "masina", "linija", "broj_merenja", "kontrolor_ime",
];

const DELOVI_HEADERS = [
  "id dela*", "pogon kod", "radni nalog", "naziv dela*", "karakteristika kontrole*",
  "linija id*", "masina id*", "kom za kontrolu n*", "slika/crtez", "aktivan", "napomena",
  "tip kontrole", "vozilo katalog id", "greska katalog id",
];

async function main() {
  const karPath = path.join(docs, "karakteristike_merljive.csv");
  const sopPath = path.join(docs, "sop_deo_varijabilni.csv");
  const deloviPath = path.join(docs, "delovi.csv");
  const rucniPath = path.join(docs, "deo_rucni.csv");

  const { rows: karRows } = await readCsvObjects(karPath);
  const { rows: sopRows } = await readCsvObjects(sopPath);
  let deloviRows = [];
  try {
    deloviRows = (await readCsvObjects(rucniPath)).rows;
  } catch { /* deo_rucni opciono */ }

  const sopObj = sopRows.map((r) => ({
    id_deo: r.id_deo,
    pogon_kod: r.pogon_kod,
    radni_nalog: r.radni_nalog,
    naziv_dela: r.naziv_dela,
    slika: r.slika,
    masina: r.masina,
    linija: r.linija,
    broj_merenja: r.broj_merenja,
    kontrolor_ime: r.kontrolor_ime,
  }));

  const deloviObj = deloviRows.map((r) => ({
    id_deo: r["id dela*"] || r.id_deo,
    pogon_kod: r["pogon kod"] || r.pogon_kod || "",
    radni_nalog: r["radni nalog"] || r.radni_nalog || "",
    naziv_dela: r["naziv dela*"] || r.naziv_dela || "",
    karakteristika: r["karakteristika kontrole*"] || r.karakteristika || "",
    linija_id: r["linija id*"] || r.linija_id || "",
    masina_id: r["masina id*"] || r.masina_id || "",
    kom_za_kontrolu: r["kom za kontrolu n*"] || r.kom_za_kontrolu || "",
    slika_naziv: r["slika/crtez"] || r.slika_naziv || "",
    napomena: r.napomena || "",
    tip_kontrole: r["tip kontrole"] || r.tip_kontrole || "deo",
    vozilo_katalog_id: r["vozilo katalog id"] || r.vozilo_katalog_id || "",
    greska_katalog_id: r["greska katalog id"] || r.greska_katalog_id || "",
  }));

  const gen = generisiIzKarakteristika(karRows, {
    postojeciSop: sopObj,
    postojeciDelovi: deloviObj,
  });

  const napomeneDeo = {
    "5501-A": "Karoserija linija",
    "5502-A": "Preseraj linija",
    "5503-A": "Montaza finalna",
    "NM-001|A": "Atributivne — Ulazna",
    "NM-001|C": "Atributivne — Karoserija",
    "NM-001|F": "Atributivne — Finalna",
  };
  for (const m of gen.masterRows) {
    const n = napomeneDeo[m.id_deo];
    if (n) m.napomena = n;
  }
  for (const p of gen.deloviPogonRows) {
    const n = napomeneDeo[`${p.id_deo}|${p.pogon_kod}`];
    if (n) p.napomena = n;
  }

  const sopMerged = spojiSopCsv(sopObj, gen.sopRows);
  const deloviMerged = spojiDeloviCsv(deloviObj, gen.deloviPogonRows, gen.masterRows);

  const sopCsvRows = sopMerged.map((r) => ({
    id_deo: r.id_deo,
    pogon_kod: r.pogon_kod,
    radni_nalog: r.radni_nalog || "",
    naziv_dela: r.naziv_dela || "",
    slika: r.slika || "",
    masina: r.masina || "",
    linija: r.linija || "",
    broj_merenja: r.broj_merenja ?? "",
    kontrolor_ime: r.kontrolor_ime || "",
  }));

  console.log(`Karakteristike: ${karRows.length} redova`);
  console.log(`→ SOP: ${gen.sopRows.length} auto + ručni = ${sopCsvRows.length}`);
  console.log(`→ Delovi (atributivne): ${gen.deloviPogonRows.length} pogon redova`);

  for (const p of gen.deloviPogonRows) {
    console.log(`   ${p.id_deo} / ${p.pogon_kod} — ${p.karakteristika}`);
  }

  if (dryRun) {
    console.log("\n(dry-run — fajlovi nisu upisani)");
    return;
  }

  await fs.writeFile(sopPath, writeCsv(SOP_HEADERS, sopCsvRows));
  await fs.writeFile(deloviPath, writeCsv(DELOVI_HEADERS, deloviMerged));

  const paket = path.join(root, "excel-rad", "sifrarnik-paket", "csv");
  try {
    await fs.mkdir(paket, { recursive: true });
    await fs.writeFile(path.join(paket, "sop_deo_varijabilni.csv"), writeCsv(SOP_HEADERS, sopCsvRows));
    await fs.writeFile(path.join(paket, "delovi.csv"), writeCsv(DELOVI_HEADERS, deloviMerged));
  } catch { /* optional */ }

  console.log("\nUpisano:", sopPath, deloviPath);
  console.log("Sledeće: npm run pakuj:sifrarnik  →  Admin uvezi oba Excela");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
