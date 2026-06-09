import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

export function parseCsvLine(line) {
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

export function normHeader(h) {
  return String(h || "")
    .trim()
    .replace(/\*+$/, "")
    .replace(/š/gi, "s")
    .replace(/č/gi, "c")
    .replace(/ć/gi, "c")
    .replace(/ž/gi, "z")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== "") return String(v).trim();
  }
  return "";
}

export function aktivnaDa(v) {
  const s = String(v || "").trim().toUpperCase();
  return s === "" || s === "DA" || s === "YES" || s === "1" || s === "TRUE";
}

/** Jedan red CSV/Excel → etiketa za generisanje */
export function mapRedEtikete(row) {
  const idDeo = pick(row, "id_deo", "id deo").toUpperCase();
  const sadrzaj = pick(row, "sadrzaj_barkoda", "sadrzaj barkoda");
  if (!idDeo || !sadrzaj) return null;
  if (!aktivnaDa(pick(row, "aktivna"))) return null;

  const format = pick(row, "format", "tip_formata") || "id";
  const tipKoda = (pick(row, "tip_koda", "tip koda") || "oba").toLowerCase();

  return {
    idDeo,
    naziv: pick(row, "naziv") || idDeo,
    tipKontrole: (pick(row, "tip_kontrole", "tip kontrole") || "deo").toLowerCase(),
    format,
    sufiks: format.replace(/[^a-z0-9_-]/gi, "-"),
    sadrzaj,
    radniNalog: pick(row, "radni_nalog", "radni nalog"),
    tipKoda,
    napomena: pick(row, "napomena") || format,
    qr: tipKoda === "oba" || tipKoda === "qr",
    code128: tipKoda === "oba" || tipKoda === "code128",
  };
}

export async function readBarkodiCsv(csvPath) {
  const txt = await fs.readFile(csvPath, "utf8");
  const lines = txt.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]).map(normHeader);
  return lines.slice(1).map(line => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? "").trim(); });
    return row;
  });
}

export async function readBarkodiXlsx(xlsxPath, sheetName = "barkodi") {
  const buf = await fs.readFile(xlsxPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows.map(r => {
    const row = {};
    for (const [k, v] of Object.entries(r)) {
      row[normHeader(k)] = String(v ?? "").trim();
    }
    return row;
  });
}

export function grupisiPoDelu(redovi) {
  const grupe = new Map();
  for (const row of redovi) {
    const et = mapRedEtikete(row);
    if (!et) continue;
    if (!grupe.has(et.idDeo)) {
      grupe.set(et.idDeo, {
        id: et.idDeo,
        naziv: et.naziv,
        tip: et.tipKontrole,
        kodovi: [],
      });
    }
    const g = grupe.get(et.idDeo);
    if (et.naziv) g.naziv = et.naziv;
    if (et.tipKontrole) g.tip = et.tipKontrole;
    g.kodovi.push({
      sufiks: et.sufiks,
      sadrzaj: et.sadrzaj,
      opis: et.napomena,
      qr: et.qr,
      code128: et.code128,
    });
  }
  return [...grupe.values()];
}

export function rowsToCsv(redovi) {
  const headers = [
    "id_deo*",
    "naziv",
    "tip_kontrole",
    "format",
    "sadrzaj_barkoda*",
    "radni_nalog",
    "tip_koda",
    "aktivna",
    "napomena",
  ];
  const keys = headers.map(normHeader);
  const lines = [headers.join(",")];
  for (const row of redovi) {
    const vals = keys.map(k => {
      const v = row[k] ?? "";
      if (String(v).includes(",") || String(v).includes('"')) {
        return `"${String(v).replace(/"/g, '""')}"`;
      }
      return v;
    });
    lines.push(vals.join(","));
  }
  return `${lines.join("\n")}\n`;
}

export async function writeBarkodiCsv(csvPath, redovi) {
  await fs.writeFile(csvPath, rowsToCsv(redovi), "utf8");
}

export async function writeBarkodiXlsx(xlsxPath, redovi) {
  await fs.mkdir(path.dirname(xlsxPath), { recursive: true });
  const sheetRows = redovi.map(row => ({
    "id_deo*": pick(row, "id_deo", "id deo"),
    naziv: pick(row, "naziv"),
    tip_kontrole: pick(row, "tip_kontrole", "tip kontrole"),
    format: pick(row, "format"),
    "sadrzaj_barkoda*": pick(row, "sadrzaj_barkoda", "sadrzaj barkoda"),
    radni_nalog: pick(row, "radni_nalog", "radni nalog"),
    tip_koda: pick(row, "tip_koda", "tip koda") || "oba",
    aktivna: pick(row, "aktivna") || "DA",
    napomena: pick(row, "napomena"),
  }));

  const uputstvo = [
    { polje: "id_deo*", opis: "Šifra dela — mora postojati u delovi / Supabase" },
    { polje: "naziv", opis: "Naziv na etiketi (npr. Osovina)" },
    { polje: "tip_kontrole", opis: "deo ili vozilo" },
    { polje: "format", opis: "id | id_rn | puna — oznaka varijante etikete" },
    { polje: "sadrzaj_barkoda*", opis: "Tačan tekst u QR/Code128 (npr. 5502-A|RN-2024-002)" },
    { polje: "radni_nalog", opis: "Opciono — samo za pregled na etiketi" },
    { polje: "tip_koda", opis: "oba | qr | code128" },
    { polje: "aktivna", opis: "DA ili NE — NE se preskače pri generisanju" },
    { polje: "napomena", opis: "Opis varijante (štampa se ispod koda)" },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetRows), "barkodi");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(uputstvo), "uputstvo");
  XLSX.writeFile(wb, xlsxPath);
}
