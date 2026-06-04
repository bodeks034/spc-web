/** ANSI/ASQ Z1.4 — port Excel VBA modula (docs/AQL_Kalkulator.xlsm) */

const CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R"];

const LOT_MIN = [2, 9, 16, 26, 51, 91, 151, 281, 501, 1201, 3201, 10001, 35001, 150001, 500001, 1000001];
const LOT_MAX = [8, 15, 25, 50, 90, 150, 280, 500, 1200, 3200, 10000, 35000, 150000, 500000, 1000000, 999999999];

/** lotCode[row][level-1], nivo: 1=I 2=II 3=III 4=S-1 5=S-2 6=S-3 7=S-4 */
const LOT_CODE = [
  [1, 1, 2, 1, 1, 1, 1],
  [1, 2, 3, 1, 1, 1, 1],
  [2, 3, 4, 1, 1, 2, 2],
  [3, 4, 5, 1, 2, 2, 3],
  [3, 5, 6, 2, 2, 3, 3],
  [4, 6, 7, 2, 2, 3, 4],
  [5, 7, 8, 2, 3, 4, 5],
  [6, 8, 9, 2, 3, 4, 5],
  [7, 9, 10, 3, 3, 5, 6],
  [8, 10, 11, 3, 4, 5, 7],
  [9, 11, 12, 3, 4, 6, 7],
  [10, 12, 13, 3, 4, 6, 8],
  [11, 13, 14, 4, 5, 7, 9],
  [12, 14, 15, 4, 5, 7, 9],
  [13, 15, 16, 4, 5, 8, 10],
  [13, 15, 16, 4, 5, 8, 10],
];

const SMP_SIZE = [2, 3, 5, 8, 13, 20, 32, 50, 80, 125, 200, 315, 500, 800, 1250, 2000];

/** -1 = strelica gore, -2 = strelica dole */
const AC_N = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0],
  [-1, -1, -1, -1, -1, -1, -1, -1, 0, -2],
  [-1, -1, -1, -1, -1, -1, -1, 0, -2, -1],
  [-1, -1, -1, -1, -1, -1, 0, -2, -1, 1],
  [-1, -1, -1, -1, -1, 0, -2, -1, 1, 2],
  [-1, -1, -1, -1, 0, -2, -1, 1, 2, 3],
  [-1, -1, -1, 0, -2, -1, 1, 2, 3, 5],
  [-1, -1, 0, -2, -1, 1, 2, 3, 5, 7],
  [-1, -1, -2, -1, 1, 2, 3, 5, 7, 10],
  [-1, 0, -1, 1, 2, 3, 5, 7, 10, 14],
  [0, -1, 1, 2, 3, 5, 7, 10, 14, 21],
  [-1, 1, 3, 5, 7, 10, 14, 21, -2, -2],
  [1, 2, 5, 7, 10, 14, 21, -2, -2, -2],
  [2, 3, 7, 10, 14, 21, -2, -2, -2, -2],
  [3, 5, 10, 14, 21, -2, -2, -2, -2, -2],
  [5, 7, 14, 21, -2, -2, -2, -2, -2, -2],
];

const RE_N = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, 1],
  [-1, -1, -1, -1, -1, -1, -1, -1, 1, -2],
  [-1, -1, -1, -1, -1, -1, -1, 1, -2, -1],
  [-1, -1, -1, -1, -1, -1, 1, -2, -1, 2],
  [-1, -1, -1, -1, -1, 1, -2, -1, 2, 3],
  [-1, -1, -1, -1, 1, -2, -1, 2, 3, 4],
  [-1, -1, -1, 1, -2, -1, 2, 3, 4, 6],
  [-1, -1, 1, -2, -1, 2, 3, 4, 6, 8],
  [-1, -1, -2, -1, 2, 3, 4, 6, 8, 11],
  [-1, 1, -1, 2, 3, 4, 6, 8, 11, 15],
  [1, -1, 2, 3, 4, 6, 8, 11, 15, 22],
  [-1, 2, 4, 6, 8, 11, 15, 22, -2, -2],
  [2, 3, 6, 8, 11, 15, 22, -2, -2, -2],
  [3, 4, 8, 11, 15, 22, -2, -2, -2, -2],
  [4, 6, 11, 15, 22, -2, -2, -2, -2, -2],
  [6, 8, 15, 22, -2, -2, -2, -2, -2, -2],
];

