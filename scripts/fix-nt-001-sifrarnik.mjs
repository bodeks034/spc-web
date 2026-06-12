/**
 * Popravka NT-001 iz backup Supabase Excel-a → docs CSV + pakovanje.
 * node scripts/fix-nt-001-sifrarnik.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import {
  pogonIzLinijeFaze,
  radniNalogIzDeoPogona,
} from "../src/lib/syncSifrarnikIzMerljivih.js";

const root = path.resolve(import.meta.dirname, "..");
const docs = path.join(root, "docs");
const backupXlsx = path.join(root, "backup supabase", "SPC_merljive_2026-06-12.xlsx");

const BROJ_PO_POGONU = { A: 1, B: 3, C: 3, D: 3, E: 3, F: 3, G: 3, H: 3 };

const META_PO_POGONU = {
  A: {
    atributivne: "DA", merljive: "DA", kom_za_kontrolu_n: 3,
    radni_nalog: "RN-2026-NT001-A", slika: "nosac motora NTV.png",
    linija_id: 43, masina_id: 1, naziv_dela: "Nosač motora",
  },
  B: { merljive: "DA", radni_nalog: "RN-2026-NT001-B", slika: "nosac motora NTV.png", naziv_dela: "Nosač motora" },
  C: {
    atributivne: "DA", merljive: "DA", kom_za_kontrolu_n: 3,
    radni_nalog: "RN-2026-NT001-C", slika: "nosac motora NTV.png",
    linija_id: 12, masina_id: 1, naziv_dela: "Nosač motora",
  },
  D: { merljive: "DA", radni_nalog: "RN-2026-NT001-D", slika: "nosac motora NTV.png", naziv_dela: "Nosač motora" },
  E: { merljive: "DA", radni_nalog: "RN-2026-NT001-E", slika: "nosac motora NTV.png", naziv_dela: "Nosač motora" },
  F: {
    atributivne: "DA", merljive: "DA", kom_za_kontrolu_n: 3,
    radni_nalog: "RN-2026-NT001-F", slika: "nosac motora NTV.png",
    linija_id: 48, masina_id: 1, naziv_dela: "Nosač motora",
  },
  G: { merljive: "DA", radni_nalog: "RN-2026-NT001-G", slika: "nosac motora NTV.png", naziv_dela: "Nosač motora" },
  H: { merljive: "DA", radni_nalog: "RN-2026-NT001-H", slika: "nosac motora NTV.png", naziv_dela: "Nosač motora" },
};

const NAPOMENE_DELOVI = {
  "NT-001|A": "Atributivne — Ulazna",
  "NT-001|C": "Atributivne — Karoserija",
  "NT-001|F": "Atributivne — Finalna",
};

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
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(","));
  return `${lines.join("\n")}\n`;
}

function popraviNtRed(r) {
  const pogon = pogonIzLinijeFaze(r.linija_faza);
  if (!pogon) throw new Error(`Nepoznata linija_faza: ${r.linija_faza} (id ${r.id})`);

  const broj = BROJ_PO_POGONU[pogon] ?? 3;
  const meta = META_PO_POGONU[pogon] || {};
  const rn = meta.radni_nalog || radniNalogIzDeoPogona("NT-001", pogon);

  const out = {
    ...r,
    id_deo: "NT-001",
    pogon_kod: pogon,
    broj_merenja: broj,
    radni_nalog: rn,
    slika: meta.slika || r.slika || "nosac motora NTV.png",
    naziv_dela: meta.naziv_dela || "Nosač motora",
  };

  if (String(r.pozicija).includes("Visina nosaca")) out.lsl = 154.8;
  if (String(r.pozicija).includes("Ø17")) out.merni_instrument = "Mikrometar";
  if (String(r.pozicija).includes("Ø14")) out.merni_instrument = "Mikrometar";
  if (String(r.jedinica).trim() === "") out.jedinica = out.jedinica || "mm";

  return { out, pogon, meta };
}

async function main() {
  const wb = XLSX.readFile(backupXlsx);
  const ntRaw = XLSX.utils.sheet_to_json(wb.Sheets.karakteristike_merljive, { defval: "" })
    .filter((r) => String(r.id_deo).toUpperCase() === "NT-001")
    .sort((a, b) => Number(a.id) - Number(b.id));

  const metaPrimeni = new Set();
  const ntFixed = ntRaw.map((r) => {
    const { out, pogon, meta } = popraviNtRed(r);
    if (!metaPrimeni.has(pogon)) {
      metaPrimeni.add(pogon);
      for (const [k, v] of Object.entries(meta)) {
        if (v !== undefined && v !== "") out[k] = v;
      }
    }
    return out;
  });

  const karPath = path.join(docs, "karakteristike_merljive.csv");
  const { headers: karHdr, rows: karRows } = await readCsvObjects(karPath);
  const bezNt = karRows.filter((r) => String(r.id_deo).toUpperCase() !== "NT-001");
  const ntCsv = ntFixed.map((r) => {
    const row = {};
    karHdr.forEach((h) => { row[h] = r[h] ?? ""; });
    return row;
  });

  await fs.writeFile(karPath, writeCsv(karHdr, [...bezNt, ...ntCsv]));
  console.log(`NT-001 karakteristike: ${ntFixed.length} redova upisano u ${karPath}`);

  // SOP iz backup-a (svih 8 pogona) — dopuna pre sync-a
  const sopPath = path.join(docs, "sop_deo_varijabilni.csv");
  const { headers: sopHdr, rows: sopRows } = await readCsvObjects(sopPath);
  const sopBezNt = sopRows.filter((r) => String(r.id_deo).toUpperCase() !== "NT-001");
  const backupSop = XLSX.utils.sheet_to_json(wb.Sheets.sop_deo_varijabilni, { defval: "" })
    .filter((r) => String(r.id_deo).toUpperCase() === "NT-001");
  const sopNt = backupSop.map((r) => ({
    id_deo: "NT-001",
    pogon_kod: r.pogon_kod,
    radni_nalog: r.radni_nalog,
    naziv_dela: r.naziv_dela || "Nosač motora",
    slika: r.slika || "nosac motora NTV.png",
    masina: r.masina || "",
    linija: r.linija || "",
    broj_merenja: r.broj_merenja || 3,
    kontrolor_ime: r.kontrolor_ime || "",
  }));
  await fs.writeFile(sopPath, writeCsv(sopHdr, [...sopBezNt, ...sopNt]));
  console.log(`NT-001 SOP: ${sopNt.length} redova iz backup-a`);

  // ukloni pogrešne NT-001 redove iz delovi (ostaje sync)
  const deloviPath = path.join(docs, "delovi.csv");
  const { headers: delHdr, rows: delRows } = await readCsvObjects(deloviPath);
  const delBezNt = delRows.filter((r) => String(r["id dela*"] || r.id_deo).toUpperCase() !== "NT-001");
  await fs.writeFile(deloviPath, writeCsv(delHdr, delBezNt));
  console.log("Uklonjeni stari NT-001 redovi iz delovi.csv (sync će regenerisati)");

  console.log("\nSledeće: npm run pakuj:sifrarnik");
  console.log("Zatim Admin uvezi: excel-rad/sifrarnik-paket/SPC_master_atributivne.xlsx");
  console.log("              i: excel-rad/sifrarnik-paket/SPC_merljive.xlsx");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
