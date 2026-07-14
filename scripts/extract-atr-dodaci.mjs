#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(ROOT, "src/App.jsx");
const app = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const header = `import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { aggregateLogRows, groupSpcRows } from "../../lib/spcStats.js";
import { SpcStabilnostGraf } from "../SpcAnalitikaGrafovi.jsx";
import { exportKontrolniLogExcel } from "../../lib/excelSync.js";
import { jeVodicSakriven, sakrijVodic } from "../../lib/spcPredlogKarti.js";

`;

const body = app.slice(564, 1818).join("\n"); // useOfflineCache .. StabilnostProcesa

const exports = `
export {
  useOfflineCache,
  PoredjenjePerioda,
  TrendUpozorenje,
  KorelacijaGreskaMasina,
  PrioritizacijaDelova,
  FotoArhiva,
  KalibracijaMerila,
  CiljeviKvaliteta,
  IzvestajKupac,
  OCKriva,
  StabilnostProcesa,
  exportExcel,
};
`;

const outPath = path.join(ROOT, "src/components/atributivne/AtrAnalitikaDodaci.jsx");
fs.writeFileSync(outPath, header + body + exports);

// Remove from App.jsx
const newApp = [...app.slice(0, 552), ...app.slice(1818)].join("\n");
fs.writeFileSync(appPath, newApp);
console.log("AtrAnalitikaDodaci.jsx written, App.jsx trimmed to", newApp.split("\n").length, "lines");
