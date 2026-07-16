import * as XLSX from "xlsx";
import {
  mapDeloviRedIzExcela,
  podeliDeloviUvoz,
  deloviZaExcelEksport,
} from "./deloviAtributivni.js";
import { normalizujDatum } from "./radniNaloziUvoz.js";
import {
  parseDefinicijaSheet,
  definicijaImaHeaderRed,
  propagirajMetaKarakteristika,
} from "./definicijaKarakteristika.js";
import {
  KARAKTERISTIKE_MERLJIVE_HEADER,
  KARAKTERISTIKE_DB_COLS,
  mapKarakteristikaMerljiveRow,
  getKarakteristikeDbCols,
  pripremiKarakteristikeZaUpsert,
  KARAKTERISTIKE_UPSERT_CONFLICT,
  MIGRACIJA_KARAKTERISTIKE_UNIQUE_POGON,
  MIGRACIJA_KARAKTERISTIKE_ID_SEQ,
  dodeliSerijeMerenja,
} from "./karakteristikaMerljive.js";
import { syncDerivedSifrarnikForDelove } from "./importDerivedSifrarnik.js";
import {
  generisiIzKarakteristika,
  generisiRadniNaloge,
} from "./syncSifrarnikIzMerljivih.js";
import {
  MERENJA_VARIJABILNA_EXPORT_COLS,
  KONTROLNI_LOG_EXPORT_COLS,
  KPI_EXPORT_COLS,
  buildKpiLookup,
  fetchKpiUnosZaIzvoz,
  fetchNaziviDelaMap,
  mapMerenjeVarijabilnoZaIzvoz,
  mapKontrolniLogZaIzvoz,
  kpiPoljaIzForme,
} from "./kpiExcelExport.js";
import { DELOVI_EXCEL_COLS } from "./excelColumnDefs.js";
import { downloadStyledWorkbook, workbookToArrayBuffer } from "./excelStil.js";

export { DELOVI_EXCEL_COLS };

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
  ...KPI_EXPORT_COLS,
];

