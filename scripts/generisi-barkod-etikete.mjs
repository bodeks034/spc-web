/**
 * Generiše QR i Code 128 etikete iz Excela ili CSV.
 *
 * Izvor (prioritet):
 *   1. excel-rad/Barkod_etikete.xlsx  (sheet barkodi)
 *   2. docs/barkodi_sadrzaj.csv
 *
 * Pokretanje: npm run barkodi
 * Samo Excel→CSV: npm run barkodi:sync
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import {
  grupisiPoDelu,
  readBarkodiCsv,
  readBarkodiXlsx,
  writeBarkodiCsv,
  writeBarkodiXlsx,
} from "./lib/barkodCsv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "barkodi");
const CSV_PATH = path.join(ROOT, "docs", "barkodi_sadrzaj.csv");
const XLSX_PATH = path.join(ROOT, "excel-rad", "Barkod_etikete.xlsx");

async function ucitajRedove() {
  try {
    await fs.access(XLSX_PATH);
    const redovi = await readBarkodiXlsx(XLSX_PATH);
    if (redovi.length) {
      console.log(`Izvor: ${XLSX_PATH} (${redovi.length} redova)`);
      await writeBarkodiCsv(CSV_PATH, redovi);
      console.log(`Sinhronizovano → ${CSV_PATH}`);
      return redovi;
    }
  } catch {
    /* Excel ne postoji */
  }

  const redovi = await readBarkodiCsv(CSV_PATH);
  console.log(`Izvor: ${CSV_PATH} (${redovi.length} redova)`);
  return redovi;
}

async function qrPng(text, outPath) {
  await QRCode.toFile(outPath, text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

async function code128Png(text, outPath) {
  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
    textsize: 10,
    paddingwidth: 8,
    paddingheight: 8,
  });
  await fs.writeFile(outPath, png);
}

function etiketaHtml({ id, naziv, tip, qrRel, codeRel, sadrzaj, opis, imaQr, imaCode }) {
  const qrBlok = imaQr && qrRel ? `
      <div class="blok">
        <img src="${qrRel}" alt="QR ${id}" />
        <div class="lbl">QR kod</div>
      </div>` : "";
  const codeBlok = imaCode && codeRel ? `
      <div class="blok">
        <img src="${codeRel}" alt="Code128 ${id}" class="code128" />
        <div class="lbl">Code 128</div>
      </div>` : "";

  return `
  <div class="etiketa">
    <div class="zaglavlje">
      <div class="id">${id}</div>
      <div class="naziv">${naziv}</div>
      <div class="tip">${tip === "vozilo" ? "Kontrola vozila" : "Kontrola dela"}</div>
    </div>
    <div class="kodovi">${qrBlok}${codeBlok}</div>
    <div class="sadrzaj"><strong>Sadržaj:</strong> <code>${sadrzaj}</code></div>
    <div class="opis">${opis}</div>
  </div>`;
}

async function main() {
  const syncOnly = process.argv.includes("--sync-only");
  const redovi = await ucitajRedove();
  const etikete = grupisiPoDelu(redovi);

  if (!etikete.length) {
    console.error("Nema aktivnih redova. Proverite excel-rad/Barkod_etikete.xlsx ili docs/barkodi_sadrzaj.csv");
    process.exit(1);
  }

  if (syncOnly) {
    console.log("Samo sinhronizacija CSV — završeno.");
    return;
  }

  await fs.mkdir(OUT, { recursive: true });
  const htmlDelovi = [];
  const ids = etikete.map(e => e.id).join(", ");

  for (const et of etikete) {
    const dir = path.join(OUT, et.id);
    await fs.mkdir(dir, { recursive: true });

    for (const k of et.kodovi) {
      const base = `${et.id}-${k.sufiks}`;
      let qrRel = null;
      let codeRel = null;

      if (k.qr) {
        const qrPath = path.join(dir, `${base}-qr.png`);
        await qrPng(k.sadrzaj, qrPath);
        qrRel = `${et.id}/${base}-qr.png`;
      }
      if (k.code128) {
        const codePath = path.join(dir, `${base}-code128.png`);
        await code128Png(k.sadrzaj, codePath);
        codeRel = `${et.id}/${base}-code128.png`;
      }

      htmlDelovi.push(etiketaHtml({
        id: et.id,
        naziv: et.naziv,
        tip: et.tip,
        qrRel,
        codeRel,
        sadrzaj: k.sadrzaj,
        opis: k.opis,
        imaQr: k.qr,
        imaCode: k.code128,
      }));

      console.log(`✓ ${base} → ${k.sadrzaj}`);
    }
  }

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8" />
  <title>SPC Web — etikete barkod</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 16px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p.note { font-size: 12px; color: #444; margin: 0 0 16px; }
    .grid { display: flex; flex-wrap: wrap; gap: 16px; }
    .etiketa {
      width: 90mm;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 8px;
      page-break-inside: avoid;
    }
    .zaglavlje { text-align: center; margin-bottom: 8px; }
    .id { font-size: 22px; font-weight: 800; letter-spacing: 1px; }
    .naziv { font-size: 11px; color: #333; }
    .tip { font-size: 9px; color: #666; text-transform: uppercase; }
    .kodovi { display: flex; gap: 8px; align-items: flex-start; justify-content: center; }
    .blok { text-align: center; flex: 1; min-width: 0; }
    .blok img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    .blok img.code128 { max-height: 52px; }
    .lbl { font-size: 8px; color: #666; margin-top: 4px; text-transform: uppercase; }
    .sadrzaj { font-size: 9px; margin-top: 8px; word-break: break-all; }
    .sadrzaj code { font-family: Consolas, monospace; background: #f4f4f4; padding: 1px 4px; }
    .opis { font-size: 8px; color: #666; margin-top: 2px; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
      .etiketa { margin: 4mm; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <h1>SPC Web — štampane etikete (${ids})</h1>
    <p class="note">Izvor: excel-rad/Barkod_etikete.xlsx · Ctrl+P → štampač etiketa (90×50 mm).</p>
  </div>
  <div class="grid">
    ${htmlDelovi.join("\n")}
  </div>
</body>
</html>`;

  const htmlPath = path.join(OUT, "etikete-stampa.html");
  await fs.writeFile(htmlPath, html, "utf8");
  console.log(`\nŠtampa: ${htmlPath}`);
}

async function seedExcel() {
  const redovi = await readBarkodiCsv(CSV_PATH);
  await writeBarkodiXlsx(XLSX_PATH, redovi);
  console.log(`Kreiran: ${XLSX_PATH}`);
}

if (process.argv.includes("--seed-excel")) {
  seedExcel().catch(e => { console.error(e); process.exit(1); });
} else {
  main().catch(e => { console.error(e); process.exit(1); });
}
