import fs from "node:fs/promises";
import path from "node:path";

/** Učitaj KEY=VALUE iz .env fajla (ne prepisuje postojeće process.env). */
export async function loadEnvFile(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return false;
  }

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"'))
      || (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  });

  return true;
}

/** Probaj .env.erp pa .env.local u korenu projekta. */
export async function loadEnvZaSkripte(root) {
  const files = [
    path.join(root, ".env.erp"),
    path.join(root, ".env.local"),
  ];
  for (const f of files) {
    await loadEnvFile(f);
  }
}