/** Kolone taba delovi u SPC_master_atributivne (redosled za Excel). */
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
      id_deo: pick(r, "id_deo", "id dela") ? pick(r, "id_deo", "id dela").toUpperCase() : null,
      katalog_id: pick(r, "katalog_id", "katalog id") || null,
      pogon_kod: (pick(r, "pogon_kod", "pogon kod", "pogon") || "").toUpperCase() || null,
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
    sheet: "tipovi_vozila",
    table: "tipovi_vozila",
    onConflict: "kod",
    map: (r) => ({
      kod: String(pick(r, "kod") || "").trim().toUpperCase(),
      naziv: pick(r, "naziv"),
      prefiks_id_deo: pick(r, "prefiks_id_deo", "prefiks id deo") || null,
      slika_sop: pick(r, "slika_sop", "slika sop") || null,
      dijagram_src: pick(r, "dijagram_src", "dijagram src", "dijagram") || null,
      aktivan: daNe(pick(r, "aktivan", "aktivna"), true),
      napomena: pick(r, "napomena") || null,
    }),
    valid: (r) => r.kod && r.naziv,
  },
  {
    sheet: "delovi",
    table: "delovi",
    onConflict: "id_deo",
    dualAtributivniPogon: true,
    map: (r) => mapDeloviRedIzExcela(r, pick, num, daNe),
    valid: (r) => r.id_deo,
  },
  {
    sheet: "ciljevi",
    table: "ciljevi",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id) || undefined,
      id_deo: pick(r, "id dela", "id_deo").toUpperCase() || null,
      naziv: pick(r, "naziv") || null,
      rty_cilj: num(pick(r, "rty cilj %", "rty_cilj", "rty cilj")),
      dpmo_cilj: num(pick(r, "dpmo cilj", "dpmo_cilj")),
      p_cilj: num(pick(r, "p cilj %", "p_cilj", "p cilj")),
      vazi_od: pick(r, "vazi od", "vazi_od") || null,
      napomena: pick(r, "napomena") || null,
    }),
    valid: (r) => r.id_deo || r.naziv,
  },
  {
    sheet: "radnici",
    table: "radnici",
    onConflict: "id",
    map: (r) => {
      const row = {
        id: num(r.id),
        ime: pick(r, "ime i prezime", "ime"),
        uloga: pick(r, "uloga").toLowerCase().replace(/\*+$/, ""),
        email: pick(r, "email") || null,
        napomena: pick(r, "napomena") || null,
      };
      const aktivan = daNeEksplicitno(pick(r, "aktivan"));
      if (aktivan !== undefined) row.aktivan = aktivan;
      return row;
    },
    valid: (r) => r.id && r.ime && r.uloga,
  },
  {
    sheet: "radni_nalozi",
    table: "radni_nalozi",
    onConflict: "broj_naloga",
    map: (r) => {
      const broj = pick(r, "radni nal", "broj_naloga").toUpperCase();
      let pogon = (pick(r, "pogon_kod", "pogon kod", "pogon") || "").toUpperCase();
      if (!pogon) {
        const m = broj.match(/-([A-H])$/);
        if (m) pogon = m[1];
      }
      return {
        broj_naloga: broj,
        id_deo: pick(r, "id dela", "id_deo").toUpperCase(),
        naziv_dela: pick(r, "naziv dela", "naziv_dela") || null,
        kolicina: num(pick(r, "kolicina")),
        kupac: pick(r, "kupac") || null,
        datum_unosa: normalizujDatum(pick(r, "datum unosa", "datum_unosa")),
        rok_isporuke: normalizujDatum(pick(r, "rok isporuke", "rok_isporuke")),
        status: pick(r, "status") || "aktivan",
        operater: pick(r, "operater") || null,
        napomena: pick(r, "napomena") || null,
        pogon_kod: pogon || null,
      };
    },
    valid: (r) => r.broj_naloga,
  },
  {
    sheet: "kupci",
    table: "kupci",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id),
      naziv: pick(r, "naziv", "kupac"),
      aktivan: daNe(pick(r, "aktivan")),
    }),
    valid: (r) => r.id && r.naziv,
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
  {
    sheet: "merila",
    table: "merila",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id) || undefined,
      naziv: pick(r, "naziv merila", "naziv"),
      serijski_broj: pick(r, "serijski br.", "serijski_broj", "serijski broj") || null,
      tip: pick(r, "tip") || null,
      lokacija: pick(r, "lokacija") || null,
      opseg: pick(r, "opseg") || null,
      aktivno: daNe(pick(r, "aktivno", "aktivan")),
    }),
    valid: (r) => r.naziv,
  },
  {
    sheet: "kalibracije",
    table: "kalibracije",
    onConflict: "id",
    map: (r) => ({
      id: num(r.id) || undefined,
      merilo_id: num(pick(r, "merilo id", "merilo_id", "id merila")),
      datum_kal: pick(r, "datum kal.", "datum_kal", "datum kalibracije") || null,
      sledeca_kal: pick(r, "sledeca kal.", "sledeca_kal", "sledeća kal.") || null,
      izvrsio: pick(r, "izvrsio", "izvršio") || null,
      sertifikat_br: pick(r, "cert br.", "sertifikat_br", "sertifikat") || null,
      rezultat: pick(r, "rezultat") || null,
      napomena: pick(r, "napomena") || null,
    }),
    valid: (r) => r.merilo_id,
  },
];

/** Kolone taba karakteristike_merljive (jedini izvor — bez Definicija_Karakteristika). */
export const KARAKTERISTIKE_MERLJIVE_COLS = KARAKTERISTIKE_MERLJIVE_HEADER;

