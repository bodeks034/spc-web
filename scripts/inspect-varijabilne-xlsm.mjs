import XLSX from "xlsx";
import path from "node:path";

const file = path.resolve("docs/Varijabilne_SPC.xlsm");
const wb = XLSX.readFile(file, { cellFormula: true, bookVBA: true });

console.log("FILE:", file);
console.log("SHEETS:", wb.SheetNames.join(" | "));

if (wb.vbaraw) {
  console.log("\nVBA modules:", Object.keys(wb.vbaraw));
}

const focus = process.argv.slice(2);
const names = focus.length ? focus : wb.SheetNames;

for (const name of names) {
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  console.log(`\n=== ${name} (${rows.length} rows) ===`);
  rows.slice(0, 30).forEach((row, i) => {
    const preview = row.slice(0, 18).map(c => String(c).substring(0, 40));
    console.log(`${String(i + 1).padStart(3)}`, preview.join(" | "));
  });
  if (rows.length > 30) console.log(`... +${rows.length - 30} rows`);
}

// Named ranges / refs if any
if (wb.Workbook?.Names?.length) {
  console.log("\nNAMED RANGES:");
  wb.Workbook.Names.forEach(n => console.log(" ", n.Name, "→", n.Ref));
}
