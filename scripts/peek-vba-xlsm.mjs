import XLSX from "xlsx";

const wb = XLSX.readFile("docs/Varijabilne_SPC.xlsm", { bookVBA: true });
const v = wb.vbaraw;
if (!v) {
  console.log("Nema VBA");
  process.exit(0);
}
const keys = Object.keys(v).filter(k => !/^\d+$/.test(k));
console.log("VBA ključevi:", keys.length ? keys.join("\n  ") : "(samo binarni blob)");
for (const k of keys.slice(0, 30)) {
  const raw = v[k];
  const text = typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("latin1") : "";
  const hits = text.match(/(Sub |Function |UserForm|frm|Unos|merenj|karakterist)/gi);
  if (hits?.length) console.log(k, "→", [...new Set(hits)].slice(0, 8).join(", "));
}
