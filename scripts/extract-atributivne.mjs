#!/usr/bin/env node
/** Jednokratna ekstrakcija atributivnih komponenti iz App.jsx */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(ROOT, "src/App.jsx");
const app = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

function slice(start, end) {
  return app.slice(start - 1, end).join("\n");
}

const helpers = `function ocistiRedZaInsert(row) {
  const { id, created_at, ...rest } = row;
  return rest;
}

function dISO()    { return new Date().toISOString().split("T")[0]; }
function dPrikaz() { return new Date().toLocaleDateString("sr-RS",{day:"2-digit",month:"2-digit",year:"numeric"}); }

function lokacijaDela(deo, linije, masine) {
  if (!deo) return { linija: "-", masina: "-" };
  const linija = linije.find(l => l.id === deo.linija_id);
  const masina = masine.find(m => m.id === deo.masina_id);
  return {
    linija: linija?.naziv || deo.linija_naziv || "-",
    masina: masina?.naziv || deo.masina_naziv || "-",
  };
}

function vreme()   { return new Date().toLocaleTimeString("sr-RS",{hour:"2-digit",minute:"2-digit"}); }

function mozeAdmin(uloga) {
  return (uloga || "kontrolor").toLowerCase().trim() === "admin";
}
`;

// App.jsx imports (lines 6-184) — bez LoginScreen/PocetniEkran/TEME/radnikAuth
const importBlock = app.slice(5, 184).join("\n")
  .replace(/from "\.\//g, 'from "../')
  .replace(/LoginScreen.*\n/, "")
  .replace(/PocetniEkran.*\n/, "")
  .replace(/TEME.*\n/, "")
  .replace(/ucitajRadnika.*\n/, "")
  .replace(/ocistiUnosDraft.*\n/, "")
  + `\nimport { Toast, Modal, AlarmBanner } from "../components/ui/SpcUi.jsx";\n`
  + `import AdminPanel from "../components/admin/AdminPanel.jsx";\n`;

const body = [
  helpers,
  slice(264, 512),   // CrtezDela + toolBtn
  slice(514, 1557),  // SPCKarte
  slice(1558, 1570), // Dashboard
  slice(1572, 1859), // UnosCiljBanner + UnosAqlPanel
  slice(1862, 3689), // GlavnaFormaInner
  slice(3691, 3697), // GlavnaForma
  slice(3740, 4535), // MobilniUnos
  slice(4540, 4786), // MobilneKarte
  slice(4791, 4880), // MobilniDashboard
].join("\n\n");

const out = `${importBlock}

${body}

export default GlavnaForma;
export { GlavnaFormaInner };
`;

const outPath = path.join(ROOT, "src/components/atributivne/GlavnaForma.jsx");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log("Wrote", outPath, "lines:", out.split("\n").length);
