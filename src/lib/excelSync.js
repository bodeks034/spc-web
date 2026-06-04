import * as XLSX from "xlsx";

export const EXCEL_BUCKET = "spc-excel-sync";
export const KONTROLNI_LOG_FILE = "kontrolni_log.xlsx";
export const MASTER_WORKBOOK = "spc_master.xlsx";

export const KONTROLNI_LOG_COLS = [
  ["datum", "Datum"],
  ["smena", "Smena"],
  ["radni_nalog", "Radni nalog"],
  ["id_deo", "ID dela"],
  ["naziv_dela", "Naziv dela"],
  ["linija_id", "Linija ID"],
  ["masina_id", "Masina ID"],
  ["kontrolor_id", "Kontrolor ID"],
  ["status", "Status"],
  ["greska_naziv", "Kategorija greske"],
  ["podkategorija", "Podkategorija"],
  ["defekt", "Defekt"],
  ["kom_nok", "Kom NOK"],
  ["ok_kolicina", "OK kol."],
  ["nok_kolicina", "NOK kol."],
  ["ukupno_merenja", "Ukupno N"],
  ["potreban_broj", "Potreban broj"],
  ["komentar", "Komentar"],
];

/** Mapiranje Excel sheet → Supabase (isti redosled kao docs/*.csv) */
export const IMPORT_SHEETS = [
  {
    sheet: "linije",
    table: "linije",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      linija: pick(r, "linija"),
      proces: pick(r, "proces") || null,
      operacija: pick(r, "operacija") || null,
      greske: pick(r, "greske") || null,
    }),
    valid: (r) => r.id && r.linija,
  },
  {
    sheet: "masine",
    table: "masine",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      naziv: pick(r, "naziv masine", "naziv"),
      linija: pick(r, "linija") || null,
    }),
    valid: (r) => r.id && r.naziv,
  },
  {
    sheet: "smene",
    table: "smene",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      naziv: pick(r, "smena", "naziv"),
      pocetak: pick(r, "pocetak") || null,
      kraj: pick(r, "kraj") || null,
    }),
    valid: (r) => r.id && r.naziv,
  },
  {
    sheet: "greske_katalog",
    table: "greske_katalog",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      kategorija: pick(r, "kategorija"),
      podkategorija: pick(r, "podkategorija"),
      defekt: pick(r, "defekt") || pick(r, "podkategorija"),
      opis: pick(r, "opis") || null,
    }),
    valid: (r) => r.id && r.kategorija,
  },
  {
    sheet: "katalog_gresaka_vozilo",
    table: "katalog_gresaka_vozilo",
    onConflict: null,
    replace: true,
    map: (r) => ({
      vozilo_id: pick(r, "id", "vozilo_id"),
      kategorija: pick(r, "kategorija"),
      podkategorija: pick(r, "podkategorija"),
      defekt: pick(r, "defekt"),
    }),
    valid: (r) => r.vozilo_id && r.defekt,
  },
  {
    sheet: "delovi",
    table: "delovi",
    onConflict: "id_deo",
    map: (r) => {
      const idDeo = pick(r, "id dela", "id_deo").toUpperCase();
      const tip = (pick(r, "tip kontrole", "tip_kontrole") || (idDeo.startsWith("AUTO") ? "vozilo" : "deo")).toLowerCase();
      return {
        id_deo: idDeo,
        naziv_dela: pick(r, "naziv dela", "naziv_dela"),
        karakteristika: pick(r, "karakteristika kontrole", "karakteristika") || null,
        linija_id: num(pick(r, "linija id", "linija_id")),
        masina_id: num(pick(r, "masina id", "masina_id")),
        kom_za_kontrolu: num(pick(r, "kom za kontrolu n", "kom za kontrolu")) ?? 30,
        slika_naziv: pick(r, "slika/crtez", "slika_naziv") || null,
        aktivan: daNe(pick(r, "aktivan")),
        napomena: pick(r, "napomena") || null,
        tip_kontrole: tip === "vozilo" ? "vozilo" : "deo",
        vozilo_katalog_id: pick(r, "vozilo katalog id", "vozilo_katalog_id") || (tip === "vozilo" ? "FINAL-001" : null),
      };
    },
    valid: (r) => r.id_deo,
  },
  {
    sheet: "radnici",
    table: "radnici",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      ime: pick(r, "ime i prezime", "ime"),
      uloga: pick(r, "uloga").toLowerCase().replace(/\*+$/, ""),
      email: pick(r, "email") || null,
      aktivan: daNe(pick(r, "aktivan")),
      napomena: pick(r, "napomena") || null,
    }),
    valid: (r) => r.id && r.ime && r.uloga,
  },
  {
    sheet: "radni_nalozi",
    table: "radni_nalozi",
    onConflict: "broj_naloga",
    map: (r) => ({
      id: num(r.id) || undefined,
      broj_naloga: pick(r, "radni nal", "broj_naloga").toUpperCase(),
      id_deo: pick(r, "id dela", "id_deo").toUpperCase(),
      naziv_dela: pick(r, "naziv dela", "naziv_dela") || null,
      kolicina: num(pick(r, "kolicina")),
      kupac: pick(r, "kupac") || null,
      datum_unosa: pick(r, "datum unosa") || null,
      rok_isporuke: pick(r, "rok isporuke") || null,
      status: pick(r, "status") || "aktivan",
      operater: pick(r, "operater") || null,
      napomena: pick(r, "napomena") || null,
    }),
    valid: (r) => r.broj_naloga,
  },
  {
    sheet: "kontrolna_lista_stavke",
    table: "kontrolna_lista_stavke",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      kategorija: pick(r, "kategorija"),
      stavka: pick(r, "stavka"),
      redosled: num(pick(r, "redosled")) ?? 0,
      aktivna: daNe(pick(r, "aktivna")),
    }),
    valid: (r) => r.id && r.stavka,
  },
];

