/**
 * NM-01: broj_merenja po fazi + linija (Preseraj/Karoserija…)
 * node scripts/nm01-serije-karakteristike.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";

const file = path.join(import.meta.dirname, "..", "docs", "karakteristike_merljive.csv");

const SERIJE = {
  A: { faza: "Ulazna kontrola", linija: "Ulazna kontrola", broj: 3 },
  B: { faza: "Laser sečenje", linija: "Preseraj", broj: 5 },
  C: { faza: "Bušenje", linija: "Preseraj", broj: 5 },
  D: { faza: "Savijanje", linija: "Preseraj", broj: 4 },
  E: { faza: "Zavarivanje", linija: "Karoserija", broj: 5 },
  F: { faza: "Geometrijska kontrola", linija: "Karoserija", broj: 5 },
  G: { faza: "Završna kontrola", linija: "Završna", broj: 4 },
};

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
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function esc(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

const txt = await fs.readFile(file, "utf8");
const lines = txt.split(/\r?\n/).filter((l) => l.trim());
const oldH = parseCsvLine(lines[0]);

const newH = [
  "id", "id_deo", "sifra_merenja", "faza_naziv", "linija_faza", "broj_merenja",
  "pozicija", "naziv_mere", "nominala", "usl", "lsl", "merni_instrument", "jedinica", "napomena",
];

const idx = Object.fromEntries(oldH.map((h, i) => [h, i]));

const out = [newH.join(",")];
for (let i = 1; i < lines.length; i++) {
  const c = parseCsvLine(lines[i]);
  const idDeo = (c[idx.id_deo] || "").toUpperCase();
  const sifra = (c[idx.sifra_merenja] || "").trim();
  const ser = idDeo === "NM-01" ? SERIJE[sifra] : null;
  const row = {
    id: c[idx.id],
    id_deo: c[idx.id_deo],
    sifra_merenja: sifra,
    faza_naziv: ser?.faza || c[idx.faza_naziv] || "",
    linija_faza: ser?.linija || c[idx.linija_faza] || "",
    broj_merenja: ser?.broj || c[idx.broj_merenja] || "",
    pozicija: c[idx.pozicija],
    naziv_mere: c[idx.naziv_mere],
    nominala: c[idx.nominala],
    usl: c[idx.usl],
    lsl: c[idx.lsl],
    merni_instrument: c[idx.merni_instrument],
    jedinica: c[idx.jedinica],
    napomena: c[idx.napomena],
  };
  out.push(newH.map((h) => esc(row[h])).join(","));
}

await fs.writeFile(file, `${out.join("\n")}\n`, "utf8");
console.log("NM-01 serije ažurirane u", file);
