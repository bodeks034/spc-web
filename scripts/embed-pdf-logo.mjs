/** Generiše mali PNG + base64 modul za PDF zaglavlje (bez fetch-a). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC = path.join(ROOT, "public");
const OUT_JS = path.join(ROOT, "src", "lib", "pdfLogoEmbedded.js");
const OUT_PNG = path.join(PUBLIC, "tri-core-qc-pdf.png");

async function main() {
  let sharp;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    // fallback: kopiraj favicon ako sharp nije instaliran
    const fav = path.join(PUBLIC, "favicon-32.png");
    const src = fs.existsSync(fav)
      ? fav
      : path.join(PUBLIC, "tri-core-qc-symbol.png");
    const buf = fs.readFileSync(src);
    fs.writeFileSync(OUT_PNG, buf);
    writeJs(buf);
    console.log("OK (bez sharp) — pdfLogoEmbedded.js");
    return;
  }

  const symbol = path.join(PUBLIC, "tri-core-qc-symbol.png");
  if (!fs.existsSync(symbol)) {
    throw new Error(`Nema ${symbol} — pokreni process-tri-core-logo.py`);
  }

  const buf = await sharp(symbol)
    .resize(160, 160, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  fs.writeFileSync(OUT_PNG, buf);
  writeJs(buf);
  console.log(`OK — tri-core-qc-pdf.png (${buf.length} B), pdfLogoEmbedded.js`);
}

function writeJs(buf) {
  const b64 = buf.toString("base64");
  fs.writeFileSync(
    OUT_JS,
    `/** Auto-generisano: npm run embed:pdf-logo */\nexport const PDF_LOGO_DATA_URL = "data:image/png;base64,${b64}";\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
