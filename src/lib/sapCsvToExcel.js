import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  DELOVI_EXCEL_COLS,
  RADNI_NALOZI_EXCEL_COLS,
  KUPCI_EXCEL_COLS,
} from "./excelColumnDefs.js";
import { normHeader, parseCsvText } from "./radniNaloziUvoz.js";

export { RADNI_NALOZI_EXCEL_COLS, KUPCI_EXCEL_COLS };

/**
 * Koji CSV fajl ide u koji Excel tab master šifrarnika.
 * SAP može slati bilo koji od alternativnih naziva fajla.
 */
export const SAP_CSV_SHEET_MAP = [
  {
    sheet: "delovi",
    csvNames: ["delovi.csv", "sap_delovi.csv", "sap_materijal.csv", "materijal.csv", "material.csv"],
    excelCols: DELOVI_EXCEL_COLS,
    key: "id_deo",
    preserve: [
      "karakteristika", "linija_id", "masina_id", "kom_za_kontrolu",
      "slika_naziv", "aktivan", "napomena", "tip_kontrole",
      "vozilo_katalog_id", "greska_katalog_id", "pogon_kod", "radni_nalog",
    ],
    defaults: {
      karakteristika: "Vizuelna kontrola",
      linija_id: 12,
      masina_id: 1,
      kom_za_kontrolu: 30,
      aktivan: true,
      tip_kontrole: "deo",
    },
    mapCsv: mapSapDeloviRed,
  },
  {
    sheet: "radni_nalozi",
    csvNames: [
      "radni_nalozi.csv",
      "sap_radni_nalozi.csv",
      "erp_radni_nalozi.csv",
      "auftraege.csv",
      "production_orders.csv",
    ],
    excelCols: RADNI_NALOZI_EXCEL_COLS,
    key: "broj_naloga",
    preserve: ["id", "operater", "napomena", "pogon_kod"],
    defaults: { status: "aktivan" },
    mapCsv: mapSapRadniNalogRed,
  },
  {
    sheet: "kupci",
    csvNames: ["kupci.csv", "sap_kupci.csv", "customers.csv"],
    excelCols: KUPCI_EXCEL_COLS,
    key: "naziv",
    preserve: ["id", "aktivan"],
    defaults: { aktivan: true },
    mapCsv: mapSapKupacRed,
  },
];