const AC_T = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0],
  [-1, -1, -1, -1, -1, -1, -1, -1, 0, 0],
  [-1, -1, -1, -1, -1, -1, 0, 0, 0, 1],
  [-1, -1, -1, -1, 0, 0, 0, 0, 1, 1],
  [-1, -1, -1, 0, 0, 0, 0, 1, 1, 2],
  [-1, -1, 0, 0, 0, 0, 1, 1, 2, 3],
  [-1, 0, 0, 0, 0, 1, 1, 2, 3, 5],
  [0, 0, 0, 0, 1, 1, 2, 3, 5, 7],
  [0, 0, 0, 1, 1, 2, 3, 5, 7, 10],
  [0, 1, 1, 2, 3, 5, 7, 10, 14, 21],
  [1, 1, 2, 3, 5, 7, 10, 14, 21, -2],
  [1, 2, 3, 5, 7, 10, 14, 21, -2, -2],
  [2, 3, 5, 7, 10, 14, 21, -2, -2, -2],
  [3, 5, 7, 10, 14, 21, -2, -2, -2, -2],
  [5, 7, 10, 14, 21, -2, -2, -2, -2, -2],
  [7, 10, 14, 21, -2, -2, -2, -2, -2, -2],
];

const RE_T = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, 1],
  [-1, -1, -1, -1, -1, -1, -1, -1, 1, 1],
  [-1, -1, -1, -1, -1, -1, 1, 1, 1, 2],
  [-1, -1, -1, -1, 1, 1, 1, 1, 2, 2],
  [-1, -1, -1, 1, 1, 1, 1, 2, 2, 3],
  [-1, -1, 1, 1, 1, 1, 2, 2, 3, 4],
  [-1, 1, 1, 1, 1, 2, 2, 3, 4, 6],
  [1, 1, 1, 1, 2, 2, 3, 4, 6, 8],
  [1, 1, 1, 2, 2, 3, 4, 6, 8, 11],
  [1, 2, 2, 3, 4, 6, 8, 11, 15, 22],
  [2, 2, 3, 4, 6, 8, 11, 15, 22, -2],
  [2, 3, 4, 6, 8, 11, 15, 22, -2, -2],
  [3, 4, 6, 8, 11, 15, 22, -2, -2, -2],
  [4, 6, 8, 11, 15, 22, -2, -2, -2, -2],
  [6, 8, 11, 15, 22, -2, -2, -2, -2, -2],
  [8, 11, 15, 22, -2, -2, -2, -2, -2, -2],
];

/** Table II-C — smanjena inspekcija (MIL-STD-105E / ANSI Z1.4); n po redu ≠ normalni n */
const SMP_R = [2, 2, 2, 3, 5, 8, 13, 20, 32, 50, 80, 125, 200, 315, 500, 800];

const AC_R = [
  [0, 1, 2, 3, 5, 7, 10, 14, 21, 30],
  [0, 0, 1, 2, 3, 5, 7, 10, 14, 21],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, 14],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, 14],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, 14],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 0, 1, 1, 2, 3, 5, 7, 10, -1],
  [0, 1, 1, 2, 3, 5, 7, 10, -1, -1],
];

const RE_R = [
  [1, 2, 3, 4, 6, 8, 11, 15, 22, 31],
  [1, 2, 3, 4, 5, 6, 8, 11, 15, 22],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, 17],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, 17],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, 17],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [1, 2, 3, 4, 5, 6, 8, 10, 13, -1],
  [2, 3, 4, 5, 6, 8, 10, 13, -1, -1],
];

export const AQL_NIVOI = ["0.065", "0.1", "0.25", "0.4", "0.65", "1.0", "1.5", "2.5", "4.0", "6.5"];

