#!/usr/bin/env node
/**
 * Izvlači sve .docx iz docs/knowledge/primeri-8d/word/ → izvuceno-iz-word.txt
 * Zatim pokreće build-primeri-iz-word.mjs → primeri-8d.json
 *
 * npm run build:primeri-8d:word
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORD_DIR = path.join(ROOT, "docs/knowledge/primeri-8d/word");
const OUT_TXT = path.join(ROOT, "docs/knowledge/primeri-8d/izvuceno-iz-word.txt");
const BUILD_SCRIPT = path.join(ROOT, "scripts/build-primeri-iz-word.mjs");

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

async function extractDocx(docxPath) {
  const tmpZip = path.join(ROOT, `.tmp-8d-${path.basename(docxPath, ".docx")}.zip`);
  const tmpDir = path.join(ROOT, `.tmp-8d-${path.basename(docxPath, ".docx")}`);
  await fs.copyFile(docxPath, tmpZip);
  execSync(
    `powershell -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpDir}' -Force"`,
    { stdio: "pipe" },
  );
  const xml = await fs.readFile(path.join(tmpDir, "word/document.xml"), "utf8");
  const paragraphs = [];
  const pRe = /<w:p[\s>][\s\S]*?<\/w:p>/g;
  let pm;
  while ((pm = pRe.exec(xml)) !== null) {
    const texts = [];
    const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let tm;
    while ((tm = tRe.exec(pm[0])) !== null) texts.push(decodeEntities(tm[1]));
    const line = texts.join("").trim();
    if (line) paragraphs.push(line);
  }
  await fs.rm(tmpZip, { force: true }).catch(() => {});
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  return paragraphs;
}

async function main() {
  const names = await fs.readdir(WORD_DIR).catch(() => []);
  const docxFiles = names
    .filter((n) => n.toLowerCase().endsWith(".docx") && !n.startsWith("~$"))
    .sort();

  if (!docxFiles.length) {
    console.error(`Nema .docx u ${path.relative(ROOT, WORD_DIR)}`);
    console.error("Stavite Word 8D izveštaje u taj folder pa ponovo pokrenite.");
    process.exit(1);
  }

  const chunks = [];
  for (const name of docxFiles) {
    const full = path.join(WORD_DIR, name);
    console.log(`→ ${name}`);
    const paras = await extractDocx(full);
    console.log(`  ${paras.length} pasusa`);
    chunks.push(...paras);
    chunks.push("");
  }

  await fs.writeFile(OUT_TXT, chunks.join("\n"), "utf8");
  console.log(`\n✓ ${docxFiles.length} dokumenata → ${path.relative(ROOT, OUT_TXT)}`);

  const r = spawnSync(process.execPath, [BUILD_SCRIPT], { stdio: "inherit", cwd: ROOT });
  process.exit(r.status ?? 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
