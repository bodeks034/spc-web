#!/usr/bin/env node
/**
 * Kopira docs/obuka-paket → public/obuka-paket za pregled u aplikaciji.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "docs", "obuka-paket");
const DEST = path.join(ROOT, "public", "obuka-paket");

async function main() {
  await fs.mkdir(DEST, { recursive: true });
  let entries;
  try {
    entries = await fs.readdir(SRC);
  } catch (e) {
    if (e.code === "ENOENT") {
      console.error("sync-uputstvo: nema docs/obuka-paket/");
      process.exit(1);
    }
    throw e;
  }

  let n = 0;
  for (const name of entries) {
    const srcPath = path.join(SRC, name);
    const st = await fs.stat(srcPath);
    if (!st.isFile()) continue;
    await fs.copyFile(srcPath, path.join(DEST, name));
    n += 1;
  }

  // Stari public/uputstvo više nije u upotrebi
  const legacy = path.join(ROOT, "public", "uputstvo");
  try {
    await fs.rm(legacy, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log(`sync-uputstvo: ${n} fajlova → public/obuka-paket/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
