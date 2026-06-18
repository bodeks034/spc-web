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
    .replace(/š/gi, "s")
    .replace(/č/gi, "c")
    .replace(/ć/gi, "c")
    .replace(/ž/gi, "z")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export function parseCsvLine(line) {
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
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseCsvText(txt) {
  const lines = String(txt || "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => normHeader(h));
  return lines.slice(1).map((line, idx) => {
    const cols = parseCsvLine(line);
    const row = { _linija: idx + 2 };
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  }).filter((row) => Object.entries(row).some(([k, v]) => k !== "_linija" && v !== ""));
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return "";
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function normalizujDatum(v) {
  if (!v) return null;
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const sr = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (sr) {
    return `${sr[3]}-${String(sr[2]).padStart(2, "0")}-${String(sr[1]).padStart(2, "0")}`;
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
