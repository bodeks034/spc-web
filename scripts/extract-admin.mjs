#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(ROOT, "src/App.jsx"), "utf8").split(/\r?\n/);

function slice(start, end) {
  return app.slice(start - 1, end).join("\n");
}

const header = `import { useState, useEffect, useCallback } from "react";
import {
  mirrorKontrolniLogToExcel,
  exportMasterWorkbook,
  importWorkbookToSupabase,
  previewImport,
  readWorkbookFromFile,
  downloadWorkbook,
} from "../../lib/excelSync.js";
import { supabase } from "../../lib/supabaseClient.js";
import { useEkran } from "../../lib/useEkran.js";
import LicencaStatusPanel from "../LicencaStatusPanel.jsx";
import OProgramuPanel from "../OProgramuPanel.jsx";
import AdminLozinkaModal from "../AdminLozinkaModal.jsx";
import OfflineSyncPanel from "../OfflineSyncPanel.jsx";
import ErpMonitoringStrip from "../ErpMonitoringStrip.jsx";
import StatusServera from "../StatusServera.jsx";
import SchemaStatusPanel from "../SchemaStatusPanel.jsx";
import SpcBaselinePanel from "../SpcBaselinePanel.jsx";
import TrasabilitetPanel from "../TrasabilitetPanel.jsx";
import MeriloBarkodUputstvo from "../MeriloBarkodUputstvo.jsx";
import NotifikacijePodesavanja from "../NotifikacijePodesavanja.jsx";
import AdminKalibracijaPanel from "../AdminKalibracijaPanel.jsx";
import AdminPrekidiPanel from "../AdminPrekidiPanel.jsx";
import AdminSpcAlarmiPanel from "../AdminSpcAlarmiPanel.jsx";
import { Modal } from "../ui/SpcUi.jsx";

function dISO() { return new Date().toISOString().split("T")[0]; }

`;

const body = [
  slice(5192, 5324),  // AdminExcelPanel
  slice(5329, 5659),  // AdminPanel
  slice(5661, 5771),  // AdminStatistike
].join("\n\n");

const out = header + body + "\n\nexport default AdminPanel;\n";
const outPath = path.join(ROOT, "src/components/admin/AdminPanel.jsx");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log("Wrote", outPath);