/** Merljive / varijabilne tabele — CSV nazivi ili native tabovi iz Varijabilne_SPC.xlsm */
export const MERLJIVE_IMPORT_SHEETS = [
  {
    sheet: "sop_deo_varijabilni",
    altSheets: ["SOP"],
    table: "sop_deo_varijabilni",
    onConflict: "id_deo,pogon_kod",
    map: (r) => ({
      id_deo: pick(r, "id_deo", "id dela").toUpperCase(),
      pogon_kod: (pick(r, "pogon_kod", "pogon kod", "pogon") || "A").toUpperCase(),
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
    onConflict: KARAKTERISTIKE_UPSERT_CONFLICT,
    map: (r) => mapKarakteristikaMerljiveRow(r),
    valid: (r) => r.id_deo && r.pozicija,
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
      pogon_kod: (pick(r, "pogon_kod", "pogon kod", "pogon") || "").toUpperCase() || null,
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

/** Samo eksplicitno DA/NE — prazna ćelija ne menja postojeći status u bazi. */
function daNeEksplicitno(v) {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  return daNe(s);
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
  downloadStyledWorkbook(wb, filename);
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

function pogonIzRnUvoz(brojNaloga) {
  const rn = String(brojNaloga || "").trim().toUpperCase();
  const m = rn.match(/-([A-H])$/);
  return m ? m[1] : "A";
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
  const byKey = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const idDeo = String(r[3] || "").trim().toUpperCase();
    if (!idDeo) continue;
    const radniNalog = String(r[2] || "").trim() || null;
    const pogonKod = pogonIzRnUvoz(radniNalog);
    const key = `${idDeo}\0${pogonKod}`;
    byKey.set(key, {
      id_deo: idDeo,
      pogon_kod: pogonKod,
      radni_nalog: radniNalog,
      naziv_dela: String(r[4] || "").trim() || null,
      slika: String(r[10] || "").trim() || null,
      masina: String(r[11] || "").trim() || null,
      linija: String(r[15] || "").trim() || null,
      broj_merenja: num(r[20]) || 5,
      kontrolor_ime: String(r[13] || "").trim() || null,
    });
  }
  return [...byKey.values()];
}

function parseKarakteristikePositional(rows) {
  return parseDefinicijaSheet(rows);
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
    const raw = definicijaImaHeaderRed(rows) ? sheetToRows(sheet) : [];
    const mapped = raw.length
      ? raw.map((r) => mapKarakteristikaMerljiveRow(r)).filter(cfg.valid)
      : parseDefinicijaSheet(rows).map(mapKarakteristikaMerljiveRow).filter(cfg.valid);
    return { rawCount: raw.length || rows.length, mapped };
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

/** Koliko SOP / delovi / RN bi auto-sync generisao iz karakteristika u workbook-u. */
export function previewAutoSyncMerljive(wb) {
  const karCfg = MERLJIVE_IMPORT_SHEETS.find((c) => c.table === "karakteristike_merljive");
  if (!karCfg) return null;
  const { mapped } = rowsForMerljiveSheet(wb, karCfg);
  if (!mapped.length) return null;

  const gen = generisiIzKarakteristika(mapped);
  const noviRn = generisiRadniNaloge(mapped, { postojeciRn: [] });
  const idDeos = [...new Set(mapped.map((r) => String(r.id_deo || "").toUpperCase()).filter(Boolean))];
  const bezPogona = mapped.filter((r) => !String(r.pogon_kod || "").trim()).length;

  return {
    karakteristike: mapped.length,
    idDeos,
    sop: gen.sopRows.length,
    deloviPogon: gen.deloviPogonRows.length,
    deloviMaster: gen.masterRows.length,
    radniNalozi: noviRn.length,
    pogoni: [...new Set(mapped.map((r) => String(r.pogon_kod || "").trim().toUpperCase()).filter(Boolean))].sort(),
    upozorenja: bezPogona
      ? [`${bezPogona} red(ova) bez pogon_kod — popuni kolonu pogon_kod (C) ili linija_faza (G)`]
      : [],
  };
}

/** Inženjer — samo karakteristike_merljive (LSL/USL/granice). */
export const INZENJER_MERLJIVE_UVOZ_SHEETS = ["karakteristike_merljive"];

export function previewInzenjerMerljiveUvoz(wb) {
  return MERLJIVE_IMPORT_SHEETS
    .filter((s) => INZENJER_MERLJIVE_UVOZ_SHEETS.includes(s.sheet))
    .map((cfg) => {
      const { rawCount, mapped } = rowsForMerljiveSheet(wb, cfg);
      return { ...cfg, rawCount, mappedCount: mapped.length };
    });
}

/** Poslednji red pobedi — upsert u jednom batch-u ne sme dva puta isti conflict ključ. */
function dedupeRowsForUpsert(rows, onConflict) {
  if (!onConflict || rows.length < 2) return rows;
  const keys = onConflict.split(",").map((k) => k.trim());
  const conflictImaPogon = keys.includes("pogon_kod");
  const out = new Map();
  for (const row of rows) {
    const parts = keys.map((key) => {
      let v = row[key];
      if (key === "pogon_kod") {
        return v === undefined || v === null ? "" : String(v).trim().toUpperCase();
      }
      if (v === undefined || v === null || v === "") return null;
      if (key === "id_deo") v = String(v).toUpperCase();
      return v;
    });
    if (parts.some((p) => p === null)) continue;
    const normalized = { ...row };
    if (normalized.id_deo) normalized.id_deo = String(normalized.id_deo).toUpperCase();
    if (conflictImaPogon) {
      if (normalized.pogon_kod === undefined || normalized.pogon_kod === null) {
        normalized.pogon_kod = "";
      } else {
        normalized.pogon_kod = String(normalized.pogon_kod).trim().toUpperCase();
      }
    } else if ("pogon_kod" in normalized) {
      delete normalized.pogon_kod;
    }
    out.set(parts.join("\0"), normalized);
  }
  return out.size ? [...out.values()] : rows;
}

async function assertDeloviPostoje(supabase, rows, label) {
  const ids = [...new Set(
    rows.map((r) => String(r.id_deo || "").trim().toUpperCase()).filter(Boolean),
  )];
  if (!ids.length) return;

  const found = new Set();
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const { data, error } = await supabase.from("delovi").select("id_deo").in("id_deo", chunk);
    if (error) throw new Error(`${label}: provera delova — ${error.message}`);
    (data || []).forEach((r) => found.add(String(r.id_deo).toUpperCase()));
  }

  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) {
    throw new Error(
      `${label}: ID delova nisu u tabeli "delovi". `
      + `Prvo Admin → uvezi master Excel (tab delovi), pa merljive. Nedostaju: ${missing.join(", ")}`,
    );
  }
}

const MERLJIVE_TABELE_SA_DELOVIMA = new Set([
  "sop_deo_varijabilni",
  "karakteristike_merljive",
  "merenja_varijabilna",
]);

async function upsertBatches(supabase, table, rows, onConflict) {
  const deduped = dedupeRowsForUpsert(rows, onConflict);
  const batchSize = 100;
  for (let i = 0; i < deduped.length; i += batchSize) {
    const batch = deduped.slice(i, i + batchSize);
    const opts = onConflict ? { onConflict } : undefined;
    const { error } = await supabase.from(table).upsert(batch, opts);
    if (error) {
      let msg = `${table}: ${error.message}`;
      if (
        table === "karakteristike_merljive"
        && (
          String(error.message).includes("id_deo_sifra_merenja_pozicija")
          || String(error.message).includes("id_deo_pogon_sifra_pozicija")
        )
      ) {
        msg += ` — proveri duplikate u Excelu (isto id_deo+pogon+sifra+pozicija) i pokreni ${MIGRACIJA_KARAKTERISTIKE_UNIQUE_POGON}`;
      }
      if (
        table === "karakteristike_merljive"
        && String(error.message).includes("karakteristike_merljive_pkey")
      ) {
        msg += ` — pokreni ${MIGRACIJA_KARAKTERISTIKE_ID_SEQ} u Supabase SQL Editoru`;
      }
      throw new Error(msg);
    }
  }
  return deduped.length;
}

async function importDeloviSheet(supabase, wb, cfg) {
  const sheet = wb.Sheets[cfg.sheet];
  if (!sheet) {
    return { sheet: cfg.sheet, status: "preskoceno", count: 0 };
  }
  const mapped = sheetToRows(sheet).map(cfg.map).filter(cfg.valid);
  if (!mapped.length) {
    return { sheet: cfg.sheet, status: "prazno", count: 0 };
  }
  const { masterRows, pogonRows } = podeliDeloviUvoz(mapped);
  const masterCount = await upsertBatches(supabase, "delovi", masterRows, "id_deo");
  let pogonCount = 0;
  if (pogonRows.length) {
    pogonCount = await upsertBatches(supabase, "delovi_atributivni_pogon", pogonRows, "id_deo,pogon_kod");
  }
  return {
    sheet: cfg.sheet,
    table: "delovi + delovi_atributivni_pogon",
    status: "ok",
    count: masterCount + pogonCount,
  };
}

async function importSheetConfig(supabase, wb, cfg, useMerljiveParser) {
  if (cfg.dualAtributivniPogon) {
    return importDeloviSheet(supabase, wb, cfg);
  }
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
  if (MERLJIVE_TABELE_SA_DELOVIMA.has(cfg.table)) {
    await assertDeloviPostoje(supabase, rows, cfg.sheet);
  }
  if (cfg.table === "karakteristike_merljive") {
    rows = propagirajMetaKarakteristika(rows);
    rows = dodeliSerijeMerenja(rows);
    const dbCols = await getKarakteristikeDbCols(supabase);
    rows = await pripremiKarakteristikeZaUpsert(supabase, rows, dbCols);
  }
  if (cfg.replace) {
    await supabase.from(cfg.table).delete().neq("id", 0);
    const { error } = await supabase.from(cfg.table).insert(rows);
    if (error) throw new Error(`${cfg.table}: ${error.message}`);
    return { sheet: cfg.sheet, table: cfg.table, status: "ok", count: rows.length };
  }
  const count = await upsertBatches(supabase, cfg.table, rows, cfg.onConflict);
  return { sheet: cfg.sheet, table: cfg.table, status: "ok", count };
}

export async function importWorkbookToSupabase(supabase, wb, onlySheets = null) {
  const results = [];
  for (const cfg of IMPORT_SHEETS) {
    if (onlySheets && !onlySheets.includes(cfg.sheet)) continue;
    results.push(await importSheetConfig(supabase, wb, cfg, false));
  }
  return results;
}

export async function importMerljiveWorkbookToSupabase(supabase, wb, onlySheets = null, opts = {}) {
  const { autoSyncDerived = true } = opts;
  const configs = MERLJIVE_IMPORT_SHEETS.filter(
    (cfg) => !onlySheets || onlySheets.includes(cfg.sheet),
  );
  const results = [];
  const karCfg = configs.find((c) => c.table === "karakteristike_merljive");

  if (karCfg && autoSyncDerived) {
    const parsed = rowsForMerljiveSheet(wb, karCfg);
    if (parsed.mapped.length) {
      const resolved = dodeliSerijeMerenja(
        propagirajMetaKarakteristika(parsed.mapped),
      );
      const idDeos = [...new Set(resolved.map((r) => String(r.id_deo || "").toUpperCase()).filter(Boolean))];
      const syncRes = await syncDerivedSifrarnikForDelove(supabase, idDeos, { karRows: resolved });
      results.push(...syncRes);

      const dbCols = await getKarakteristikeDbCols(supabase);
      const dbRows = await pripremiKarakteristikeZaUpsert(supabase, resolved, dbCols);
      const count = await upsertBatches(
        supabase,
        "karakteristike_merljive",
        dbRows,
        KARAKTERISTIKE_UPSERT_CONFLICT,
      );
      const karResult = {
        sheet: karCfg.sheet,
        table: "karakteristike_merljive",
        status: "ok",
        count,
        skippedCols: KARAKTERISTIKE_DB_COLS.filter((c) => !dbCols.includes(c)),
      };
      results.push(karResult);
    } else {
      results.push({
        sheet: karCfg.sheet,
        status: parsed.rawCount ? "prazno" : "preskoceno",
        count: 0,
      });
    }
  }

  for (const cfg of configs) {
    if (autoSyncDerived && cfg.table === "karakteristike_merljive") continue;
    results.push(await importSheetConfig(supabase, wb, cfg, true));
  }
  return results;
}

export async function exportMasterWorkbook(supabase) {
  const wb = XLSX.utils.book_new();
  for (const cfg of IMPORT_SHEETS) {
    const { data, error } = await supabase.from(cfg.table).select("*");
    if (error) throw error;
    if (cfg.sheet === "delovi") {
      const { data: pogonData, error: pogonErr } = await supabase
        .from("delovi_atributivni_pogon")
        .select("*");
      if (pogonErr) throw pogonErr;
      const merged = deloviZaExcelEksport(data || [], pogonData || []).map((r) => ({
        ...r,
        aktivan: r.aktivan === false ? "NE" : "DA",
        pogon_kod: r.pogon_kod || "",
        radni_nalog: r.radni_nalog || "",
      }));
      const mapped = rowsToExportRows(merged, DELOVI_EXCEL_COLS);
      const sheet = XLSX.utils.json_to_sheet(mapped);
      XLSX.utils.book_append_sheet(wb, sheet, cfg.sheet.slice(0, 31));
      continue;
    }
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

function rowsToExportSheet(rows, cols) {
  const mapped = (rows || []).map((r) => {
    const o = {};
    cols.forEach((c) => { o[c] = r[c] ?? ""; });
    return o;
  });
  return XLSX.utils.json_to_sheet(mapped, { header: cols });
}

export async function exportMerljiveMasterWorkbook(supabase) {
  const wb = XLSX.utils.book_new();
  for (const cfg of MERLJIVE_IMPORT_SHEETS) {
    const { data, error } = await supabase.from(cfg.table).select("*");
    if (error) throw error;
    if (cfg.table === "karakteristike_merljive") {
      const cols = KARAKTERISTIKE_MERLJIVE_COLS;
      const sheet = rowsToExportSheet(data, cols);
      XLSX.utils.book_append_sheet(wb, sheet, cfg.sheet.slice(0, 31));
      continue;
    }
    const cols = data?.length ? Object.keys(data[0]) : [];
    const sheet = rowsToExportSheet(data, cols);
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

  const [kpiRows, nazivDelaMap] = await Promise.all([
    fetchKpiUnosZaIzvoz(supabase, {
      modul: "merljive",
      idDeo,
      datumOd,
      datumDo,
    }),
    fetchNaziviDelaMap(supabase, idDeo),
  ]);
  const kpiLookup = buildKpiLookup(kpiRows);
  const mapped = data.map((r) => mapMerenjeVarijabilnoZaIzvoz(r, { nazivDelaMap, kpiLookup }));

  const wb = XLSX.utils.book_new();
  const exportRows = mapped.map((r) => {
    const o = {};
    MERENJA_VARIJABILNA_EXPORT_COLS.forEach(([key, label]) => { o[label] = r[key] ?? ""; });
    return o;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "merenja_varijabilna");

  if (kpiRows.length) {
    const kpiExport = kpiRows.map((r) => {
      const o = { modul: r.modul, datum: r.datum, smena: r.smena, id_deo: r.id_deo, serija: r.serija, radni_nalog: r.radni_nalog, sesija_id: r.sesija_id };
      KPI_EXPORT_COLS.forEach(([key, label]) => { o[label] = r[key] ?? ""; });
      return o;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiExport), "kpi_unos");
  }
  return wb;
}

export async function uploadWorkbookToStorage(supabase, wb, path) {
  const buf = workbookToArrayBuffer(wb);
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
export async function mirrorKontrolniLogToExcel(supabase, newRows, { alsoDownload = false, kpi = null } = {}) {
  if (!newRows?.length) return { storage: false, download: false };

  const kpiFields = kpiPoljaIzForme(kpi);
  const enrichedRows = newRows.map((r) => ({ ...r, ...kpiFields }));

  const exportRows = rowsToExportRows(
    enrichedRows.map((r) => ({
      ...r,
      created_at: r.created_at || new Date().toISOString(),
    })),
    KONTROLNI_LOG_COLS,
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
    .select("datum,smena,radni_nalog,id_deo,naziv_dela,pogon_kod,greska_naziv,podkategorija,defekt,status,ok_kolicina,nok_kolicina,ukupno_merenja,komentar,sesija_id,created_at")
    .order("datum", { ascending: true })
    .order("created_at", { ascending: true });
  if (idDeo) q = q.eq("id_deo", idDeo);
  if (datumOd) q = q.gte("datum", datumOd);
  if (datumDo) q = q.lte("datum", datumDo);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return null;

  const kpiRows = await fetchKpiUnosZaIzvoz(supabase, {
    modul: "atributivne",
    idDeo,
    datumOd,
    datumDo,
  });
  const kpiLookup = buildKpiLookup(kpiRows);
  const mapped = data.map((r) => mapKontrolniLogZaIzvoz(r, { kpiLookup }));

  const wb = XLSX.utils.book_new();
  const exportRows = mapped.map((r) => {
    const o = {};
    KONTROLNI_LOG_EXPORT_COLS.forEach(([key, label]) => { o[label] = r[key] ?? ""; });
    return o;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "kontrolni_log");

  if (kpiRows.length) {
    const kpiExport = kpiRows.map((r) => {
      const o = { modul: r.modul, datum: r.datum, smena: r.smena, id_deo: r.id_deo, serija: r.serija, radni_nalog: r.radni_nalog, sesija_id: r.sesija_id };
      KPI_EXPORT_COLS.forEach(([key, label]) => { o[label] = r[key] ?? ""; });
      return o;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiExport), "kpi_unos");
  }
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
