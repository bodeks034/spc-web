import { pogonIzRn } from "./pogonSop.js";

/**
 * Uvoz radnih naloga iz ERP CSV — zajednički parser (UI + scripts).
 */

export const ERP_CSV_KOLONE = [
  "broj_naloga / radni nal / RN",
  "id_deo / id dela*",
  "pogon_kod (A–H, opciono — ili sufiks RN npr. -B)",
  "naziv_dela (opciono)",
  "kolicina",
  "kupac",
  "datum_unosa",
  "rok_isporuke",
  "status (aktivan|zavrsen|otkazan)",
  "operater",
  "napomena",
];

const STATUS_MAP = {
  aktivan: "aktivan",
  active: "aktivan",
  otvoren: "aktivan",
  open: "aktivan",
  zavrsen: "zavrsen",
  završen: "zavrsen",
  closed: "zavrsen",
  gotov: "zavrsen",
  otkazan: "otkazan",
  cancelled: "otkazan",
  canceled: "otkazan",
};

export function normHeader(h) {
  return String(h || "")
    .trim()
    .replace(/\*+$/, "")
    .replace(/([a-z0-9šđčćž])([A-ZŠĐČĆŽ])/g, "$1_$2")
    .replace(/š/gi, "s")
    .replace(/č/gi, "c")
    .replace(/ć/gi, "c")
    .replace(/ž/gi, "z")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function parseCsvLine(line, delimiter = ",") {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function brojDelimiterVanNavodnika(line, delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < String(line || "").length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") i += 1;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && ch === delimiter) {
      count += 1;
    }
  }
  return count;
}