/** Merljive / varijabilne tabele — CSV nazivi ili native tabovi iz Varijabilne_SPC.xlsm */
export const MERLJIVE_IMPORT_SHEETS = [
  {
    sheet: "sop_deo_varijabilni",
    altSheets: ["SOP"],
    table: "sop_deo_varijabilni",
    onConflict: "id_deo",
    map: (r) => ({
      id_deo: pick(r, "id_deo", "id dela").toUpperCase(),
      radni_nalog: pick(r, "radni_nalog", "radni nal") || null,
      naziv_dela: pick(r, "naziv_dela", "naziv dela") || null,
      slika: pick(r, "slika", "slika/crtez") || null,
      masina: pick(r, "masina") || null,
      linija: pick(r, "linija") || null,
      broj_merenja: num(pick(r, "broj_merenja")) || 5,
      kontrolor_ime: pick(r, "kontrolor_ime", "kontrolor") || null,
    }),
    valid: (r) => r.id_deo,
  },
  {
    sheet: "karakteristike_merljive",
    altSheets: ["Definicija_Karakteristika"],
    table: "karakteristike_merljive",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      id_deo: pick(r, "id_deo", "id dela").toUpperCase(),
      sifra_merenja: pick(r, "sifra_merenja", "sifra merenja"),
      pozicija: pick(r, "pozicija", "dimenzija"),
      naziv_mere: pick(r, "naziv_mere", "naziv mere") || null,
      nominala: num(pick(r, "nominala")),
      usl: num(pick(r, "usl")),
      lsl: num(pick(r, "lsl")),
      usl_text: pick(r, "usl_text") || null,
      lsl_text: pick(r, "lsl_text") || null,
      merni_instrument: pick(r, "merni_instrument", "merni instrument") || null,
      jedinica: pick(r, "jedinica") || null,
      napomena: pick(r, "napomena") || null,
    }),
    valid: (r) => r.id && r.id_deo && r.pozicija,
  },
  {
    sheet: "merenja_varijabilna",
    altSheets: ["DATA"],
    table: "merenja_varijabilna",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      datum: pick(r, "datum") || null,
      smena: num(pick(r, "smena")),
      radni_nalog: pick(r, "radni_nalog", "radni nal") || null,
      id_deo: pick(r, "id_deo", "id dela").toUpperCase(),
      pozicija: pick(r, "pozicija", "dimenzija"),
      vrednost_raw: String(pick(r, "vrednost_raw", "izmereno") ?? ""),
      vrednost_dec: num(pick(r, "vrednost_dec", "izmereno")),
      status: (pick(r, "status") || "OK").toUpperCase(),
      linija: pick(r, "linija") || null,
      kontrolor: pick(r, "kontrolor") || null,
      operater: pick(r, "operater") || null,
      merni_instrument: pick(r, "merni_instrument", "merni instrument") || null,
      masina: pick(r, "masina") || null,
      foto: pick(r, "foto") || null,
      komentar: pick(r, "komentar", "napomena") || null,
    }),
    valid: (r) => r.id && r.id_deo && r.vrednost_raw,
  },
];

