import XLSX from "xlsx";

const path = "C:/Users/dejan/Downloads/NCR_Registar_i_Obrazac_v2.xlsx";
const wb = XLSX.readFile(path);
console.log("Sheets:", wb.SheetNames);
for (const name of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" });
  console.log(`\n=== ${name} (${rows.length} rows) ===`);
  rows.forEach((row, i) => {
    const cells = row.map((c) => String(c ?? "").trim()).filter(Boolean);
    if (cells.length) console.log(`${i + 1}:`, cells.join(" | "));
  });
}