export const INSPECTION_LEVELS = [
  { id: "I", grupa: "general", label: "I — Opšti, smanjen" },
  { id: "II", grupa: "general", label: "II — Opšti, normalan (podrazumevano)" },
  { id: "III", grupa: "general", label: "III — Opšti, pojačan" },
  { id: "S-1", grupa: "special", label: "S-1 — Specijalan (najmanji uzorak)" },
  { id: "S-2", grupa: "special", label: "S-2 — Specijalan" },
  { id: "S-3", grupa: "special", label: "S-3 — Specijalan" },
  { id: "S-4", grupa: "special", label: "S-4 — Specijalan (najveći uzorak)" },
];

export const INSPECTION_TYPES = [
  { id: "Normalna", label: "Normalna" },
  { id: "Pojacana", label: "Pojačana (Tightened)" },
  { id: "Smanjena", label: "Smanjena (Reduced — Table II-C)" },
];

/** Podrazumevana veličina lota — ista kao na AQL tabu / Excel kalkulatoru. */
export const DEFAULT_AQL_LOT_SIZE = 5000;

const AQL_LOT_STORAGE_KEY = "spc_aql_lot_velicina";

export function ucitajAqlLotVelicina() {
  try {
    const v = Number(localStorage.getItem(AQL_LOT_STORAGE_KEY));
    if (Number.isFinite(v) && v >= 2) return Math.round(v);
  } catch { /* ignore */ }
  return DEFAULT_AQL_LOT_SIZE;
}

export function snimiAqlLotVelicina(n) {
  const v = Math.max(2, Math.round(Number(n) || DEFAULT_AQL_LOT_SIZE));
  try {
    localStorage.setItem(AQL_LOT_STORAGE_KEY, String(v));
  } catch { /* ignore */ }
  return v;
}

export const DEFECT_KLASE = [
  {
    id: "critical",
    naziv: "Critical",
    opis: "Bezbednost, funkcija — AQL 0 = 100% inspekcija",
    defaultAql: "0",
    aqlOpcije: ["0", "0.065", "0.1", "0.25", "0.4", "0.65", "1.0", "1.5"],
  },
  {
    id: "major",
    naziv: "Major",
    opis: "Značajno odstupanje od specifikacije",
    defaultAql: "1.0",
    aqlOpcije: [...AQL_NIVOI],
  },
  {
    id: "minor",
    naziv: "Minor",
    opis: "Estetika, manja vizuelna odstupanja",
    defaultAql: "4.0",
    aqlOpcije: [...AQL_NIVOI],
  },
];

function aqlIdx(v) {
  const s = String(v).trim().replace(",", ".");
  const map = {
    "0.065": 1, "0.1": 2, "0.10": 2, "0.15": 2, "0.25": 3,
    "0.4": 4, "0.40": 4, "0.65": 5, "1": 6, "1.0": 6, "1.00": 6,
    "1.5": 7, "1.50": 7, "2.5": 8, "2.50": 8, "4": 9, "4.0": 9, "4.00": 9,
    "6.5": 10, "6.50": 10,
  };
  if (map[s]) return map[s];
  const d = Number(s);
  if (!Number.isFinite(d)) return 0;
  const pairs = [[0.065, 1], [0.1, 2], [0.25, 3], [0.4, 4], [0.65, 5], [1, 6], [1.5, 7], [2.5, 8], [4, 9], [6.5, 10]];
  for (const [val, idx] of pairs) if (Math.abs(d - val) < 0.001) return idx;
  return 0;
}

function levelIdx(s) {
  const u = String(s).trim().toUpperCase();
  if (u === "I" || u === "GEN I") return 1;
  if (u === "II" || u === "GEN II") return 2;
  if (u === "III" || u === "GEN III") return 3;
  if (u === "S-1" || u === "S1") return 4;
  if (u === "S-2" || u === "S2") return 5;
  if (u === "S-3" || u === "S3") return 6;
  if (u === "S-4" || u === "S4") return 7;
  return 2;
}