function normKey(k) {
  return String(k || "")
    .trim()
    .replace(/\*+$/, "")
    .replace(/š/gi, "s")
    .replace(/č/gi, "c")
    .replace(/ć/gi, "c")
    .replace(/ž/gi, "z")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

function pick(row, ...keys) {
  for (const k of keys) {
    const v = row[normKey(k)];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function daNe(v) {
  if (!v) return true;
  return ["da", "1", "true", "yes"].includes(String(v).trim().toLowerCase());
}

function sheetToRows(sheet) {
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return raw.map((row) => {
    const out = {};
    Object.entries(row).forEach(([k, v]) => {
      out[normKey(k)] = v;
    });
    return out;
  });
}

function rowsToExportRows(rows, cols) {
  return rows.map((r) => {
    const o = {};
    cols.forEach(([key, label]) => {
      o[label] = r[key] ?? "";
    });
    return o;
  });
}

export function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename);
}

export function readWorkbookFromArrayBuffer(ab) {
  return XLSX.read(ab, { type: "array" });
}

export async function readWorkbookFromFile(file) {
  const ab = await file.arrayBuffer();
  return readWorkbookFromArrayBuffer(ab);
}

export function workbookSheetNames(wb) {
  return wb.SheetNames || [];
}

function findSheetEntry(wb, cfg) {
  const names = [cfg.sheet, ...(cfg.altSheets || [])];
  for (const name of names) {
    if (wb.Sheets[name]) return { name, sheet: wb.Sheets[name] };
  }
  return null;
}

function sheetPositionalRows(sheet) {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

function parseSopDeoPositional(rows) {
  const out = [];
  const seen = new Set();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const idDeo = String(r[3] || "").trim().toUpperCase();
    if (!idDeo || seen.has(idDeo)) continue;
    seen.add(idDeo);
    out.push({
      id_deo: idDeo,
      radni_nalog: String(r[2] || "").trim() || null,
      naziv_dela: String(r[4] || "").trim() || null,
      slika: String(r[10] || "").trim() || null,
      masina: String(r[11] || "").trim() || null,
      linija: String(r[15] || "").trim() || null,
      broj_merenja: num(r[20]) || 5,
      kontrolor_ime: String(r[13] || "").trim() || null,
    });
  }
  return out.filter(r => r.id_deo);
}

function parseKarakteristikePositional(rows) {
  const out = [];
  let id = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const idDeo = String(r[0] || "").trim().toUpperCase();
    const pozicija = String(r[2] || "").trim();
    if (!idDeo || !pozicija) continue;
    id += 1;
    out.push({
      id,
      id_deo: idDeo,
      sifra_merenja: String(r[1] || "").trim(),
      pozicija,
      naziv_mere: String(r[3] || "").trim() || null,
      nominala: num(r[4]),
      usl: num(r[5]),
      lsl: num(r[6]),
      usl_text: String(r[7] ?? "").trim() || null,
      lsl_text: String(r[8] ?? "").trim() || null,
      merni_instrument: String(r[9] || "").trim() || null,
      jedinica: String(r[10] || "").trim() || null,
      napomena: String(r[11] || "").trim() || null,
    });
  }
  return out;
}

function parseMerenjaPositional(rows) {
  const out = [];
  let id = 0;
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    const idDeo = String(r[3] || "").trim().toUpperCase();
    const izm = num(r[5]);
    if (!idDeo || izm === null) continue;
    id += 1;
    const statusRaw = String(r[6] || "").trim().toUpperCase();
    out.push({
      id,
      datum: excelDateCell(r[0]),
      smena: parseSmenaCell(r[1]),
      radni_nalog: String(r[2] || "").trim() || null,
      id_deo: idDeo,
      pozicija: String(r[11] || "").trim() || String(r[4] || "").trim(),
      vrednost_raw: String(izm),
      vrednost_dec: izm,
      status: statusRaw === "NOK" ? "NOK" : "OK",
      linija: String(r[7] || "").trim() || null,
      kontrolor: "",
      operater: String(r[8] || "").trim() || null,
      merni_instrument: String(r[9] || "").trim() || null,
      masina: String(r[10] || "").replace(/^Ma[sš]ina:\s*/i, "").trim() || null,
    });
  }
  return out.filter(r => r.id_deo && r.vrednost_raw);
}

