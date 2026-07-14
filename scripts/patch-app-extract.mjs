#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(ROOT, "src/App.jsx");
let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

function removeRange(start, end) {
  lines.splice(start - 1, end - start + 1);
}

// 1-based line numbers in ORIGINAL file — remove bottom-up
removeRange(5661, 5771); // AdminStatistike
removeRange(5329, 5659); // AdminPanel
removeRange(5192, 5324); // AdminExcelPanel
removeRange(4791, 4880); // MobilniDashboard
removeRange(4540, 4786); // MobilneKarte
removeRange(3740, 4535); // MobilniUnos
removeRange(3702, 3735); // MobilnaNavigacija (dead code)
removeRange(3691, 3697); // GlavnaForma wrapper
removeRange(1862, 3689); // GlavnaFormaInner
removeRange(1572, 1859); // UnosCiljBanner + UnosAqlPanel
removeRange(1558, 1570); // Dashboard
removeRange(514, 1557); // SPCKarte
removeRange(264, 512); // CrtezDela + toolBtn
removeRange(217, 261); // Toast, Modal, AlarmBanner

const insertAfter = lines.findIndex((l) => l.includes('import OProgramuPanel'));
const newImports = [
  'import { Toast, Modal, AlarmBanner } from "./components/ui/SpcUi.jsx";',
  'import GlavnaForma from "./components/atributivne/GlavnaForma.jsx";',
  'import AdminPanel from "./components/admin/AdminPanel.jsx";',
];
lines.splice(insertAfter + 1, 0, ...newImports);

fs.writeFileSync(appPath, lines.join("\n"));
console.log("App.jsx patched, lines:", lines.length);

// Fix GlavnaForma import paths
const gfPath = path.join(ROOT, "src/components/atributivne/GlavnaForma.jsx");
let gf = fs.readFileSync(gfPath, "utf8");
gf = gf
  .replace(/from "\.\.\/lib\//g, 'from "../../lib/')
  .replace(/from "\.\.\/hooks\//g, 'from "../../hooks/')
  .replace(/from "\.\.\/layout\//g, 'from "../../layout/')
  .replace(/from "\.\.\/VarijabilneForma/g, 'from "../../VarijabilneForma')
  .replace(/from "\.\.\/MerljiveExcelPanel/g, 'from "../../MerljiveExcelPanel')
  .replace(/from "\.\.\/InzenjerExcelPanel/g, 'from "../../InzenjerExcelPanel')
  .replace(/from "\.\.\/components\//g, 'from "../');
fs.writeFileSync(gfPath, gf);
console.log("GlavnaForma.jsx paths fixed");