function codeIdx(s) {
  const i = CODES.indexOf(String(s).trim().toUpperCase());
  return i >= 0 ? i + 1 : 0;
}

function idxCode(i) {
  return i >= 1 && i <= 16 ? CODES[i - 1] : "?";
}

function isTightened(inspType) {
  const u = String(inspType).trim().toUpperCase();
  return u === "POJACANA" || u === "POJAČANA" || u === "TIGHTENED" || u === "T";
}

function isReduced(inspType) {
  const u = String(inspType).trim().toUpperCase();
  return u === "SMANJENA" || u === "REDUCED" || u === "R";
}

function inspTip(inspType) {
  if (isTightened(inspType)) return "T";
  if (isReduced(inspType)) return "R";
  return "N";
}

function sampleSizeFor(ci, tip) {
  return tip === "R" ? SMP_R[ci - 1] : SMP_SIZE[ci - 1];
}

export function getCodeLetter(lotSize, inspLevel = "II") {
  const lvl = levelIdx(inspLevel);
  for (let i = 0; i < 16; i++) {
    if (lotSize >= LOT_MIN[i] && lotSize <= LOT_MAX[i]) {
      return idxCode(LOT_CODE[i][lvl - 1]);
    }
  }
  return "?";
}

export function getSampleSize(codeLetter) {
  const ci = codeIdx(codeLetter);
  return ci > 0 ? SMP_SIZE[ci - 1] : 0;
}

/** Rešava strelice — isto kao AQL_GetAcRe u VBA */
export function getAcRePlan(baseCode, aqlInput, inspType = "Normalna") {
  let outCode = String(baseCode).trim().toUpperCase();
  const msgs = [];
  const aIdx = aqlIdx(aqlInput);
  if (aIdx === 0) {
    return { ac: -1, re: -1, code: outCode, n: 0, msg: `AQL nije validan (${aqlInput})` };
  }
  const tip = inspTip(inspType);

  for (let iter = 0; iter < 20; iter++) {
    const ci = codeIdx(outCode);
    if (ci === 0) {
      return { ac: -1, re: -1, code: outCode, n: 0, msg: `Nepoznat kod: ${outCode}` };
    }
    const acTable = tip === "T" ? AC_T : tip === "R" ? AC_R : AC_N;
    const reTable = tip === "T" ? RE_T : tip === "R" ? RE_R : RE_N;
    const ac = acTable[ci - 1][aIdx - 1];
    const re = reTable[ci - 1][aIdx - 1];

    if (ac === -1) {
      if (ci < 16) {
        outCode = idxCode(ci + 1);
        msgs.push(`gore→${outCode}`);
      } else {
        return { ac: -1, re: -1, code: outCode, n: 0, msg: "Nema većeg plana" };
      }
    } else if (ac === -2) {
      if (ci > 1) {
        outCode = idxCode(ci - 1);
        msgs.push(`dole→${outCode}`);
      } else {
        return { ac: -1, re: -1, code: outCode, n: 0, msg: "Nema manjeg plana" };
      }
    } else {
      return {
        ac,
        re,
        code: outCode,
        slovo: outCode,
        n: sampleSizeFor(ci, tip),
        msg: msgs.join(", "),
        tipInspekcije: tip === "T" ? "Pojacana" : tip === "R" ? "Smanjena" : "Normalna",
      };
    }
  }
  return { ac: -1, re: -1, code: outCode, n: 0, msg: "Strelica nije rešena" };
}

/** @deprecated koristi getAcRePlan */
export function getAcRe(codeLetter, aql) {
  const r = getAcRePlan(codeLetter, aql, "Normalna");
  return [r.ac, r.re];
}

function parseAqlNum(aql) {
  const s = String(aql).trim().replace(",", ".");
  const d = Number(s);
  return Number.isFinite(d) ? d : NaN;
}