function nk(s) {
  return normHeader(s);
}

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[nk(k)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mapSapDeloviRed(row) {
  const idDeo = pick(
    row,
    "id_deo", "id dela", "id dela*", "matnr", "material", "sifra_dela", "part_id", "artikal",
  ).toUpperCase();
  if (!idDeo) return null;

  const naziv = pick(row, "naziv_dela", "naziv dela", "maktx", "opis", "naziv", "text");
  const tipRaw = pick(row, "tip_kontrole", "tip kontrole").toLowerCase();
  const tip = tipRaw || (idDeo.startsWith("AUTO") || idDeo.startsWith("MRAP") || idDeo.startsWith("NTV") ? "vozilo" : "deo");

  return {
    id_deo: idDeo,
    pogon_kod: pick(row, "pogon_kod", "pogon kod", "pogon", "werks").toUpperCase() || "",
    radni_nalog: pick(row, "radni_nalog", "radni nal", "rn").toUpperCase() || "",
    naziv_dela: naziv,
    karakteristika: pick(row, "karakteristika kontrole", "karakteristika") || null,
    linija_id: num(pick(row, "linija_id", "linija id")),
    masina_id: num(pick(row, "masina_id", "masina id")),
    kom_za_kontrolu: num(pick(row, "kom za kontrolu n", "kom_za_kontrolu", "kom za kontrolu")),
    slika_naziv: pick(row, "slika/crtez", "slika_naziv") || null,
    aktivan: pick(row, "aktivan") ? ["da", "1", "true", "yes"].includes(pick(row, "aktivan").toLowerCase()) : undefined,
    napomena: pick(row, "napomena") || null,
    tip_kontrole: tip,
    vozilo_katalog_id: pick(row, "vozilo katalog id", "vozilo_katalog_id") || null,
    greska_katalog_id: pick(row, "greska katalog id", "greska_katalog_id") || null,
  };
}

function mapSapRadniNalogRed(row) {
  const broj = pick(
    row,
    "broj_naloga", "radni nal", "radni_nalog", "rn", "nalog", "auftrag", "order_no",
  ).toUpperCase();
  const idDeo = pick(row, "id_deo", "id dela", "matnr", "material").toUpperCase();
  if (!broj || !idDeo) return null;

  let pogon = pick(row, "pogon_kod", "pogon kod", "werks").toUpperCase();
  if (!pogon) {
    const m = broj.match(/-([A-H])$/);
    if (m) pogon = m[1];
  }

  const statusRaw = pick(row, "status");
  return {
    broj_naloga: broj,
    id_deo: idDeo,
    naziv_dela: pick(row, "naziv_dela", "naziv dela", "maktx") || null,
    kolicina: num(pick(row, "kolicina", "količina", "qty", "menge")),
    kupac: pick(row, "kupac", "customer", "kunde") || null,
    datum_unosa: pick(row, "datum_unosa", "datum unosa", "datum") || null,
    rok_isporuke: pick(row, "rok_isporuke", "rok isporuke", "due_date") || null,
    status: statusRaw ? statusRaw.toLowerCase() : null,
    operater: pick(row, "operater", "operator") || null,
    napomena: pick(row, "napomena") || null,
    pogon_kod: pogon || null,
  };
}

function mapSapKupacRed(row) {
  const naziv = pick(row, "naziv", "kupac", "customer", "name1", "kunde");
  if (!naziv) return null;
  const id = num(pick(row, "id"));
  const aktRaw = pick(row, "aktivan");
  return {
    id: id || undefined,
    naziv,
    aktivan: aktRaw ? ["da", "1", "true", "yes"].includes(aktRaw.toLowerCase()) : undefined,
  };
}

function rowsToExcelObjects(rows, excelCols) {
  return (rows || []).map((r) => {
    const o = {};
    excelCols.forEach(([key, label]) => {
      let val = r[key];
      if (key === "aktivan" && typeof val === "boolean") val = val ? "DA" : "NE";
      o[label] = val ?? "";
    });
    return o;
  });
}

function excelObjectsToRows(objects, excelCols) {
  const keyByLabel = Object.fromEntries(excelCols.map(([k, l]) => [nk(l), k]));
  return (objects || []).map((obj) => {
    const row = {};
    Object.entries(obj).forEach(([label, val]) => {
      const key = keyByLabel[nk(label)];
      if (key) row[key] = val;
    });
    return row;
  });
}

function sheetToRows(sheet, excelCols) {
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return excelObjectsToRows(raw, excelCols);
}

function applyDefaults(row, defaults) {
  const out = { ...row };
  Object.entries(defaults || {}).forEach(([k, v]) => {
    if (out[k] == null || out[k] === "") out[k] = v;
  });
  return out;
}

function mergeRows(existing, incoming, { key, preserve, defaults }) {
  const byKey = new Map();
  (existing || []).forEach((r) => {
    const k = String(r[key] || "").trim().toUpperCase();
    if (k) byKey.set(k, { ...r });
  });

  let novih = 0;
  let azurirano = 0;

  (incoming || []).forEach((inc) => {
    const k = String(inc[key] || "").trim().toUpperCase();
    if (!k) return;
    const old = byKey.get(k);
    if (!old) {
      byKey.set(k, applyDefaults(inc, defaults));
      novih += 1;
      return;
    }
    const merged = { ...old };
    Object.entries(inc).forEach(([fld, val]) => {
      if (val == null || val === "") return;
      if (preserve?.includes(fld) && old[fld] != null && old[fld] !== "") return;
      merged[fld] = val;
    });
    if (JSON.stringify(merged) !== JSON.stringify(old)) azurirano += 1;
    byKey.set(k, merged);
  });

  return {
    rows: [...byKey.values()],
    novih,
    azurirano,
  };
}

function matchCsvConfig(fileName) {
  const base = path.basename(fileName).toLowerCase();
  return SAP_CSV_SHEET_MAP.find((cfg) =>
    cfg.csvNames.some((n) => base === n.toLowerCase()));
}

export async function parseCsvFile(filePath) {
  const txt = await fs.readFile(filePath, "utf8");
  return parseCsvText(txt).map((row) => {
    const out = {};
    Object.entries(row).forEach(([k, v]) => {
      out[nk(k)] = v;
    });
    return out;
  });
}

async function loadWorkbook(masterPath, sheetNames) {
  try {
    await fs.access(masterPath);
    return XLSX.readFile(masterPath);
  } catch {
    const wb = XLSX.utils.book_new();
    sheetNames.forEach((name) => {
      const cfg = SAP_CSV_SHEET_MAP.find((c) => c.sheet === name);
      if (!cfg) return;
      const headers = cfg.excelCols.map(([, label]) => label);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers]), name.slice(0, 31));
    });
    return wb;
  }
}

