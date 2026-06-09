/**
 * Uvoz radnih naloga iz ERP CSV — zajednički parser (UI + scripts).
 */

export const ERP_CSV_KOLONE = [
  "broj_naloga / radni nal / RN",
  "id_deo / id dela*",
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

  return {
    ok: true,
    row: {
      broj_naloga: String(broj).trim().toUpperCase(),
      id_deo: String(idDeo).trim().toUpperCase(),
      naziv_dela: pick(row, "naziv_dela", "naziv dela", "naziv", "opis") || null,
      kolicina: num(pick(row, "kolicina", "količina", "qty", "quantity", "kom")),
      kupac: pick(row, "kupac", "customer", "klijent") || null,
      datum_unosa: normalizujDatum(pick(row, "datum_unosa", "datum unosa", "datum")),
      rok_isporuke: normalizujDatum(pick(row, "rok_isporuke", "rok isporuke", "rok", "due_date")),
      status: normalizujStatus(pick(row, "status")),
      operater: pick(row, "operater", "operator") || null,
      napomena: pick(row, "napomena", "note", "notes") || null,
    },
  };
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

export async function upsertRadniNalozi(supabase, redovi, { syncKupci = true } = {}) {
  if (!redovi?.length) {
    return { ok: false, error: new Error("Nema validnih redova za uvoz.") };
  }

  if (syncKupci) {
    const k = await sinhronizujKupce(supabase, redovi);
    if (!k.ok) return { ok: false, error: k.error };
  }

  const batchSize = 100;
  let upsertovano = 0;
  for (let i = 0; i < redovi.length; i += batchSize) {
    const batch = redovi.slice(i, i + batchSize);
    const { error } = await supabase
      .from("radni_nalozi")
      .upsert(batch, { onConflict: "broj_naloga" });
    if (error) return { ok: false, error, upsertovano };
    upsertovano += batch.length;
  }

  return { ok: true, upsertovano };
}
