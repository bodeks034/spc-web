#!/usr/bin/env node
/** Generiše DejaVu Sans base64 za srpsku latinicu u PDF (jsPDF). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TTF = path.join(ROOT, "node_modules/dejavu-fonts-ttf/ttf");

function b64(ime) {
  return fs.readFileSync(path.join(TTF, ime)).toString("base64");
}

const out = `/** Auto-generisano — DejaVu Sans (srpska latinica). npm run font:pdf */
export const DEJAVU_SANS_NORMAL_B64 = ${JSON.stringify(b64("DejaVuSans.ttf"))};
export const DEJAVU_SANS_BOLD_B64 = ${JSON.stringify(b64("DejaVuSans-Bold.ttf"))};
export const PDF_FONT_SR = "DejaVuSans";
`;

const dest = path.join(ROOT, "src/lib/pdfFontDejaVuData.js");
fs.writeFileSync(dest, out, "utf8");
const kb = Math.round(fs.statSync(dest).size / 1024);
console.log(`✓ ${dest} (${kb} KB)`);