function excelDateCell(v) {
  if (typeof v === "number" && v > 40000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v || "").trim();
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s || null;
}

function parseSmenaCell(v) {
  const s = String(v || "").trim();
  if (!s) return 1;
  const first = s.split(",")[0].trim();
  const n = Number(first);
  return Number.isFinite(n) && n >= 1 && n <= 3 ? n : 1;
}

function rowsForMerljiveSheet(wb, cfg) {
  const found = findSheetEntry(wb, cfg);
  if (!found) return { rawCount: 0, mapped: [] };

  const { name, sheet } = found;
  if (name === "SOP") {
    const rows = sheetPositionalRows(sheet);
    return { rawCount: rows.length, mapped: parseSopDeoPositional(rows) };
  }
  if (name === "Definicija_Karakteristika") {
    const rows = sheetPositionalRows(sheet);
    return { rawCount: rows.length, mapped: parseKarakteristikePositional(rows) };
  }
  if (name === "DATA") {
    const rows = sheetPositionalRows(sheet);
    return { rawCount: rows.length, mapped: parseMerenjaPositional(rows) };
  }

  const raw = sheetToRows(sheet);
  const mapped = raw.map(cfg.map).filter(cfg.valid);
  return { rawCount: raw.length, mapped };
}

export function previewImport(wb, sheets = IMPORT_SHEETS) {
  return sheets.map((cfg) => {
    if (sheets === MERLJIVE_IMPORT_SHEETS) {
      const { rawCount, mapped } = rowsForMerljiveSheet(wb, cfg);
      return { ...cfg, rawCount, mappedCount: mapped.length };
    }
    const sheet = wb.Sheets[cfg.sheet];
    const raw = sheetToRows(sheet);
    const mapped = raw.map(cfg.map).filter(cfg.valid);
    return { ...cfg, rawCount: raw.length, mappedCount: mapped.length };
  });
}

export function previewMerljiveImport(wb) {
  return previewImport(wb, MERLJIVE_IMPORT_SHEETS);
}

async function upsertBatches(supabase, table, rows, onConflict) {
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const opts = onConflict ? { onConflict } : undefined;
    const { error } = await supabase.from(table).upsert(batch, opts);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function importSheetConfig(supabase, wb, cfg, useMerljiveParser) {
  let rows;
  if (useMerljiveParser) {
    const parsed = rowsForMerljiveSheet(wb, cfg);
    if (!parsed.mapped.length) {
      return { sheet: cfg.sheet, status: parsed.rawCount ? "prazno" : "preskoceno", count: 0 };
    }
    rows = parsed.mapped;
  } else {
    const sheet = wb.Sheets[cfg.sheet];
    if (!sheet) {
      return { sheet: cfg.sheet, status: "preskoceno", count: 0 };
    }
    rows = sheetToRows(sheet).map(cfg.map).filter(cfg.valid);
    if (!rows.length) {
      return { sheet: cfg.sheet, status: "prazno", count: 0 };
    }
  }
  if (cfg.replace) {
    await supabase.from(cfg.table).delete().neq("id", 0);
    const { error } = await supabase.from(cfg.table).insert(rows);
    if (error) throw new Error(`${cfg.table}: ${error.message}`);
  } else {
    await upsertBatches(supabase, cfg.table, rows, cfg.onConflict);
  }
  return { sheet: cfg.sheet, table: cfg.table, status: "ok", count: rows.length };
}

export async function importWorkbookToSupabase(supabase, wb, onlySheets = null) {
  const results = [];
  for (const cfg of IMPORT_SHEETS) {
    if (onlySheets && !onlySheets.includes(cfg.sheet)) continue;
    results.push(await importSheetConfig(supabase, wb, cfg, false));
  }
  return results;
}

export async function importMerljiveWorkbookToSupabase(supabase, wb, onlySheets = null) {
  const results = [];
  for (const cfg of MERLJIVE_IMPORT_SHEETS) {
    if (onlySheets && !onlySheets.includes(cfg.sheet)) continue;
    results.push(await importSheetConfig(supabase, wb, cfg, true));
  }
  return results;
}

export async function exportMasterWorkbook(supabase) {
  const wb = XLSX.utils.book_new();
  for (const cfg of IMPORT_SHEETS) {
    const { data, error } = await supabase.from(cfg.table).select("*");
    if (error) throw error;
    const cols = data?.length
      ? Object.keys(data[0])
      : [];
    const sheet = XLSX.utils.json_to_sheet(data || [], cols.length ? { header: cols } : undefined);
    XLSX.utils.book_append_sheet(wb, sheet, cfg.sheet.slice(0, 31));
  }
  const { data: logData } = await supabase
    .from("kontrolni_log")
    .select("datum,smena,radni_nalog,id_deo,naziv_dela,linija_id,masina_id,kontrolor_id,status,greska_naziv,podkategorija,defekt,kom_nok,ok_kolicina,nok_kolicina,ukupno_merenja,komentar,created_at")
    .order("created_at", { ascending: true });
  if (logData?.length) {
    const sheet = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(wb, sheet, "kontrolni_log");
  }
  return wb;
}

export async function exportMerljiveMasterWorkbook(supabase) {
  const wb = XLSX.utils.book_new();
  for (const cfg of MERLJIVE_IMPORT_SHEETS) {
    const { data, error } = await supabase.from(cfg.table).select("*");
    if (error) throw error;
    const cols = data?.length ? Object.keys(data[0]) : [];
    const sheet = XLSX.utils.json_to_sheet(data || [], cols.length ? { header: cols } : undefined);
    XLSX.utils.book_append_sheet(wb, sheet, cfg.sheet.slice(0, 31));
  }
  return wb;
}

export async function exportMerenjaVarijabilnaExcel(supabase, idDeo, pozicija, datumOd, datumDo) {
  let q = supabase
    .from("merenja_varijabilna")
    .select("*")
    .order("datum", { ascending: true })
    .order("created_at", { ascending: true });
  if (idDeo) q = q.eq("id_deo", idDeo);
  if (pozicija) q = q.eq("pozicija", pozicija);
  if (datumOd) q = q.gte("datum", datumOd);
  if (datumDo) q = q.lte("datum", datumDo);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return null;
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, sheet, "merenja_varijabilna");
  return wb;
}

