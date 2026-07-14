#!/usr/bin/env node
/** Ekstrakcija SPCKarte iz GlavnaForma.jsx */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gfPath = path.join(ROOT, "src/components/atributivne/GlavnaForma.jsx");
const lines = fs.readFileSync(gfPath, "utf8").split(/\r?\n/);

const body = lines.slice(191, 1233).join("\n")
  .replace(/^function SPCKarte/, "export default function SpcKarteAtributivne");

const imports = `import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  groupSpcRows, buildParetoFromLog, predloziGrupisanjeSpc,
  kreirajAutoEskalaciju, calcDPMO, calcPPM, calcDPMODefekti, calcRTY, sigmaIzDPMO, kvalitetIzPrve,
} from "../../../lib/spcStats.js";
import { LAB_FPY_TAB, LAB_FPY_PCT, LAB_FPY_KRATKO } from "../../../lib/rtyFpy.js";
import {
  jeKontrolaCelogVozila,
  predlogAtributivnihKarti,
  jeVodicSakriven,
  sakrijVodic,
} from "../../../lib/spcPredlogKarti.js";
import { exportSpcPredlogPaketPdf, exportSpcTrenutnaKartaPdf } from "../../../lib/spcPaketPdf.js";
import SpcVodicPredlog, { tabJePreporucen } from "../../SpcVodicPredlog.jsx";
import SpcKontrolnaGraf from "../../SpcKontrolnaGraf.jsx";
import {
  SpcParetoGraf, SpcOkNokBarGraf, SpcRtyTrendGraf, SpcPpmDpmoTrendGraf,
} from "../../SpcAnalitikaGrafovi.jsx";
import { fetchKpiUnos, agregirajKpiUnos } from "../../../lib/kpiUnos.js";
import { ucitajAktivniBaseline, primeniBaselineNaPodatke, formatBaselineBadge } from "../../../lib/spcBaseline.js";
import { agregirajAtributivnePoKljuču, statAtributivneRedovi } from "../../../lib/atributivneAgregacija.js";
import { useSpcFilterSync, SpcFilterTrakaBaner } from "../../../hooks/useSpcFilterSync.jsx";
import AnalitikaSpcSnapshot from "../../analitika/AnalitikaSpcSnapshot.jsx";
import SpcKartaOpis from "../../analitika/SpcKartaOpis.jsx";
import { opisSpcKarte } from "../../../lib/analitikaOpisi.js";
import {
  PoredjenjePerioda,
  TrendUpozorenje,
  KorelacijaGreskaMasina,
  FotoArhiva,
  OCKriva,
  StabilnostProcesa,
  exportExcel,
} from "../AtrAnalitikaDodaci.jsx";

`;

const outPath = path.join(ROOT, "src/components/atributivne/spc/SpcKarteAtributivne.jsx");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${imports}\n${body}\n`);

const newLines = [
  ...lines.slice(0, 190),
  ...lines.slice(1233),
];

const importLine = 'import SpcKarteAtributivne from "./spc/SpcKarteAtributivne.jsx";\n';
const idx = newLines.findIndex((l) => l.startsWith("import CrtezDela"));
newLines.splice(idx, 0, importLine);

// Zameni <SPCKarte sa <SpcKarteAtributivne
const out = newLines.join("\n").replace(/<SPCKarte/g, "<SpcKarteAtributivne").replace(/<\/SPCKarte>/g, "</SpcKarteAtributivne>");
fs.writeFileSync(gfPath, out);

console.log("Wrote", outPath);
console.log("GlavnaForma.jsx lines:", out.split("\n").length);
