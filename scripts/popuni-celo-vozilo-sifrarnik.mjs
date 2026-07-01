/**
 * Popunjava CSV + SPC_atributivne.xlsx za celo vozilo:
 * tipovi_vozila, kategorije_vozila, delovi_vozila, katalog_gresaka_vozilo (defekti).
 *
 * node scripts/popuni-celo-vozilo-sifrarnik.mjs
 */
import fs from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvDir = path.join(root, "excel rad izmenjen", "sifrarnik-paket", "csv");
const docsDir = path.join(root, "docs");
const xlsxPath = path.join(root, "excel rad izmenjen", "sifrarnik-paket", "SPC_atributivne.xlsx");

const ZONE_NAZIVI = {
  "KAROS-001": "Karoserija",
  "MOTOR-001": "Motor",
  "TRANS-001": "Transmisija",
  "INT-001": "Enterijer",
  "EL-001": "Elektrika",
  "FINAL-001": "Finalna kontrola",
  "KOCN-001": "Kočioni sistem",
  "OBJES-001": "Ovešenje i upravljanje",
};

const TIPOVI_VOZILA = [
  { kod: "NTV", naziv: "NTV novo terensko vozilo", prefiks_id_deo: "NTV", slika_sop: "NTV_SOP.jpg", dijagram_src: "/vozilo/dijagrami/NTV.png", napomena: "Finalna kontrola celog vozila" },
  { kod: "MRAP", naziv: "MRAP oklopno vozilo", prefiks_id_deo: "MRAP", slika_sop: "MRAP_SOP.jpg", dijagram_src: "/vozilo/dijagrami/MRAP.png", napomena: "Finalna kontrola celog vozila" },
  { kod: "MRAP1", naziv: "MRAP1 oklopno vozilo 6×6", prefiks_id_deo: "MRAP1", slika_sop: "MRAP1_SOP.jpg", dijagram_src: "/vozilo/dijagrami/MRAP1.png", napomena: "Finalna kontrola celog vozila" },
];

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

