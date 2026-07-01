import {
  mozeTabAtributivne,
  mozeTabMerljive,
} from "./uloge.js";

/** Tabovi koji pripadaju Modulu 1 (linija), ne Modulu 2 (analitika). */
export const TAB_BLOKIRANI_ANALITIKA = new Set(["unos", "crtez", "foto", "log"]);

export function jeTabBlokiranAnalitika(tab) {
  return TAB_BLOKIRANI_ANALITIKA.has(String(tab || "").toLowerCase());
}

/** Zajednički tabovi grupe Kvalitet (Modul 2). */
export const KVALITET_TABOVI = [
  ["odobrenja", "ODOBRENJA"],
  ["8d", "8D"],
  ["pfmea-cp", "PFMEA / CP"],
  ["eskalacije", "ESKALACIJE"],
  ["aql", "AQL"],
  ["kupac", "KUPAC"],
  ["trasabilitet", "TRASABILITET"],
];

export const ANALITIKA_GRUPE_ATRIB = [
  {
    id: "pregled",
    naziv: "Pregled",
    tabovi: [["pregled", "PREGLED"]],
  },
  {
    id: "spc",
    naziv: "Analitika",
    tabovi: [
      ["dashboard", "DASHBOARD"],
      ["karte", "KONTROLNE KARTE"],
      ["stanje", "STANJE"],
      ["oc", "OC KRIVA"],
      ["stabilnost", "STABILNOST"],
    ],
  },
  {
    id: "kvalitet",
    naziv: "Kvalitet",
    tabovi: KVALITET_TABOVI,
  },
  {
    id: "operativa",
    naziv: "Operativa",
    tabovi: [
      ["smena", "SMENA"],
      ["oee", "OEE"],
      ["kalibracija", "MERILA"],
      ["ciljevi", "CILJEVI"],
      ["nalozi", "NALOZI"],
    ],
  },
  {
    id: "alati",
    naziv: "Alati",
    tabovi: [
      ["excel", "EXCEL"],
    ],
  },
];

export const ANALITIKA_GRUPE_MER = [
  {
    id: "pregled",
    naziv: "Pregled",
    tabovi: [["pregled", "PREGLED"]],
  },
  {
    id: "spc",
    naziv: "Analitika",
    tabovi: [
      ["dashboard", "DASHBOARD"],
      ["karte", "KONTROLNE KARTE"],
      ["stanje", "STANJE"],
      ["heatmap", "HEAT MAP"],
      ["stabilnost", "STABILNOST"],
      ["msa", "MSA / MERILA"],
      ["kplan", "KONTROLNI PLAN"],
    ],
  },
  {
    id: "kvalitet",
    naziv: "Kvalitet",
    tabovi: [
      ...KVALITET_TABOVI,
      ["fai", "FAI"],
    ],
  },
  {
    id: "operativa",
    naziv: "Operativa",
    tabovi: [
      ["smena", "SMENA"],
      ["oee", "OEE"],
      ["ciljevi", "CILJEVI"],
      ["nalozi", "NALOZI"],
    ],
  },
  {
    id: "alati",
    naziv: "Alati",
    tabovi: [
      ["excel", "EXCEL"],
    ],
  },
];

function flattenGrupe(grupe, mozeTab) {
  const out = [];
  for (const g of grupe) {
    for (const [id, naziv] of g.tabovi) {
      if (mozeTab(id)) out.push([id, naziv]);
    }
  }
  return out;
}

export function buildAnalitikaTaboviAtr(uloga, rezimRada) {
  if (rezimRada === "linija") return null;
  return flattenGrupe(ANALITIKA_GRUPE_ATRIB, (id) => mozeTabAtributivne(id, uloga, rezimRada));
}

export function buildAnalitikaTaboviMer(uloga, rezimRada) {
  if (rezimRada === "linija") return null;
  return flattenGrupe(ANALITIKA_GRUPE_MER, (id) => mozeTabMerljive(id, uloga, rezimRada));
}

export function grupeSaDozvoljenimTabovima(grupe, mozeTab) {
  return grupe
    .map((g) => ({
      ...g,
      tabovi: g.tabovi.filter(([id]) => mozeTab(id)),
    }))
    .filter((g) => g.tabovi.length > 0);
}

export function grupaZaTab(grupe, tabId) {
  const t = String(tabId || "").toLowerCase();
  return grupe.find((g) => g.tabovi.some(([id]) => id === t))?.id || grupe[0]?.id || "pregled";
}

export function bojaAnalitikaTaba(id, C) {
  const t = String(id || "").toLowerCase();
  if (t === "pregled" || t === "dashboard") return C.zelena;
  if (t === "karte") return C.narandzasta;
  if (t === "stanje" || t === "msa" || t === "crtez") return C.ljubicasta;
  if (t === "admin" || t === "fai" || t === "smena" || t === "odobrenja") return C.zuta;
  if (t === "kplan" || t === "trasabilitet") return C.plava;
  if (t === "heatmap" || t === "stabilnost") return "#f472b6";
  if (t === "oee") return C.narandzasta;
  if (t === "kupac") return "#22d3ee";
  if (t === "excel") return C.plava;
  if (t === "eskalacije" || t === "8d") return C.crvena;
  if (t === "pfmea-cp") return C.ljubicasta;
  return C.plava;
}
