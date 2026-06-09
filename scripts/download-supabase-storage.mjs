/**
 * Preuzmi sve fajlove iz Storage bucket-a na disk.
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["spc-crtezi", "spc-excel-sync"];
const OUT = path.resolve("backup", "storage");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY (service_role iz Dashboard → API).");
  process.exit(1);
}

const supabase = createClient(url, key);

async function listAll(bucket, prefix = "") {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      const p = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id == null && !item.metadata) {
        out.push(...(await listAll(bucket, p)));
      } else {
        out.push(p);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

async function downloadBucket(bucket) {
  const destRoot = path.join(OUT, bucket);
  await fs.mkdir(destRoot, { recursive: true });
  const files = await listAll(bucket);
  console.log(`${bucket}: ${files.length} fajlova`);
  for (const rel of files) {
    const { data, error } = await supabase.storage.from(bucket).download(rel);
    if (error) {
      console.warn(`  preskačem ${rel}: ${error.message}`);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    const full = path.join(destRoot, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buf);
    console.log(`  ${rel}`);
  }
}

for (const b of BUCKETS) {
  await downloadBucket(b);
}
console.log(`\nSačuvano u ${OUT}`);
