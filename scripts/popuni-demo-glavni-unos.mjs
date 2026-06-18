#!/usr/bin/env node
/**
 * Popuni vozilo6 tab u glavni unos.xlsx test delom DEMO-001.
 * node scripts/popuni-demo-glavni-unos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { fileURLToPath } from "node:url";
import { GLAVNI_UNOS_VOZILO_HEADERS, parseGlavniUnosVoziloSheets } from "../src/lib/glavniUnosSync.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const glavniPath = path.join(ROOT, "excel rad izmenjen", "glavni unos.xlsx");

const HEADERS = GLAVNI_UNOS_VOZILO_HEADERS;

function row(partial) {
  const o = Object.fromEntries(HEADERS.map((h) => [h, ""]));
  return { ...o, ...partial };
}

/** Test deo: 4 serije, broj uzoraka 1 ili 5 (ili eksplicitno). */
const DEMO_ROWS = [
  // Serija 1 @ pogon A — vizuelna (1 uzorak)
  row({
    id_deo: "DEMO-001",
    Radni_nalog: "RN-2026-DEMO001",
    "Naziv dela": "Test nosač — demo",
    Slika: "DEMO-01.png",
    Linija: "Ulazna kontrola",
    Operacija: "Vizuelna kontrola ulazna",
    Ukupno_kom: 50,
    Kom_za_kontrolu_n: 50,
    Karakteristika: "Oštećenje površine",
    Klasa: "Major",
    Tip: "Atributivna",
    Instrument: "Vizuelno",
  }),
  // Serija 1 @ pogon B — laser, 5 dimenzija → auto broj 5
  row({
    id_deo: "DEMO-001",
    Radni_nalog: "RN-2026-DEMO001",
    "Naziv dela": "Test nosač — demo",
    Slika: "DEMO-01.png",
    Linija: "Preseraj",
    Operacija: "Laser sečenje",
    Ukupno_kom: 50,
    Kom_za_kontrolu_n: 50,
    Karakteristika: "Dužina A",
    Klasa: "Critical",
    Nominal: 120,
    USL: 120.5,
    LSL: 119.5,
    Jedinica: "mm",
    Tip: "Merljiva",
    Instrument: "Pomično merilo",
  }),
  row({
    id_deo: "DEMO-001", Linija: "Preseraj", Operacija: "Laser sečenje",
    Karakteristika: "Širina B", Nominal: 80, USL: 80.3, LSL: 79.7,
    Jedinica: "mm", Tip: "Merljiva", Instrument: "Pomično merilo", Klasa: "Critical",
  }),
  row({
    id_deo: "DEMO-001", Linija: "Preseraj", Operacija: "Laser sečenje",
    Karakteristika: "Otvor Ø10", Nominal: 10, USL: 10.1, LSL: 9.9,
    Jedinica: "mm", Tip: "Merljiva", Instrument: "Šubler", Klasa: "Critical",
  }),
  row({
    id_deo: "DEMO-001", Linija: "Preseraj", Operacija: "Laser sečenje",
    Karakteristika: "Otvor Ø6", Nominal: 6, USL: 6.08, LSL: 5.92,
    Jedinica: "mm", Tip: "Merljiva", Instrument: "Šubler", Klasa: "Critical",
  }),
  row({
    id_deo: "DEMO-001", Linija: "Preseraj", Operacija: "Laser sečenje",
    Karakteristika: "Radijus R5", Nominal: 5, USL: 5.2, LSL: 4.8,
    Jedinica: "mm", Tip: "Merljiva", Instrument: "Šablon", Klasa: "Major",
  }),
  // Serija 2 @ pogon B — bušenje, 1 dimenzija — prazna X → auto 5 (Tip=Merljiva)
  row({
    id_deo: "DEMO-001",
    Linija: "Preseraj",
    Operacija: "Bušenje",
    Karakteristika: "Pozicija rupe X",
    Nominal: 45,
    USL: 45.2,
    LSL: 44.8,
    Jedinica: "mm",
    Tip: "Merljiva",
    Instrument: "Koordinatni merni sistem",
    Klasa: "Critical",
  }),
  // Serija 1 @ pogon F — završna, 1 dimenzija → auto broj 1
  row({
    id_deo: "DEMO-001",
    Linija: "Završna",
    Operacija: "Završna kontrola",
    Karakteristika: "Masa dela",
    Nominal: 2.5,
    USL: 2.7,
    LSL: 2.3,
    Jedinica: "kg",
    Tip: "Merljiva",
    Instrument: "Vaga",
    Klasa: "Minor",
  }),
];

const wb = XLSX.read(fs.readFileSync(glavniPath));
const sheet = XLSX.utils.json_to_sheet(DEMO_ROWS, { header: HEADERS });
wb.Sheets.vozilo6 = sheet;
if (!wb.SheetNames.includes("vozilo6")) wb.SheetNames.push("vozilo6");

XLSX.writeFile(wb, glavniPath);
console.log(`✓ Upisano ${DEMO_ROWS.length} redova u vozilo6 (DEMO-001)`);

const verifyWb = XLSX.read(fs.readFileSync(glavniPath));
const { karakteristike } = parseGlavniUnosVoziloSheets(verifyWb);
const demo = karakteristike.filter((r) => r.id_deo === "DEMO-001");
console.log("\nOčekivano posle sync logike (parse preview):");
const seen = new Set();
demo.forEach((r) => {
  const k = `${r.sifra_merenja}@${r.pogon_kod} bm=${r.broj_merenja} — ${r.faza_naziv}`;
  if (!seen.has(k)) {
    seen.add(k);
    console.log(" ", k);
  }
});