function rowsToCsvText(rows, excelCols) {
  const headers = excelCols.map(([, label]) => label);
  const lines = [headers.join(",")];
  rowsToExcelObjects(rows, excelCols).forEach((obj) => {
    lines.push(headers.map((h) => {
      const v = String(obj[h] ?? "");
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(","));
  });
  return `${lines.join("\n")}\n`;
}

/**
 * Učitaj SAP CSV iz foldera → spoji u Excel master tabove (+ opciono docs/*.csv).
 */
export async function syncSapCsvToExcel({
  incomingDir,
  masterPath,
  docsDir,
  syncDocs = true,
  dryRun = false,
} = {}) {
  let entries;
  try {
    entries = await fs.readdir(incomingDir);
  } catch {
    throw new Error(`Folder ne postoji: ${incomingDir}`);
  }

  const csvFiles = entries.filter((f) => /\.csv$/i.test(f));
  if (!csvFiles.length) {
    return { ok: true, poruka: "Nema CSV fajlova u incoming folderu.", sheets: [] };
  }

  await fs.mkdir(path.dirname(masterPath), { recursive: true });
  const wb = await loadWorkbook(masterPath, SAP_CSV_SHEET_MAP.map((c) => c.sheet));
  const results = [];

  for (const file of csvFiles) {
    const cfg = matchCsvConfig(file);
    if (!cfg) {
      results.push({ fajl: file, status: "preskoceno", razlog: "nepoznat naziv fajla" });
      continue;
    }

    const full = path.join(incomingDir, file);
    const parsed = await parseCsvFile(full);
    const mapped = parsed.map(cfg.mapCsv).filter(Boolean);

    if (!mapped.length) {
      results.push({ fajl: file, sheet: cfg.sheet, status: "prazno", razlog: "nema validnih redova" });
      continue;
    }

    const existing = sheetToRows(wb.Sheets[cfg.sheet], cfg.excelCols);
    const { rows, novih, azurirano } = mergeRows(existing, mapped, cfg);

    if (cfg.sheet === "radni_nalozi") {
      let nextId = rows.reduce((m, r) => Math.max(m, num(r.id) || 0), 0);
      rows.forEach((r) => {
        if (!r.id) {
          nextId += 1;
          r.id = nextId;
        }
      });
    }
    if (cfg.sheet === "kupci") {
      let nextId = rows.reduce((m, r) => Math.max(m, num(r.id) || 0), 0);
      rows.forEach((r) => {
        if (!r.id) {
          nextId += 1;
          r.id = nextId;
        }
      });
    }

    const excelRows = rowsToExcelObjects(rows, cfg.excelCols);
    wb.Sheets[cfg.sheet] = XLSX.utils.json_to_sheet(excelRows, {
      header: cfg.excelCols.map(([, label]) => label),
    });
    if (!wb.SheetNames.includes(cfg.sheet)) {
      XLSX.utils.book_append_sheet(wb, wb.Sheets[cfg.sheet], cfg.sheet.slice(0, 31));
    }

    if (syncDocs && docsDir && !dryRun) {
      const docsName = `${cfg.sheet}.csv`;
      await fs.writeFile(path.join(docsDir, docsName), rowsToCsvText(rows, cfg.excelCols), "utf8");
    }

    results.push({
      fajl: file,
      sheet: cfg.sheet,
      status: "ok",
      ukupno: mapped.length,
      novih,
      azurirano,
      ukupno_u_sheetu: rows.length,
    });
  }

  if (!dryRun && results.some((r) => r.status === "ok")) {
    const backup = masterPath.replace(/\.xlsx$/i, `_pre_sap_${Date.now()}.xlsx`);
    try {
      await fs.access(masterPath);
      await fs.copyFile(masterPath, backup);
    } catch { /* prvi put nema starog */ }
    XLSX.writeFile(wb, masterPath);
  }

  return {
    ok: true,
    masterPath,
    dryRun,
    sheets: results,
  };
}
