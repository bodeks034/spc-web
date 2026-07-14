#!/usr/bin/env node
/**
 * Podela AtrAnalitikaDodaci.jsx na manje module.
 * node scripts/split-atr-dodaci.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = path.join(ROOT, "src/components/atributivne/AtrAnalitikaDodaci.jsx");
const outDir = path.join(ROOT, "src/components/atributivne/analitika");
const lines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const reactHook = `import { useState, useEffect, useCallback } from "react";\n`;
const supabaseImp = `import { supabase } from "../../../lib/supabaseClient.js";\n`;

const files = [
  {
    name: "useOfflineCache.js",
    header: `/** Offline cache za analitičke karte. */\n`,
    body: slice(8, 24).replace(/^function useOfflineCache/, "export function useOfflineCache"),
  },
  {
    name: "PoredjenjePerioda.jsx",
    header: reactHook + supabaseImp + `import { aggregateLogRows } from "../../../lib/spcStats.js";\n\n`,
    body: slice(27, 119).replace(/^function PoredjenjePerioda/, "export default function PoredjenjePerioda"),
  },
  {
    name: "TrendUpozorenje.jsx",
    header: reactHook + `\n`,
    body: slice(120, 150).replace(/^function TrendUpozorenje/, "export default function TrendUpozorenje"),
  },
  {
    name: "KorelacijaGreskaMasina.jsx",
    header: reactHook + `\n`,
    body: slice(151, 233).replace(/^function KorelacijaGreskaMasina/, "export default function KorelacijaGreskaMasina"),
  },
  {
    name: "PrioritizacijaDelova.jsx",
    header: reactHook + supabaseImp + `import { useOfflineCache } from "./useOfflineCache.js";\n\n`,
    body: slice(234, 330).replace(/^function PrioritizacijaDelova/, "export default function PrioritizacijaDelova"),
  },
  {
    name: "generisiIzvestajSmene.js",
    header: `import { supabase } from "../../../lib/supabaseClient.js";\nimport { generisiPredajaSmenePdf } from "../../../lib/predajaSmenePdf.js";\n\n`,
    body: slice(333, 343).replace(/^async function generisiIzvestajSmene/, "export async function generisiIzvestajSmene"),
  },
  {
    name: "FotoArhiva.jsx",
    header: reactHook + supabaseImp + `\n`,
    body: slice(350, 481).replace(/^function FotoArhiva/, "export default function FotoArhiva"),
  },
  {
    name: "KalibracijaMerila.jsx",
    header: reactHook + supabaseImp + `\n`,
    body: [
      slice(482, 639),
      slice(640, 682),
      slice(683, 735),
    ].join("\n\n")
      .replace(/^function KalibracijaMerila/m, "export default function KalibracijaMerila")
      .replace(/^function NovoMeriloForma/m, "function NovoMeriloForma")
      .replace(/^function NovaKalibracijaForma/m, "function NovaKalibracijaForma"),
  },
  {
    name: "CiljeviKvaliteta.jsx",
    header: reactHook + supabaseImp + `\n`,
    body: slice(736, 899).replace(/^function CiljeviKvaliteta/, "export default function CiljeviKvaliteta"),
  },
  {
    name: "IzvestajKupac.jsx",
    header: reactHook + supabaseImp + `\n`,
    body: slice(900, 1048).replace(/^function IzvestajKupac/, "export default function IzvestajKupac"),
  },
  {
    name: "exportExcel.js",
    header: `import { supabase } from "../../../lib/supabaseClient.js";\nimport { exportKontrolniLogExcel, downloadWorkbook } from "../../../lib/excelSync.js";\n\n`,
    body: slice(1049, 1056).replace(/^async function exportExcel/, "export async function exportExcel"),
  },
  {
    name: "OCKriva.jsx",
    header: reactHook + `\n`,
    body: slice(1059, 1121).replace(/^function OCKriva/, "export default function OCKriva"),
  },
  {
    name: "StabilnostProcesa.jsx",
    header: reactHook + supabaseImp + `import { SpcStabilnostGraf } from "../../SpcAnalitikaGrafovi.jsx";\n\n`,
    body: slice(1122, 1248).replace(/^function StabilnostProcesa/, "export default function StabilnostProcesa"),
  },
];

fs.mkdirSync(outDir, { recursive: true });
for (const f of files) {
  const out = f.header + f.body + "\n";
  fs.writeFileSync(path.join(outDir, f.name), out);
  console.log("Wrote", f.name);
}

const barrel = `/** Barrel — analitički dodaci atributivnih. */
export { useOfflineCache } from "./analitika/useOfflineCache.js";
export { default as PoredjenjePerioda } from "./analitika/PoredjenjePerioda.jsx";
export { default as TrendUpozorenje } from "./analitika/TrendUpozorenje.jsx";
export { default as KorelacijaGreskaMasina } from "./analitika/KorelacijaGreskaMasina.jsx";
export { default as PrioritizacijaDelova } from "./analitika/PrioritizacijaDelova.jsx";
export { generisiIzvestajSmene } from "./analitika/generisiIzvestajSmene.js";
export { default as FotoArhiva } from "./analitika/FotoArhiva.jsx";
export { default as KalibracijaMerila } from "./analitika/KalibracijaMerila.jsx";
export { default as CiljeviKvaliteta } from "./analitika/CiljeviKvaliteta.jsx";
export { default as IzvestajKupac } from "./analitika/IzvestajKupac.jsx";
export { exportExcel } from "./analitika/exportExcel.js";
export { default as OCKriva } from "./analitika/OCKriva.jsx";
export { default as StabilnostProcesa } from "./analitika/StabilnostProcesa.jsx";
`;

const barrelPath = path.join(ROOT, "src/components/atributivne/AtrAnalitikaDodaci.jsx");
fs.writeFileSync(barrelPath, barrel);
console.log("Wrote AtrAnalitikaDodaci.jsx barrel");
