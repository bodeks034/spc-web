#!/usr/bin/env node
/**
 * Sinhronizuje ključne HTML ćelije u OBUKA_MODUL_SIFARNIK.html iz UPUTSTVO_MODUL_SIFARNIK.md.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MD = path.join(ROOT, "docs", "obuka-paket", "UPUTSTVO_MODUL_SIFARNIK.md");
const HTML = path.join(ROOT, "public", "obuka-paket", "OBUKA_MODUL_SIFARNIK.html");

function replaceBlock(html, marker, inner) {
  const start = `<!-- AUTO:${marker} -->`;
  const end = `<!-- /AUTO:${marker} -->`;
  const re = new RegExp(`${start}[\\s\\S]*?${end}`, "m");
  if (!re.test(html)) {
    console.warn(`patch-obuka: marker ${marker} nije pronađen — preskačem`);
    return html;
  }
  return html.replace(re, `${start}\n${inner}\n${end}`);
}

function izvuciObjaviOpis(md) {
  const m = md.match(/\|\s*\*\*Objavi u šifrarnik\*\*\s*\|\s*([^|]+)\|/);
  return m ? m[1].trim() : "Snima staging + propagacija (ili ponovo propagiraj ako nema izmena)";
}

function buildGlavniUnosCell(md) {
  const objavi = izvuciObjaviOpis(md);
  return [
    "ID deo, RN, kupac, dimenzije (nominal/LSL/USL), klasa, instrument.",
    `<strong>Objavi u šifrarnik</strong> — ${objavi}.`,
    "<strong>+ Novi deo</strong> (čarobnjak), grupni unos, final vozilo.",
    "Uvezi .xlsx (inženjerski format).",
  ].join(" ");
}

function buildDeloviCell(md) {
  const m = md.match(/\*\*Akcije:\*\* filter po tipu[\s\S]*?▦ barkod\./);
  if (!m) {
    return "id_deo, naziv, tip (deo/vozilo), kom za kontrolu, aktivan. Status badge. GU (n) → Glavni unos. Bulk brisanje DEMO ID.";
  }
  return m[0]
    .replace(/\*\*Akcije:\*\*\s*/, "")
    .replace(/\*\*GU \(n\)\*\*/g, "<strong>GU (n)</strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
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
  out = replaceBlock(out, "GLAVNI_UNOS_CELL", buildGlavniUnosCell(md));
  out = replaceBlock(out, "DELOVI_CELL", buildDeloviCell(md));

  if (out !== html) {
    await fs.writeFile(HTML, out, "utf8");
    console.log("patch-obuka: OBUKA_MODUL_SIFARNIK.html ažuriran");
  } else {
    console.log("patch-obuka: nema izmena");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
