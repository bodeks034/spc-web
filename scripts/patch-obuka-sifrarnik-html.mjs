#!/usr/bin/env node
/**
 * Sinhronizuje OBUKA_MODUL_SIFARNIK.html iz SYNC blokova u UPUTSTVO_MODUL_SIFARNIK.md (§X).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MD = path.join(ROOT, "docs", "obuka-paket", "UPUTSTVO_MODUL_SIFARNIK.md");
const HTML = path.join(ROOT, "public", "obuka-paket", "OBUKA_MODUL_SIFARNIK.html");

const MARKERS = [
  "GRUPA_OSNovNO",
  "ERP_TOK_FLOW",
  "NOVI_DEO_TOK",
  "GLAVNI_UNOS_CELL",
  "POGON_MAPA_CELL",
  "ODRZAVANJE_CELL",
  "DELOVI_CELL",
  "ERP_UVOZ_CELL",
];

function readSyncBlock(md, id) {
  const re = new RegExp(`<!-- SYNC:${id} -->\\s*([\\s\\S]*?)\\s*<!-- /SYNC:${id} -->`, "m");
  const m = md.match(re);
  return m ? m[1].trim() : null;
}

function mdInlineToHtml(text) {
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function replaceBlock(html, marker, inner) {
  const start = `<!-- AUTO:${marker} -->`;
  const end = `<!-- /AUTO:${marker} -->`;
  const re = new RegExp(`${start}[\\s\\S]*?${end}`, "gm");
  if (!re.test(html)) {
    console.warn(`patch-obuka: marker AUTO:${marker} nije u HTML — preskačem`);
    return html;
  }
  return html.replace(re, `${start}\n${inner}\n${end}`);
}

async function main() {
  let md;
  let html;
  try {
    md = await fs.readFile(MD, "utf8");
  } catch {
    console.warn("patch-obuka: nema UPUTSTVO_MODUL_SIFARNIK.md");
    return;
  }
  try {
    html = await fs.readFile(HTML, "utf8");
  } catch {
    console.warn("patch-obuka: nema OBUKA_MODUL_SIFARNIK.html u public/");
    return;
  }

  let out = html;
  let n = 0;
  for (const id of MARKERS) {
    const raw = readSyncBlock(md, id);
    if (!raw) {
      console.warn(`patch-obuka: nema SYNC:${id} u MD`);
      continue;
    }
    const inner = id.endsWith("_FLOW") || id.endsWith("_TOK")
      ? raw
      : mdInlineToHtml(raw);
    const next = replaceBlock(out, id, inner);
    if (next !== out) n += 1;
    out = next;
  }

  if (out !== html) {
    await fs.writeFile(HTML, out, "utf8");
    console.log(`patch-obuka: ažurirano ${n} blokova u OBUKA_MODUL_SIFARNIK.html`);
  } else {
    console.log("patch-obuka: nema izmena");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