export async function uploadWorkbookToStorage(supabase, wb, path) {
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const { error } = await supabase.storage.from(EXCEL_BUCKET).upload(path, buf, {
    upsert: true,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (error) throw error;
}

async function loadKontrolniLogWorkbook(supabase) {
  const { data, error } = await supabase.storage.from(EXCEL_BUCKET).download(KONTROLNI_LOG_FILE);
  if (error || !data) {
    const wb = XLSX.utils.book_new();
    const headerRow = Object.fromEntries(KONTROLNI_LOG_COLS.map(([, label]) => [label, ""]));
    const sheet = XLSX.utils.json_to_sheet([], { header: Object.keys(headerRow) });
    XLSX.utils.book_append_sheet(wb, sheet, "kontrolni_log");
    return wb;
  }
  const ab = await data.arrayBuffer();
  return readWorkbookFromArrayBuffer(ab);
}

/**
 * Dual-write: nakon inserta u Supabase, dopuni Excel u Storage bucket-u.
 * Vraća { storage: bool, download: bool, error?: string }
 */
export async function mirrorKontrolniLogToExcel(supabase, newRows, { alsoDownload = false } = {}) {
  if (!newRows?.length) return { storage: false, download: false };

  const exportRows = rowsToExportRows(
    newRows.map((r) => ({
      ...r,
      created_at: new Date().toISOString(),
    })),
    KONTROLNI_LOG_COLS
  );

  let storageOk = false;
  let downloadOk = false;

  try {
    const wb = await loadKontrolniLogWorkbook(supabase);
    const sheetName = wb.SheetNames[0] || "kontrolni_log";
    const existing = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
    const merged = [...existing, ...exportRows];
    const newSheet = XLSX.utils.json_to_sheet(merged);
    wb.Sheets[sheetName] = newSheet;
    if (!wb.SheetNames.includes(sheetName)) wb.SheetNames.push(sheetName);
    await uploadWorkbookToStorage(supabase, wb, KONTROLNI_LOG_FILE);
    storageOk = true;
  } catch (e) {
    console.warn("Excel Storage sync:", e.message);
  }

  if (alsoDownload || !storageOk) {
    try {
      const wb = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, sheet, "novi_unos");
      downloadWorkbook(wb, `SPC_unos_${dISO()}_${Date.now()}.xlsx`);
      downloadOk = true;
    } catch (e) {
      console.warn("Excel download:", e.message);
    }
  }

  return { storage: storageOk, download: downloadOk };
}

function dISO() {
  return new Date().toISOString().split("T")[0];
}

export async function exportKontrolniLogExcel(supabase, idDeo, datumOd, datumDo) {
  let q = supabase
    .from("kontrolni_log")
    .select("datum,smena,id_deo,naziv_dela,greska_naziv,podkategorija,defekt,status,ok_kolicina,nok_kolicina,ukupno_merenja,komentar,created_at")
    .order("datum", { ascending: true });
  if (idDeo) q = q.eq("id_deo", idDeo);
  if (datumOd) q = q.gte("datum", datumOd);
  if (datumDo) q = q.lte("datum", datumDo);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return null;
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, sheet, "kontrolni_log");
  return wb;
}

