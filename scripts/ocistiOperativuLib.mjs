/**
 * Zajednička logika za čišćenje operativnih podataka (pun SQL skript).
 * Koriste: npm skripta, Vercel admin API.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const REZIMI_OCISTI = {
  pun: {
    fajl: "ocisti-operativu-pre-go-live.sql",
    naziv: "pun (briše i NCR/8D/PFMEA operativu)",
  },
  qms: {
    fajl: "ocisti-operativu-zadrzi-qms.sql",
    naziv: "zadrži PFMEA/8D šablone",
  },
};

export async function getPgClient(dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL) {
  if (!dbUrl) {
    throw new Error("Nedostaje DATABASE_URL ili SUPABASE_DB_URL");
  }
  let pg;
  try {
    pg = await import("pg");
  } catch {
    throw new Error("Paket pg nije instaliran");
  }
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("supabase") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  return client;
}

/**
 * @param {{ zadrziQms?: boolean, dbUrl?: string }} opts
 */
export async function runOcistiOperativu({ zadrziQms = false, dbUrl } = {}) {
  const rezim = zadrziQms ? "qms" : "pun";
  const cfg = REZIMI_OCISTI[rezim];
  const sqlFile = path.join(ROOT, "scripts", cfg.fajl);
  if (!fs.existsSync(sqlFile)) {
    throw new Error(`Nedostaje fajl: scripts/${cfg.fajl}`);
  }

  const sql = fs.readFileSync(sqlFile, "utf8");
  const client = await getPgClient(dbUrl);
  try {
    await client.query(sql);
    return {
      ok: true,
      rezim: cfg.naziv,
      poruka: zadrziQms
        ? "Operativni podaci obrisani (NCR/8D/PFMEA dokumenti zadržani)."
        : "Operativni podaci obrisani (uključujući NCR/8D/PFMEA).",
      zadrziQms: !!zadrziQms,
    };
  } finally {
    await client.end();
  }
}
