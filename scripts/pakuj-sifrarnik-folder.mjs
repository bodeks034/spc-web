/**
 * Pakuje CSV + generiše Excel master fajlove u jedan folder.
 * node scripts/pakuj-sifrarnik-folder.mjs
 */
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { KARAKTERISTIKE_MERLJIVE_HEADER } from "../src/lib/karakteristikaMerljive.js";

const root = path.resolve(import.meta.dirname, "..");
const docs = path.join(root, "docs");
const out = path.join(root, "excel-rad", "sifrarnik-paket");

const ATRIBUTIVNI = [
  ["linije", "linije.csv"],
  ["masine", "masine.csv"],
  ["smene", "smene.csv"],
  ["greske_katalog", "greske_katalog.csv"],
  ["katalog_gresaka_vozilo", "katalog_gresaka_vozilo.csv"],
  ["delovi", "delovi.csv"],
  ["ciljevi", "ciljevi.csv"],
  ["radnici", "radnici.csv"],
  ["radni_nalozi", "radni_nalozi.csv"],
  ["kupci", "kupci.csv"],
  ["kontrolna_lista_stavke", "kontrolna_lista_stavke.csv"],
  ["merila", "merila.csv"],
  ["kalibracije", "kalibracije.csv"],
];

const MERLJIVE = [
  ["sop_deo_varijabilni", "sop_deo_varijabilni.csv"],
  ["karakteristike_merljive", "karakteristike_merljive.csv"],
  ["merenja_varijabilna", "merenja_varijabilna.csv"],
];

