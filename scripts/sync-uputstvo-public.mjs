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

async function copyTree(srcDir, destDir, synced) {
  await fs.mkdir(destDir, { recursive: true });
  let n = 0;
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(srcDir, ent.name);
    const destPath = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      const sub = await copyTree(srcPath, destPath, synced);
      n += sub;
    } else if (ent.isFile()) {
      await fs.copyFile(srcPath, destPath);
      synced.add(path.relative(DEST, destPath).split(path.sep).join("/"));
      n += 1;
    }
  }
  return n;
}

async function pruneTree(dir, synced, base = dir) {
  let uklonjeno = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(base, full).split(path.sep).join("/");
    if (ent.isDirectory()) {
      uklonjeno += await pruneTree(full, synced, base);
      try {
        const left = await fs.readdir(full);
        if (!left.length) await fs.rmdir(full);
      } catch {
        /* ignore */
      }
    } else if (!synced.has(rel)) {
      await fs.rm(full, { force: true });
      uklonjeno += 1;
    }
  }
  return uklonjeno;
}

async function main() {
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
  if (!entries.length) {
    console.error("sync-uputstvo: docs/obuka-paket/ je prazan");
    process.exit(1);
  }

  const synced = new Set();
  const n = await copyTree(SRC, DEST, synced);
  const uklonjeno = await pruneTree(DEST, synced);

  // Stari public/uputstvo više nije u upotrebi
  const legacy = path.join(ROOT, "public", "uputstvo");
  try {
    await fs.rm(legacy, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log(`sync-uputstvo: ${n} fajlova → public/obuka-paket/${uklonjeno ? `, uklonjeno ${uklonjeno} zastarelih` : ""}`);

  const { spawnSync } = await import("node:child_process");
  const patch = path.join(ROOT, "scripts", "patch-obuka-sifrarnik-html.mjs");
  const pr = spawnSync(process.execPath, [patch], { cwd: ROOT, stdio: "inherit" });
  if (pr.status !== 0) process.exit(pr.status || 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