/** Izvoz jedne Gage R&R studije — listovi: info, merenja, Xbar_R, ANOVA. */
export function exportGageRRExcel(studija) {
  const wb = XLSX.utils.book_new();
  const r = studija.rezultat || {};
  const xbar = r.xbar || (r.metoda === "xbar_r" ? r : null);
  const anova = r.anova || (r.metoda === "anova" ? r : null);

  const info = [{
    Polje: "Naziv", Vrednost: studija.naziv || "",
  }, {
    Polje: "Datum", Vrednost: studija.datum || "",
  }, {
    Polje: "Merilo", Vrednost: studija.merilo_naziv || studija.merilo_id || "",
  }, {
    Polje: "Karakteristika", Vrednost: studija.karakteristika || "",
  }, {
    Polje: "LSL", Vrednost: studija.lsl ?? "",
  }, {
    Polje: "USL", Vrednost: studija.usl ?? "",
  }, {
    Polje: "Delova", Vrednost: studija.nDelova,
  }, {
    Polje: "Operatera", Vrednost: studija.nOperatera,
  }, {
    Polje: "Ponavljanja", Vrednost: studija.nPonavljanja,
  }, {
    Polje: "%GRR (primarni)", Vrednost: r.pctGRR ?? studija.pct_grr ?? "",
  }, {
    Polje: "ndc", Vrednost: r.ndc ?? studija.ndc ?? "",
  }, {
    Polje: "Status MSA", Vrednost: r.odluka?.status || studija.status_msa || "",
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(info), "info");

  const merenja = [];
  const mat = studija.matrica || [];
  const ops = studija.operateri || [];
  const dels = studija.delovi || [];
  mat.forEach((deo, i) => {
    deo.forEach((op, j) => {
      op.forEach((v, k) => {
        merenja.push({
          Deo: dels[i] ?? i + 1,
          Operater: ops[j] ?? j + 1,
          Ponavljanje: k + 1,
          Vrednost: v,
        });
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(merenja), "merenja");

  const rezultatRed = (obj, metoda) => {
    if (!obj?.ok) return [{ Metoda: metoda, Napomena: "Nije izračunato" }];
    return [
      { Metoda: metoda, Pokazatelj: "%GRR", Vrednost: obj.pctGRR },
      { Metoda: metoda, Pokazatelj: "%Repeat", Vrednost: obj.pctRepeat },
      { Metoda: metoda, Pokazatelj: "%Reprod", Vrednost: obj.pctReprod },
      { Metoda: metoda, Pokazatelj: "%Part", Vrednost: obj.pctPart },
      { Metoda: metoda, Pokazatelj: "%GRR/Tol", Vrednost: obj.pctTolGRR ?? "—" },
      { Metoda: metoda, Pokazatelj: "ndc", Vrednost: obj.ndc },
      { Metoda: metoda, Pokazatelj: "EV", Vrednost: obj.EV },
      { Metoda: metoda, Pokazatelj: "AV", Vrednost: obj.AV },
      { Metoda: metoda, Pokazatelj: "PV", Vrednost: obj.PV },
      { Metoda: metoda, Pokazatelj: "GRR", Vrednost: obj.GRR },
      { Metoda: metoda, Pokazatelj: "TV", Vrednost: obj.TV },
      { Metoda: metoda, Pokazatelj: "Odluka", Vrednost: obj.odluka?.tekst || "" },
    ];
  };

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rezultatRed(xbar, "Xbar_R")),
    "Xbar_R",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rezultatRed(anova, "ANOVA")),
    "ANOVA",
  );

  return wb;
}