function readCsv(filePath) {
  const txt = readFileSync(filePath, "utf8");
  const lines = txt.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

function escCsv(v) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvContent(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escCsv(row[h])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function cistiDefekt(s) {
  return String(s || "")
    .replace(/,+\s*$/g, "")
    .replace(/,\s*,/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsirajVoziloZona(voziloId) {
  const id = String(voziloId || "").trim().toUpperCase();
  const m = id.match(/^(.+)-(KAROS|MOTOR|TRANS|INT|EL|FINAL|KOCN|OBJES)-001$/);
  if (!m) return { vozilo_kod: id, zona_id: "", zona_naziv: "" };
  const zona_id = `${m[2]}-001`;
  return { vozilo_kod: m[1], zona_id, zona_naziv: ZONE_NAZIVI[zona_id] || zona_id };
}

async function writeBothCsv(name, headers, rows) {
  const full = toCsvContent(headers, rows);
  await fs.mkdir(csvDir, { recursive: true });
  await fs.mkdir(docsDir, { recursive: true });
  await fs.writeFile(path.join(csvDir, name), full, "utf8");
  await fs.writeFile(path.join(docsDir, name), full, "utf8");
  return rows.length;
}

function csvToSheet(csvPath) {
  const rows = readCsv(csvPath);
  if (!rows.length) return XLSX.utils.aoa_to_sheet([]);
  return XLSX.utils.json_to_sheet(rows);
}

async function azurirajExcel() {
  const sheets = [
    ["tipovi_vozila", "tipovi_vozila.csv"],
    ["kategorije_vozila", "kategorije_vozila.csv"],
    ["delovi_vozila", "delovi_vozila.csv"],
    ["katalog_gresaka_vozilo", "katalog_gresaka_vozilo.csv"],
  ];
  let wb;
  if (existsSync(xlsxPath)) wb = XLSX.read(readFileSync(xlsxPath));
  else wb = XLSX.utils.book_new();

  for (const [sheetName, file] of sheets) {
    const p = path.join(csvDir, file);
    if (!existsSync(p)) continue;
    const ws = csvToSheet(p);
    if (wb.SheetNames.includes(sheetName)) wb.Sheets[sheetName] = ws;
    else XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  try {
    await fs.writeFile(xlsxPath, buf);
    console.log(`  Excel: ${xlsxPath}`);
  } catch {
    const alt = xlsxPath.replace(/\.xlsx$/i, "_novo.xlsx");
    await fs.writeFile(alt, buf);
    console.warn(`  Excel zaključan — upisano: ${alt}`);
  }
}

async function dopuniRadneNaloge() {
  const rnPath = path.join(csvDir, "radni_nalozi.csv");
  const rows = readCsv(rnPath);
  const headers = ["id", "radni nal", "id dela*", "naziv dela", "količina", "kupac", "datum unosa", "rok isporuke", "status", "operater", "napomena", "pogon_kod"];
  const postojeci = new Set(rows.map((r) => String(r["id dela*"] || "").toUpperCase()));
  const novi = [
    { "id dela*": "NTV-001", "radni nal": "RN-2026-NTV-001", "naziv dela": "NTV komplet", "količina": "10", "kupac": "Kupac NT", "status": "aktivan", "napomena": "Celo vozilo — finalna kontrola" },
    { "id dela*": "MRAP-001", "radni nal": "RN-2026-MRAP-001", "naziv dela": "MRAP komplet", "količina": "5", "kupac": "Kupac NT", "status": "aktivan", "napomena": "Celo vozilo — finalna kontrola" },
    { "id dela*": "MRAP1-001", "radni nal": "RN-2026-MRAP1-001", "naziv dela": "MRAP1 komplet", "količina": "5", "kupac": "Kupac NT", "status": "aktivan", "napomena": "Celo vozilo — finalna kontrola" },
  ];
  let maxId = Math.max(0, ...rows.map((r) => Number(r.id) || 0));
  let dodato = 0;
  for (const n of novi) {
    const idDeo = n["id dela*"].toUpperCase();
    if (postojeci.has(idDeo)) continue;
    maxId += 1;
    rows.push({
      id: String(maxId),
      "radni nal": n["radni nal"],
      "id dela*": idDeo,
      "naziv dela": n["naziv dela"],
      "količina": n["količina"],
      "kupac": n["kupac"],
      "datum unosa": "2026-06-01",
      "rok isporuke": "2026-12-01",
      "status": n.status,
      "operater": "PERA OPERATER",
      "napomena": n.napomena,
      "pogon_kod": "",
    });
    dodato += 1;
  }
  if (dodato) {
    const full = toCsvContent(headers, rows.map((r) => {
      const o = {};
      headers.forEach((h) => { o[h] = r[h] ?? ""; });
      return o;
    }));
    await fs.writeFile(rnPath, full, "utf8");
    await fs.writeFile(path.join(docsDir, "radni_nalozi.csv"), full, "utf8");
  }
  return dodato;
}

async function main() {
  const katalogRaw = readCsv(path.join(csvDir, "katalog_gresaka_vozilo.csv"));

  const katalog = katalogRaw.map((r) => ({
    id: String(r.id || "").trim().toUpperCase(),
    kategorija: String(r.kategorija || "").trim(),
    podkategorija: String(r.podkategorija || "").trim(),
    defekt: cistiDefekt(r.defekt),
  })).filter((r) => r.id && r.kategorija && r.defekt);

  const tipoviRows = TIPOVI_VOZILA.map((t) => ({
    kod: t.kod,
    naziv: t.naziv,
    prefiks_id_deo: t.prefiks_id_deo,
    slika_sop: t.slika_sop,
    dijagram_src: t.dijagram_src,
    aktivan: "DA",
    napomena: t.napomena,
  }));

  const katSet = new Map();
  for (const r of katalog) {
    const { vozilo_kod, zona_id, zona_naziv } = parsirajVoziloZona(r.id);
    const key = `${vozilo_kod}|${zona_id}|${r.kategorija}|${r.podkategorija}`;
    if (!katSet.has(key)) {
      katSet.set(key, { vozilo_kod, zona_id, zona_naziv, kategorija: r.kategorija, podkategorija: r.podkategorija });
    }
  }
  const kategorijeRows = [...katSet.values()].sort((a, b) =>
    `${a.vozilo_kod}-${a.zona_id}-${a.kategorija}`.localeCompare(`${b.vozilo_kod}-${b.zona_id}-${b.kategorija}`),
  );

  const deloviAll = readCsv(path.join(csvDir, "delovi.csv"));
  const deloviVoziloRows = deloviAll
    .filter((r) => String(r["tip kontrole"] || "").toLowerCase() === "vozilo")
    .map((r) => ({
      "id delo*": String(r["id dela*"] || "").trim().toUpperCase(),
      "naziv dela*": r["naziv dela*"] || "",
      "vozilo katalog id": r["vozilo katalog id"] || "",
      "karakteristika kontrole*": r["karakteristika kontrole*"] || "Finalna vizuelna kontrola celog vozila",
      "linija id*": r["linija id*"] || "48",
      "masina id*": r["masina id*"] || "1",
      "kom za kontrolu n*": r["kom za kontrolu n*"] || "5",
      "slika/crtez": r["slika/crtez"] || "",
      aktivan: r.aktivan || "DA",
      napomena: r.napomena || "",
    }));

  const nTip = await writeBothCsv("tipovi_vozila.csv", ["kod", "naziv", "prefiks_id_deo", "slika_sop", "dijagram_src", "aktivan", "napomena"], tipoviRows);
  const nKat = await writeBothCsv("kategorije_vozila.csv", ["vozilo_kod", "zona_id", "zona_naziv", "kategorija", "podkategorija"], kategorijeRows);
  const nDel = await writeBothCsv("delovi_vozila.csv", ["id delo*", "naziv dela*", "vozilo katalog id", "karakteristika kontrole*", "linija id*", "masina id*", "kom za kontrolu n*", "slika/crtez", "aktivan", "napomena"], deloviVoziloRows);
  const nKar = await writeBothCsv("katalog_gresaka_vozilo.csv", ["id", "kategorija", "podkategorija", "defekt"], katalog);

  const rnDodato = await dopuniRadneNaloge();

  console.log("✓ Celo vozilo — šifrarnik");
  console.log(`  tipovi_vozila: ${nTip}`);
  console.log(`  kategorije_vozila: ${nKat}`);
  console.log(`  delovi_vozila: ${nDel}`);
  console.log(`  katalog_gresaka_vozilo (defekti): ${nKar}`);
  if (rnDodato) console.log(`  radni_nalozi: +${rnDodato} za NTV/MRAP/MRAP1`);

  await azurirajExcel();
  console.log("\nSledeće: npm run import:sifrarnik-paket   ili Admin → Uvezi master Excel");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