export function planUzorka(lotSize, nivo = "II") {
  const slovo = getCodeLetter(lotSize, nivo);
  const n = getSampleSize(slovo);
  const nivoInfo = INSPECTION_LEVELS.find(l => l.id === nivo) || INSPECTION_LEVELS[1];
  return { slovo, n, nivo, nivoGrupa: nivoInfo.grupa, nivoLabel: nivoInfo.label };
}

export function planZaKlasu(lotSize, nivo, aql, tipInspekcije = "Normalna") {
  const baseCode = getCodeLetter(lotSize, nivo);
  const base = planUzorka(lotSize, nivo);
  const nivoInfo = INSPECTION_LEVELS.find(l => l.id === nivo) || INSPECTION_LEVELS[1];
  const aqlNum = parseAqlNum(aql);

  if (aql === "0" || aqlNum <= 0) {
    return {
      ...base,
      baseCode,
      aql: "0",
      ac: 0,
      re: 1,
      n: lotSize,
      fullInspection: true,
      msg: "100% inspekcija",
      pctLota: 100,
    };
  }

  const resolved = getAcRePlan(baseCode, aql, tipInspekcije);
  return {
    slovo: resolved.code || baseCode,
    baseCode,
    n: resolved.n,
    nivo,
    nivoGrupa: nivoInfo.grupa,
    nivoLabel: nivoInfo.label,
    aql: String(aql),
    ac: resolved.ac,
    re: resolved.re,
    fullInspection: false,
    msg: resolved.msg,
    pctLota: lotSize > 0 && resolved.n > 0 ? (resolved.n / lotSize) * 100 : 0,
  };
}

export function planZaLot(lotSize, nivo, aql, tipInspekcije = "Normalna") {
  return planZaKlasu(lotSize, nivo, aql, tipInspekcije);
}

/** Odluka — Excel VBA; smanjena †: Ac < NOK < Re → prihvati + upozorenje */
export function aqlOdluka(brojNok, ac, re, fullInspection = false, smanjena = false) {
  if (fullInspection) {
    if (brojNok <= 0) return { status: "prihvati", tekst: "PRIHVATI", boja: "zelena" };
    return { status: "odbaci", tekst: "ODBACI", boja: "crvena" };
  }
  if (ac == null || ac < 0) return { status: "n/a", tekst: "N/A", boja: "sivi" };
  if (brojNok <= ac) return { status: "prihvati", tekst: "PRIHVATI", boja: "zelena" };
  if (smanjena && re != null && re > 0 && brojNok < re) {
    return {
      status: "prihvati",
      tekst: "PRIHVATI †",
      boja: "zuta",
      napomena: "Prekoračen Ac, ispod Re — lot OK, vrati Normalnu inspekciju",
    };
  }
  return { status: "odbaci", tekst: "ODBACI", boja: "crvena" };
}

export function kombinovanaOdluka(odluke) {
  const list = Object.values(odluke);
  if (!list.length) return { status: "n/a", tekst: "—", boja: "sivi", razlog: "" };
  if (list.some(o => o.status === "odbaci")) {
    return {
      status: "odbaci",
      tekst: "ODBACI LOT",
      boja: "crvena",
      razlog: "Bar jedna klasa (Critical / Major / Minor) prekoračila Ac/Re",
    };
  }
  if (list.some(o => o.status === "prihvati" && o.tekst.includes("†"))) {
    return {
      status: "prihvati",
      tekst: "PRIHVATI LOT †",
      boja: "zuta",
      razlog: "Smanjena inspekcija — granična zona; sledeći lot: Normalna",
    };
  }
  if (list.some(o => o.status === "n/a")) {
    return {
      status: "n/a",
      tekst: "PROVERI",
      boja: "zuta",
      razlog: "Nedostaju validni Ac/Re limiti — proveri AQL i tip inspekcije",
    };
  }
  if (list.every(o => o.status === "prihvati")) {
    return {
      status: "prihvati",
      tekst: "PRIHVATI LOT",
      boja: "zelena",
      razlog: "Sve klase (Critical, Major, Minor) unutar Ac limita",
    };
  }
  return { status: "n/a", tekst: "—", boja: "sivi", razlog: "" };
}
