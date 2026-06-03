import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
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

function normalizeRow(table, row) {
  const copy = { ...row };
  if (copy.id_deo) copy.id_deo = copy.id_deo.trim().toUpperCase();
  if (copy.broj_naloga) copy.broj_naloga = copy.broj_naloga.trim().toUpperCase();
  if (table === "defekti" && typeof copy.aktivan === "string") {
    copy.aktivan = ["1", "true", "da", "yes"].includes(copy.aktivan.trim().toLowerCase());
  }
  Object.keys(copy).forEach((k) => {
    if (copy[k] === "") copy[k] = null;
  });
  return copy;
}

async function parseCsvFile(filePath, table) {
  const abs = path.resolve(filePath);
  const txt = await fs.readFile(abs, "utf8");
  const lines = txt.split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length < 2) throw new Error("CSV mora imati header + najmanje 1 red.");
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (cols[i] ?? "").trim();
    });
    return normalizeRow(table, row);
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const table = args.table;
  const file = args.file;
  const onConflict = args.onConflict;
  const batchSize = Number(args.batchSize || 500);

  if (!table || !file || !onConflict) {
    throw new Error("Usage: node scripts/import-csv-to-supabase.mjs --table <tabela> --file <csv> --onConflict <kol1,kol2>");
  }

  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Nedostaje SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY.");
  }

  const rows = await parseCsvFile(file, table);
  if (!rows.length) {
    console.log("Nema redova za import.");
    return;
  }

  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
  let imported = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, {
      onConflict,
      ignoreDuplicates: false,
    });
    if (error) throw error;
    imported += batch.length;
    console.log(`Upsert batch: ${imported}/${rows.length}`);
  }

  console.log(`Završeno. Upsertovano redova: ${imported}`);
}

main().catch((err) => {
  console.error("Import greška:", err.message);
  process.exit(1);
});
