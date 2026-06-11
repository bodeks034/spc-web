/**
 * NM-01 → NM-001 sa pogon_kod (A,B,C,F) i sifra_merenja 1,2,3 unutar pogona.
 * Pokreni: node scripts/migriraj-nm001-pogon.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const karPath = path.join(root, "docs", "karakteristike_merljive.csv");

const STARA_SIFRA_U_POGON = {
  A: { pogon: "A", sifra: "1" },
  B: { pogon: "B", sifra: "1" },
  C: { pogon: "B", sifra: "2" },
  D: { pogon: "B", sifra: "3" },
  E: { pogon: "C", sifra: "1" },
  F: { pogon: "C", sifra: "2" },
  G: { pogon: "F", sifra: "1" },
};

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function esc(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

const raw = fs.readFileSync(karPath, "utf8").trimEnd();
const lines = raw.split(/\r?\n/);
const header = lines[0];
const cols = parseCsvLine(header);

const idx = Object.fromEntries(cols.map((c, i) => [c.trim(), i]));
const newHeader = "id,id_deo,pogon_kod,sifra_merenja,faza_naziv,linija_faza,broj_merenja,pozicija,naziv_mere,nominala,usl,lsl,merni_instrument,jedinica,napomena";

const out = [newHeader];
for (let li = 1; li < lines.length; li++) {
  const row = parseCsvLine(lines[li]);
  if (!row.length) continue;
  const get = (name) => row[idx[name]] ?? "";
  let idDeo = get("id_deo");
  let pogon = get("pogon_kod");
  let sifra = get("sifra_merenja");
  const faza = get("faza_naziv");
  const linija = get("linija_faza");
  const broj = get("broj_merenja");

  if (idDeo === "NM-01") {
    idDeo = "NM-001";
    const map = STARA_SIFRA_U_POGON[sifra?.trim()?.toUpperCase()];
    if (map) {
      pogon = map.pogon;
      sifra = map.sifra;
    }
  }

  out.push([
    get("id"), idDeo, pogon, sifra, faza, linija, broj,
    get("pozicija"), get("naziv_mere"), get("nominala"), get("usl"), get("lsl"),
    get("merni_instrument"), get("jedinica"), get("napomena"),
  ].map(esc).join(","));
}

fs.writeFileSync(karPath, out.join("\n") + "\n", "utf8");
console.log("karakteristike_merljive.csv — NM-001 + pogon_kod");
