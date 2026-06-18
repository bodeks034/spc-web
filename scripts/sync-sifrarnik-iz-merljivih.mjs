/**
 * Iz karakteristike_merljive generiše sop, delovi, radni_nalozi u:
 *   excel rad izmenjen/sifrarnik-paket/csv/
 *
 *   node scripts/sync-sifrarnik-iz-merljivih.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  generisiIzKarakteristika,
  generisiRadniNaloge,
  spojiDeloviCsv,
  spojiSopCsv,
  spojiRadniNalogeCsv,
  radniNalogIzDeoPogona,
} from "../src/lib/syncSifrarnikIzMerljivih.js";
import { sifrarnikCsvDir } from "../src/lib/sifrarnikPaths.js";

const root = path.resolve(import.meta.dirname, "..");
const csvBase = sifrarnikCsvDir(root);
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
  const karPath = path.join(csvBase, "karakteristike_merljive.csv");
  const sopPath = path.join(csvBase, "sop_deo_varijabilni.csv");
  const deloviPath = path.join(csvBase, "delovi.csv");
  const rucniPath = path.join(csvBase, "deo_rucni.csv");

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
    "NT-001|A": "Atributivne — Ulazna",
    "NT-001|C": "Atributivne — Karoserija",
    "NT-001|F": "Atributivne — Finalna",
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

  const rnPath = path.join(csvBase, "radni_nalozi.csv");
  let rnRows = [];
  try {
    rnRows = (await readCsvObjects(rnPath)).rows;
  } catch { /* prazan */ }
  const rnObj = rnRows.map((r) => ({
    id: r.id,
    broj_naloga: r["radni nal"] || r.broj_naloga || r.broj_nalog,
    id_deo: r["id dela*"] || r.id_deo,
    naziv_dela: r["naziv dela"] || r.naziv_dela,
    kolicina: r.količina || r.kolicina,
    kupac: r.kupac,
    datum_unosa: r["datum unosa"] || r.datum_unosa,
    rok_isporuke: r["rok isporuke"] || r.rok_isporuke,
    status: r.status,
    operater: r.operater,
    napomena: r.napomena,
    pogon_kod: r.pogon_kod,
  }));

  const ntRnDefaults = {};
  for (const r of karRows) {
    if (String(r.id_deo).toUpperCase() === "NT-001" && r.kupac) {
      ntRnDefaults.kupac = r.kupac;
    }
  }
  const noviRn = generisiRadniNaloge(karRows, {
    postojeciRn: rnObj,
    podrazumevano: {
      kolicina: 50,
      kupac: ntRnDefaults.kupac || "Kupac NT",
      datum_unosa: "2026-06-01",
      rok_isporuke: "2026-09-01",
      operater: "PERA OPERATER",
    },
  });
  // RN i za SOP pogone bez karakteristika (npr. NT-001 D/E/G/H)
  const rnKeys = new Set([...rnObj, ...noviRn].map((r) => `${String(r.id_deo).toUpperCase()}|${String(r.pogon_kod).toUpperCase()}`));
  let maxRnId = [...rnObj, ...noviRn].reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const rnIzSop = [];
  for (const s of sopObj) {
    const id = String(s.id_deo || "").toUpperCase();
    const pk = String(s.pogon_kod || "").toUpperCase();
    if (!id || !pk) continue;
    const key = `${id}|${pk}`;
    if (rnKeys.has(key)) continue;
    rnKeys.add(key);
    maxRnId += 1;
    rnIzSop.push({
      id: maxRnId,
      broj_naloga: s.radni_nalog || radniNalogIzDeoPogona(id, pk),
      id_deo: id,
      naziv_dela: s.naziv_dela || "",
      kolicina: 50,
      kupac: id === "NT-001" ? "Kupac NT" : "Kupac NM",
      datum_unosa: "2026-06-01",
      rok_isporuke: "2026-09-01",
      status: "aktivan",
      operater: "PERA OPERATER",
      napomena: "",
      pogon_kod: pk,
    });
  }
  const rnMerged = spojiRadniNalogeCsv(rnObj, [...noviRn, ...rnIzSop]);

  const RN_HEADERS = [
    "id", "radni nal", "id dela*", "naziv dela", "količina", "kupac",
    "datum unosa", "rok isporuke", "status", "operater", "napomena", "pogon_kod",
  ];
  const rnCsvRows = rnMerged.map((r) => ({
    id: r.id,
    "radni nal": r.broj_naloga,
    "id dela*": r.id_deo,
    "naziv dela": r.naziv_dela,
    količina: r.kolicina,
    kupac: r.kupac,
    "datum unosa": r.datum_unosa,
    "rok isporuke": r.rok_isporuke,
    status: r.status,
    operater: r.operater,
    napomena: r.napomena,
    pogon_kod: r.pogon_kod,
  }));

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
  console.log(`→ Radni nalozi: ${noviRn.length + rnIzSop.length} novih → ukupno ${rnCsvRows.length}`);

  for (const p of gen.deloviPogonRows) {
    console.log(`   ${p.id_deo} / ${p.pogon_kod} — ${p.karakteristika}`);
  }

  if (dryRun) {
    console.log("\n(dry-run — fajlovi nisu upisani)");
    return;
  }

  await fs.writeFile(sopPath, writeCsv(SOP_HEADERS, sopCsvRows));
  await fs.writeFile(deloviPath, writeCsv(DELOVI_HEADERS, deloviMerged));
  await fs.writeFile(rnPath, writeCsv(RN_HEADERS, rnCsvRows));

  console.log("\nUpisano:", sopPath, deloviPath, rnPath);
  console.log("Sledeće: npm run pakuj:sifrarnik  →  npm run import:sifrarnik-paket");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
