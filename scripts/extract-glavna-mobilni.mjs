#!/usr/bin/env node
/** Ekstrakcija UnosAqlBlok + mobilnih komponenti iz GlavnaForma.jsx */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gfPath = path.join(ROOT, "src/components/atributivne/GlavnaForma.jsx");
const lines = fs.readFileSync(gfPath, "utf8").split(/\r?\n/);

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const helperLib = `/** Zajednički pomoćnici za atributivni unos (GlavnaForma i mobilni modul). */

export function ocistiRedZaInsert(row) {
  const { id, created_at, ...rest } = row;
  return rest;
}

export function dISO() {
  return new Date().toISOString().split("T")[0];
}

export function dPrikaz() {
  return new Date().toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function lokacijaDela(deo, linije, masine) {
  if (!deo) return { linija: "-", masina: "-" };
  const linija = linije.find((l) => l.id === deo.linija_id);
  const masina = masine.find((m) => m.id === deo.masina_id);
  return {
    linija: linija?.naziv || deo.linija_naziv || "-",
    masina: masina?.naziv || deo.masina_naziv || "-",
  };
}

export function vreme() {
  return new Date().toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}

export function mozeAdminLokalno(uloga) {
  return (uloga || "kontrolor").toLowerCase().trim() === "admin";
}
`;

const unosAqlBlok = `import { useState, useEffect, useMemo, useCallback } from "react";
import {
  INSPECTION_LEVELS, INSPECTION_TYPES, DEFECT_KLASE, planUzorka, planZaKlasu, aqlOdluka, kombinovanaOdluka,
  DEFAULT_AQL_LOT_SIZE, ucitajAqlPodesavanja, snimiAqlPodesavanja,
} from "../../lib/aqlIso2859.js";
import {
  pendingFromLista, mergeSmenaStat, fetchAktuelniCilj, fetchDeoStatDanas, nokPoAqlKlasi,
} from "../../lib/spcStats.js";
import { LAB_FPY_CILJ, LAB_FPY_KRATKO } from "../../lib/rtyFpy.js";
import { fetchKpiUnos, agregirajKpiUnos } from "../../lib/kpiUnos.js";
import { dISO } from "../../lib/atributivneUnosHelper.js";
import { supabase } from "../../lib/supabaseClient.js";

${slice(1519, 1806)}

export { UnosCiljBanner, UnosAqlPanel };
`;

const mobilneKarte = `import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { supabase } from "../../../lib/supabaseClient.js";
import { jeKontrolaCelogVozila, predlogAtributivnihKarti, jeVodicSakriven, sakrijVodic } from "../../../lib/spcPredlogKarti.js";
import { predloziGrupisanjeSpc, groupSpcRows, chartDataWithWesternElectric } from "../../../lib/spcStats.js";
import SpcVodicPredlog, { tabJePreporucen } from "../../SpcVodicPredlog.jsx";

${slice(4449, 4695)}

export default MobilneKarte;
`;

const mobilniDashboard = `import { useState, useEffect } from "react";
import { aggregateLogRows } from "../../../lib/spcStats.js";
import { LAB_FPY_PCT, LAB_FPY_TREND } from "../../../lib/rtyFpy.js";
import { SpcRtyJednaLinija } from "../../SpcAnalitikaGrafovi.jsx";
import { supabase } from "../../../lib/supabaseClient.js";

${slice(4697, 4786)}

export default MobilniDashboard;
`;

const mobilniUnos = `import { useState, useEffect, useMemo } from "react";
import UnosPokaYokeKorak from "../../UnosPokaYokeKorak.jsx";
import AtrCrtezPregled from "../../AtrCrtezPregled.jsx";
import SmenaIdUnosRed from "../../SmenaIdUnosRed.jsx";
import PogonIzborPanel from "../../PogonIzborPanel.jsx";
import VoziloZonaNav from "../../VoziloZonaNav.jsx";
import LinijaWizardNav, { KORACI_ATRIB_LINIJA, KORACI_ATRIB_KONTROLOR } from "../../LinijaWizardNav.jsx";
import LinijaDonjaTraka, { DugmeTraka } from "../../LinijaDonjaTraka.jsx";
import { useEkran } from "../../../lib/useEkran.js";
import { stilOmotLinija, onFocusTastatura } from "../../../layout/tastaturaMobil.js";
import { dp } from "../../../layout/dp.js";
import { TELEFON } from "../../../layout/tokens/telefon.js";
import { TABLET } from "../../../layout/tokens/tablet.js";
import { useVoziloDijagramSrc } from "../../../lib/useVoziloDijagramSrc.js";
import { idBarkodInputHandleri } from "../../../lib/barkod.js";
import { mozeAdminLokalno as mozeAdmin } from "../../../lib/atributivneUnosHelper.js";
import { UnosCiljBanner, UnosAqlPanel } from "../UnosAqlBlok.jsx";

${slice(3652, 4447)}

export default MobilniUnos;
`;

// Remove extracted sections from GlavnaForma and patch imports
const removeRanges = [
  [185, 208],   // helpers (moved to lib) — keep mozeAdmin usage via jeAdmin from uloge mostly; remove local mozeAdmin
  [1519, 1806], // UnosAql
  [3652, 4786], // mobilni components
];

let newLines = [...lines];
for (const [start, end] of [...removeRanges].sort((a, b) => b[0] - a[0])) {
  newLines.splice(start - 1, end - start + 1);
}

const importInsert = `import { ocistiRedZaInsert, dISO, dPrikaz, lokacijaDela, vreme, mozeAdminLokalno as mozeAdmin } from "../../lib/atributivneUnosHelper.js";
import { UnosCiljBanner, UnosAqlPanel } from "./UnosAqlBlok.jsx";
import MobilniUnos from "./mobilni/MobilniUnos.jsx";
import MobilneKarte from "./mobilni/MobilneKarte.jsx";
import MobilniDashboard from "./mobilni/MobilniDashboard.jsx";
`;

const importIdx = newLines.findIndex((l) => l.startsWith("import { useState"));
newLines.splice(importIdx, 0, importInsert);

fs.writeFileSync(path.join(ROOT, "src/lib/atributivneUnosHelper.js"), helperLib);
fs.writeFileSync(path.join(ROOT, "src/components/atributivne/UnosAqlBlok.jsx"), unosAqlBlok);
fs.mkdirSync(path.join(ROOT, "src/components/atributivne/mobilni"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src/components/atributivne/mobilni/MobilneKarte.jsx"), mobilneKarte);
fs.writeFileSync(path.join(ROOT, "src/components/atributivne/mobilni/MobilniDashboard.jsx"), mobilniDashboard);
fs.writeFileSync(path.join(ROOT, "src/components/atributivne/mobilni/MobilniUnos.jsx"), mobilniUnos);
fs.writeFileSync(gfPath, newLines.join("\n"));

console.log("Extracted UnosAqlBlok + mobilni/*");
console.log("GlavnaForma.jsx lines:", newLines.length);
