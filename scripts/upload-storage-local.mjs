/**
 * Upload fajlova iz backup/storage/ u lokalni (ili bilo koji) Supabase Storage.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SRC = path.resolve("backup", "storage");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function main() {
  let buckets;
  try {
    buckets = await fs.readdir(SRC);
  } catch {
    console.error(`Nema foldera ${SRC} — prvo pokreni download-supabase-storage.mjs`);
    process.exit(1);
  }

  for (const bucket of buckets) {
    const bucketDir = path.join(SRC, bucket);
    const stat = await fs.stat(bucketDir);
    if (!stat.isDirectory()) continue;
    const files = await walk(bucketDir);
    console.log(`${bucket}: upload ${files.length} fajlova`);
    for (const full of files) {
      const rel = path.relative(bucketDir, full).replace(/\\/g, "/");
      const body = await fs.readFile(full);
      const { error } = await supabase.storage.from(bucket).upload(rel, body, { upsert: true });
      if (error) console.warn(`  ${rel}: ${error.message}`);
      else console.log(`  ${rel}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