export function detektujCsvDelimiter(headerLine) {
  const kandidati = [",", ";", "\t"];
  return kandidati
    .map((delimiter) => ({ delimiter, count: brojDelimiterVanNavodnika(headerLine, delimiter) }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ",";
}

export function parseCsvText(txt) {
  const normalized = String(txt || "").replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delimiter = detektujCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((h) => normHeader(h));
  return lines.slice(1).map((line, idx) => {
    const cols = parseCsvLine(line, delimiter);
    const row = { _linija: idx + 2 };
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  }).filter((row) => Object.entries(row).some(([k, v]) => k !== "_linija" && v !== ""));
}

function pick(row, ...keys) {
  for (const k of keys) {
    const key = normHeader(k);
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizuj datum iz ERP/CSV/XLSX u ISO YYYY-MM-DD.
 * Podržava: ISO, DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY,
 * Excel serijal (npr. 45822) i Date objekat iz sheet_to_csv/xlsx.
 * Ambiguous 01/02/2026 → evropski DD/MM (fabrički default).
 */
export function normalizujDatum(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && Number.isFinite(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(v).trim();
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Excel serijal (ceo broj dana od 1899-12-30)
  if (/^\d{4,6}(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (Number.isFinite(serial) && serial >= 20000 && serial <= 80000) {
      const epoch = Date.UTC(1899, 11, 30);
      const dt = new Date(epoch + Math.round(serial) * 86400000);
      if (Number.isFinite(dt.getTime())) {
        return [
          dt.getUTCFullYear(),
          String(dt.getUTCMonth() + 1).padStart(2, "0"),
          String(dt.getUTCDate()).padStart(2, "0"),
        ].join("-");
      }
    }
  }

  const tacka = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (tacka) {
    return `${tacka[3]}-${String(tacka[2]).padStart(2, "0")}-${String(tacka[1]).padStart(2, "0")}`;
  }

  const sep = s.match(/^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/);
  if (sep) {
    const a = Number(sep[1]);
    const b = Number(sep[3]);
    const y = sep[4];
    // Ako jedan deo > 12, nedvosmisleno je dan
    if (a > 12 && b <= 12) {
      return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    if (b > 12 && a <= 12) {
      return `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    }
    // Ambiguous / evropski default: DD/MM/YYYY
    return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }

  return s || null;
}

export function normalizujStatus(v) {
  const key = String(v || "aktivan").trim().toLowerCase();
  return STATUS_MAP[key] || (key === "" ? "aktivan" : key);
}

/** Jedan CSV red → red za tabelu radni_nalozi. */
export function mapRadniNalogRed(row) {
  const broj = pick(
    row,
    "broj_naloga",
    "radni nal",
    "radni_nalog",
    "rn",
    "nalog",
    "order",
    "order_no",
    "auftrag",
  );
  const idDeo = pick(row, "id_deo", "id dela", "id dela*", "id_dela", "sifra_dela", "part_id");
  if (!broj || !idDeo) {
    return {
      ok: false,
      greska: `Linija ${row._linija || "?"}: nedostaje broj naloga ili ID dela`,
    };
  }

  const brojNorm = String(broj).trim().toUpperCase();
  const pogonRaw = pick(row, "pogon_kod", "pogon", "pogon kod");
  const pogon_kod = pogonRaw
    ? String(pogonRaw).trim().toUpperCase()
    : pogonIzRn(brojNorm);

  const statusRaw = pick(row, "status");

  return {
    ok: true,
    row: {
      broj_naloga: brojNorm,
      id_deo: String(idDeo).trim().toUpperCase(),
      pogon_kod: pogon_kod || null,
      naziv_dela: pick(row, "naziv_dela", "naziv dela", "naziv", "opis") || null,
      kolicina: num(pick(row, "kolicina", "količina", "qty", "quantity", "kom")),
      kupac: pick(row, "kupac", "customer", "klijent") || null,
      datum_unosa: normalizujDatum(pick(row, "datum_unosa", "datum unosa", "datum")),
      rok_isporuke: normalizujDatum(pick(row, "rok_isporuke", "rok isporuke", "rok", "due_date")),
      status: statusRaw ? normalizujStatus(statusRaw) : null,
      operater: pick(row, "operater", "operator") || null,
      napomena: pick(row, "napomena", "note", "notes") || null,
    },
  };
}

const MERGE_POLJA = [
  "naziv_dela",
  "kolicina",
  "kupac",
  "datum_unosa",
  "rok_isporuke",
  "operater",
  "napomena",
  "pogon_kod",
  "status",
];

/** Pri dnevnom uvozu — ne briši postojeće vrednosti praznim ERP poljima. */
export function spojiSaPostojecim(postojeci, novi) {
  if (!postojeci) {
    return {
      ...novi,
      status: novi.status ?? "aktivan",
    };
  }
  const out = { ...novi };
  for (const polje of MERGE_POLJA) {
    if (out[polje] == null || out[polje] === "") {
      if (postojeci[polje] != null && postojeci[polje] !== "") {
        out[polje] = postojeci[polje];
      }
    }
  }
  if (out.status == null) out.status = postojeci.status ?? "aktivan";
  return out;
}

/** Parsiraj ceo CSV tekst → { redovi, greske, ukupno }. */
export function parsirajRadniNaloziCsv(txt) {
  const sirovi = parseCsvText(txt);
  const redovi = [];
  const greske = [];
  const seen = new Set();

  sirovi.forEach((r) => {
    const mapped = mapRadniNalogRed(r);
    if (!mapped.ok) {
      greske.push(mapped.greska);
      return;
    }
    const key = mapped.row.broj_naloga;
    if (seen.has(key)) {
      greske.push(`Duplikat RN ${key} (linija ${r._linija}) — poslednji red važi`);
      const idx = redovi.findIndex((x) => x.broj_naloga === key);
      if (idx >= 0) redovi[idx] = mapped.row;
      return;
    }
    seen.add(key);
    redovi.push(mapped.row);
  });

  return {
    redovi,
    greske,
    ukupno: sirovi.length,
    validnih: redovi.length,
  };
}

export async function sinhronizujKupce(supabase, redovi) {
  const kupci = [...new Set((redovi || []).map((r) => r.kupac).filter(Boolean))];
  if (!kupci.length) return { ok: true, broj: 0 };

  const { error } = await supabase
    .from("kupci")
    .upsert(kupci.map((naziv) => ({ naziv, aktivan: true })), { onConflict: "naziv" });
  if (error) return { ok: false, error };
  return { ok: true, broj: kupci.length };
}

export async function upsertRadniNalozi(supabase, redovi, { syncKupci = true, mergeNulls = false } = {}) {
  if (!redovi?.length) {
    return { ok: false, error: new Error("Nema validnih redova za uvoz.") };
  }

  let rows = redovi.map((r) => ({
    ...r,
    status: r.status ?? "aktivan",
  }));

  if (mergeNulls) {
    const brojevi = rows.map((r) => r.broj_naloga);
    const { data: postojeci } = await supabase
      .from("radni_nalozi")
      .select("*")
      .in("broj_naloga", brojevi);
    const byBroj = Object.fromEntries((postojeci || []).map((r) => [r.broj_naloga, r]));
    rows = rows.map((r) => spojiSaPostojecim(byBroj[r.broj_naloga], r));
  }

  if (syncKupci) {
    const k = await sinhronizujKupce(supabase, rows);
    if (!k.ok) return { ok: false, error: k.error };
  }

  const batchSize = 100;
  let upsertovano = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("radni_nalozi")
      .upsert(batch, { onConflict: "broj_naloga" });
    if (error) return { ok: false, error, upsertovano };
    upsertovano += batch.length;
  }

  return { ok: true, upsertovano };
}