const KOPIRAJ_CSV = [
  ...ATRIBUTIVNI.map(([, f]) => f),
  ...MERLJIVE.map(([, f]) => f),
  "ciljevi.csv",
  "kupci.csv",
  "merila.csv",
  "kalibracije.csv",
  "barkodi_sadrzaj.csv",
  "erp_radni_nalozi.example.csv",
  "deo_rucni.csv",
];

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function csvToObjects(csvPath) {
  const txt = readFileSync(csvPath, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

function csvToSheet(csvPath) {
  const txt = readFileSync(csvPath, "utf8");
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return XLSX.utils.aoa_to_sheet([]);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
  return XLSX.utils.json_to_sheet(rows, { header: headers });
}

function definicijaSheetFromKarCsv() {
  return null;
}

async function buildWorkbook(pairs, outName, { extraSheets = [] } = {}) {
  const wb = XLSX.utils.book_new();
  for (const [sheet, file] of pairs) {
    const p = path.join(docs, file);
    try {
      await fs.access(p);
      XLSX.utils.book_append_sheet(wb, csvToSheet(p), sheet.slice(0, 31));
    } catch {
      console.warn(`  preskačem (nema): ${file}`);
    }
  }
  for (const [sheetName, sheetObj] of extraSheets) {
    if (sheetObj) XLSX.utils.book_append_sheet(wb, sheetObj, sheetName.slice(0, 31));
  }
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const target = path.join(out, outName);
  try {
    await fs.writeFile(target, buf);
    console.log(`  ${outName}`);
  } catch (e) {
    if (e?.code === "EBUSY") {
      const alt = outName.replace(/\.xlsx$/i, "_novo.xlsx");
      await fs.writeFile(path.join(out, alt), buf);
      console.warn(`  ${outName} zaključan — upisano: ${alt}`);
    } else {
      throw e;
    }
  }
}

const README = `# SPC — šifrarnik paket (jedan folder)

Generisano: scripts/pakuj-sifrarnik-folder.mjs

## Gde unosiš šta — aplikacija vs Excel

| Podatak | Gde POPUNJAVAŠ (Excel/CSV) | Gde koristi aplikacija |
|---------|---------------------------|------------------------|
| **ID dela** | \`delovi\` tab / delovi.csv | Unos: skeniraš/kucaš ID; baza: delovi |
| **RN (radni nalog)** | \`radni_nalozi\` + \`sop_deo_varijabilni\` | Unos: polje RN ili barkod; auto iz baze po delu |
| **Kontrolor** | \`radnici\` (ime, email, uloga) | **Ne kucaš** — uzima se od prijavljenog korisnika |
| **Kom za kontrolu (N)** | \`delovi\` kolona *kom za kontrolu n* | Atributivne: koliko merenja u seriji |
| **USL / LSL** | \`karakteristike_merljive\` | **Samo merljive** — pri unosu merenja |
| **Greške OK/NOK** | \`greske_katalog\` | Atributivne: dropdown pri unosu |
| **Ček lista** | \`kontrolna_lista_stavke\` | Pre unosa na liniji |

### Tok rada

1. **Izmeni Excel** u ovom folderu (ili CSV pa ponovo pokreni pakuj skriptu).
2. **Uvezi u bazu:** Admin Panel → Uvezi iz Excela  
   - Atributivne: \`SPC_master_atributivne.xlsx\`  
   - Merljive: \`SPC_merljive.xlsx\`
3. **Ili CSV:** \`npm run import:docs\` (iz docs/ u korenu projekta)
4. **Svakodnevni unos** — u aplikaciji (modul Atributivne / Merljive), ne u Excelu.

---

## Excel fajlovi u ovom folderu

| Fajl | Tabovi | Namena |
|------|--------|--------|
| **SPC_master_atributivne.xlsx** | 9 tabova | Linije, mašine, delovi, RN, radnici, greške, ček lista |
| **SPC_merljive.xlsx** | 3 taba | SOP dela, **karakteristike_merljive** (jedini izvor), istorija merenja |
| **SPC_merljive_demo_5501_5503.xlsx** | demo | Primer merljivog unosa (ako postoji) |

## CSV kopije (isti sadržaj)

${KOPIRAJ_CSV.map((f) => `- ${f}`).join("\n")}

## Tačni nazivi tabova (mora biti isto!)

Atributivne: linije, masine, smene, greske_katalog, katalog_gresaka_vozilo, delovi, radnici, radni_nalozi, kontrolna_lista_stavke

Merljive: sop_deo_varijabilni, karakteristike_merljive, merenja_varijabilna

### karakteristike_merljive — jedini izvor (popuni meta na prvom redu grupe po pogonu)
${KARAKTERISTIKE_MERLJIVE_HEADER.join(", ")}

**Pravilo:** kolona \`merni_instrument\` = Vizuelno / Dokumentacija → automatski u **atributivne**; ostalo → **merljive**.

## Kolone koje te zanimaju

### radni_nalozi (RN)
radni nal, id dela, naziv dela, količina, kupac, status

### radnici (kontrolor)
ime i prezime, uloga=kontrolor, email (isti kao Supabase Auth)

### delovi (deo + kom za kontrolu)
id dela, naziv dela, linija id, masina id, kom za kontrolu n

### karakteristike_merljive (USL / LSL)
id_deo, pozicija, nominala, usl, lsl, usl_text, lsl_text, jedinica

### sop_deo_varijabilni (RN + kontrolor po delu — merljive)
id_deo, radni_nalog, kontrolor_ime, broj_merenja

---

Detaljnije: docs/UPUTSTVO_SIFARNIK_I_EXCEL.md
`;

async function main() {
  await fs.mkdir(path.join(out, "csv"), { recursive: true });
  console.log("Folder:", out);

  for (const f of KOPIRAJ_CSV) {
    try {
      await fs.copyFile(path.join(docs, f), path.join(out, "csv", f));
    } catch {
      console.warn(`  nema csv: ${f}`);
    }
  }

  console.log("\nExcel:");
  await buildWorkbook(ATRIBUTIVNI, "SPC_master_atributivne.xlsx");
  await buildWorkbook(MERLJIVE, "SPC_merljive.xlsx");

  const demo = path.join(root, "public", "SPC_merljive_demo_5501_5503.xlsx");
  try {
    await fs.copyFile(demo, path.join(out, "SPC_merljive_demo_5501_5503.xlsx"));
    console.log("  SPC_merljive_demo_5501_5503.xlsx (kopija)");
  } catch { /* */ }

  await fs.writeFile(path.join(out, "CITAJ_ME.md"), README, "utf8");
  console.log("\nGotovo:", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
