/**
 * ISO 3951-1 / ANSI Z1.9 — uzorkovanje po varijablama (s-metod, Form k).
 * Veličina uzorka po kodu slova (Table 1) + k konstanta (Table 2, normalna inspekcija).
 */
import { getCodeLetter, INSPECTION_LEVELS, AQL_NIVOI } from "./aqlIso2859.js";

export { INSPECTION_LEVELS, AQL_NIVOI };

/** ISO 3951-1 Table 1 — n po kodu slova (A…R). */
export const ISO3951_SMP_SIZE = [2, 3, 5, 7, 10, 15, 25, 35, 50, 75, 110, 150, 200, 275, 375, 550];

const CODES = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R"];

/**
 * k faktori (s-metod, gornja granica / dvostrano) — ANSI Z1.9-2008 Table B-2, normalna inspekcija.
 * Ključ: AQL %, vrednost: { n: k }.
 */
const K_TABLE = {
  "0.65": { 3: 2.004, 5: 1.812, 7: 1.756, 10: 1.618, 15: 1.544, 25: 1.477, 35: 1.443, 50: 1.419, 75: 1.400, 110: 1.388, 150: 1.381, 200: 1.376 },
  "1.0": { 3: 1.952, 5: 1.737, 7: 1.675, 10: 1.568, 15: 1.502, 25: 1.435, 35: 1.397, 50: 1.371, 75: 1.352, 110: 1.339, 150: 1.331, 200: 1.326 },
  "1.5": { 3: 1.902, 5: 1.669, 7: 1.602, 10: 1.514, 15: 1.463, 25: 1.411, 35: 1.385, 50: 1.366, 75: 1.352, 110: 1.342, 150: 1.336, 200: 1.331 },
  "2.5": { 3: 1.841, 5: 1.603, 7: 1.532, 10: 1.459, 15: 1.418, 25: 1.372, 35: 1.349, 50: 1.334, 75: 1.322, 110: 1.313, 150: 1.308, 200: 1.304 },
  "4.0": { 3: 1.777, 5: 1.541, 7: 1.469, 10: 1.410, 15: 1.374, 25: 1.328, 35: 1.306, 50: 1.296, 75: 1.286, 110: 1.279, 150: 1.275, 200: 1.271 },
  "6.5": { 3: 1.711, 5: 1.477, 7: 1.406, 10: 1.360, 15: 1.329, 25: 1.292, 35: 1.273, 50: 1.264, 75: 1.256, 110: 1.251, 150: 1.247, 200: 1.244 },
  "0.25": { 3: 2.058, 5: 1.866, 7: 1.812, 10: 1.668, 15: 1.590, 25: 1.518, 35: 1.482, 50: 1.456, 75: 1.436, 110: 1.423, 150: 1.415, 200: 1.410 },
  "0.4": { 3: 2.032, 5: 1.840, 7: 1.784, 10: 1.644, 15: 1.568, 25: 1.498, 35: 1.463, 50: 1.438, 75: 1.418, 110: 1.405, 150: 1.397, 200: 1.392 },
  "0.1": { 3: 2.081, 5: 1.890, 7: 1.836, 10: 1.690, 15: 1.610, 25: 1.536, 35: 1.499, 50: 1.472, 75: 1.451, 110: 1.437, 150: 1.429, 200: 1.424 },
  "0.065": { 3: 2.100, 5: 1.908, 7: 1.854, 10: 1.706, 15: 1.624, 25: 1.548, 35: 1.510, 50: 1.482, 75: 1.460, 110: 1.446, 150: 1.438, 200: 1.432 },
};

const ISO3951_PREFS_KEY = "spc_iso3951_prefs";

export function podrazumevanaIso3951Podesavanja() {
  return {
    nivo: "II",
    aql: "1.5",
    tipGranice: "dvostrano",
    lsl: "",
    usl: "",
    nominala: "",
  };
}

export function ucitajIso3951Podesavanja() {
  try {
    const raw = localStorage.getItem(ISO3951_PREFS_KEY);
    if (raw) return { ...podrazumevanaIso3951Podesavanja(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return podrazumevanaIso3951Podesavanja();
}

export function snimiIso3951Podesavanja(p) {
  const merged = { ...podrazumevanaIso3951Podesavanja(), ...p };
  try {
    localStorage.setItem(ISO3951_PREFS_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
  return merged;
}

function najbliziAql(aql) {
  const s = String(aql).trim();
  if (K_TABLE[s]) return s;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return "1.5";
  let best = "1.5";
  let diff = Infinity;
  for (const k of Object.keys(K_TABLE)) {
    const d = Math.abs(Number(k) - n);
    if (d < diff) { diff = d; best = k; }
  }
  return best;
}

/** k konstanta za n i AQL (interpolacija po n). */
export function kFaktor(n, aql) {
  const nn = Math.round(Number(n));
  if (nn < 2) return null;
  const tbl = K_TABLE[najbliziAql(aql)];
  if (!tbl) return null;
  if (tbl[nn] != null) return tbl[nn];
  const sizes = Object.keys(tbl).map(Number).sort((a, b) => a - b);
  if (nn <= sizes[0]) return tbl[sizes[0]];
  if (nn >= sizes[sizes.length - 1]) return tbl[sizes[sizes.length - 1]];
  for (let i = 0; i < sizes.length - 1; i += 1) {
    const n0 = sizes[i];
    const n1 = sizes[i + 1];
    if (nn >= n0 && nn <= n1) {
      const k0 = tbl[n0];
      const k1 = tbl[n1];
      const t = (nn - n0) / (n1 - n0);
      return k0 + t * (k1 - k0);
    }
  }
  return null;
}

export function nPoKoduSlova(slovo) {
  const i = CODES.indexOf(String(slovo || "").trim().toUpperCase());
  return i >= 0 ? ISO3951_SMP_SIZE[i] : 0;
}

/** Plan uzorka: kod slova + n + k (ISO 3951). */
export function planIso3951(lotSize, nivo = "II", aql = "1.5") {
  const lot = Math.max(2, Math.round(Number(lotSize) || 2));
  const slovo = getCodeLetter(lot, nivo);
  let n = nPoKoduSlova(slovo);
  const punUzorak = n >= lot;
  if (punUzorak) n = lot;
  const k = kFaktor(n, aql);
  const nivoInfo = INSPECTION_LEVELS.find((l) => l.id === nivo) || INSPECTION_LEVELS[1];
  return {
    slovo,
    n,
    k,
    lot,
    punUzorak,
    aql: najbliziAql(aql),
    nivo,
    nivoLabel: nivoInfo.label,
    pctLota: lot > 0 ? (n / lot) * 100 : 0,
  };
}

/** Parsira merenja iz teksta (razmak, zarez kao decimala, tačka, novi red). */
export function parseMerenjaTxt(txt) {
  const s = String(txt || "").trim();
  if (!s) return [];
  const matches = s.match(/-?\d+(?:[.,]\d+)?/g);
  return matches ? matches.map((m) => m.replace(",", ".")) : [];
}

export function statistikaUzorka(vrednosti) {
  const nums = (Array.isArray(vrednosti) ? vrednosti : [])
    .map((v) => Number(String(v).replace(",", ".")))
    .filter((v) => Number.isFinite(v));
  const n = nums.length;
  if (n < 2) {
    return { ok: false, n, mean: null, s: null, msg: "Unesite najmanje 2 validna merenja" };
  }
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  const s = Math.sqrt(nums.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1));
  return { ok: true, n, mean, s, nums, msg: null };
}

function numOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Odluka po ISO 3951 s-metod (Form k).
 * tipGranice: 'gornja' | 'donja' | 'dvostrano'
 */
const S_EPS = 1e-12;

function odlukaPriNultojVarijaciji(mean, k, L, U, tip) {
  if (tip === "gornja") {
    if (U == null) return { tekst: "NEDOSTAJE USL", boja: "siva", qu: null, ql: null, razlog: "Unesite gornju granicu (USL)" };
    const prihvati = mean <= U;
    return {
      tekst: prihvati ? "PRIHVATI LOT" : "ODBACI LOT",
      boja: prihvati ? "zelena" : "crvena",
      qu: prihvati ? Infinity : -Infinity,
      ql: null,
      razlog: prihvati
        ? `s=0 (identična merenja), x̄=${mean.toFixed(4)} ≤ USL=${U}`
        : `s=0, x̄=${mean.toFixed(4)} > USL=${U}`,
    };
  }
  if (tip === "donja") {
    if (L == null) return { tekst: "NEDOSTAJE LSL", boja: "siva", qu: null, ql: null, razlog: "Unesite donju granicu (LSL)" };
    const prihvati = mean >= L;
    return {
      tekst: prihvati ? "PRIHVATI LOT" : "ODBACI LOT",
      boja: prihvati ? "zelena" : "crvena",
      qu: null,
      ql: prihvati ? Infinity : -Infinity,
      razlog: prihvati
        ? `s=0 (identična merenja), x̄=${mean.toFixed(4)} ≥ LSL=${L}`
        : `s=0, x̄=${mean.toFixed(4)} < LSL=${L}`,
    };
  }
  if (L == null || U == null) {
    return { tekst: "NEDOSTAJU GRANICE", boja: "siva", qu: null, ql: null, razlog: "Dvostrana kontrola zahteva LSL i USL" };
  }
  const prihvati = mean >= L && mean <= U;
  return {
    tekst: prihvati ? "PRIHVATI LOT" : "ODBACI LOT",
    boja: prihvati ? "zelena" : "crvena",
    qu: prihvati ? Infinity : (mean > U ? -Infinity : Infinity),
    ql: prihvati ? Infinity : (mean < L ? -Infinity : Infinity),
    razlog: prihvati
      ? `s=0 (identična merenja), x̄=${mean.toFixed(4)} unutar [${L}, ${U}]`
      : `s=0, x̄=${mean.toFixed(4)} van granica [${L}, ${U}]`,
  };
}

export function odlukaIso3951({
  mean,
  s,
  k,
  lsl,
  usl,
  tipGranice = "dvostrano",
}) {
  if (!Number.isFinite(mean) || !Number.isFinite(s)) {
    return { tekst: "NEDOSTAJU PODACI", boja: "siva", qu: null, ql: null, k, razlog: "Nedovoljno merenja" };
  }
  if (!Number.isFinite(k)) {
    return { tekst: "N/A", boja: "siva", qu: null, ql: null, k, razlog: "k konstanta nije dostupna za ovaj n/AQL" };
  }

  const L = numOrNull(lsl);
  const U = numOrNull(usl);
  let tip = tipGranice;
  if (tip === "dvostrano" && L == null && U != null) tip = "gornja";
  if (tip === "dvostrano" && U == null && L != null) tip = "donja";

  if (s <= S_EPS) {
    const nula = odlukaPriNultojVarijaciji(mean, k, L, U, tip);
    return { ...nula, k };
  }
  const qu = U != null ? (U - mean) / s : null;
  const ql = L != null ? (mean - L) / s : null;

  if (tip === "gornja") {
    if (qu == null) return { tekst: "NEDOSTAJE USL", boja: "siva", qu, ql, k, razlog: "Unesite gornju granicu (USL)" };
    const prihvati = qu >= k;
    return {
      tekst: prihvati ? "PRIHVATI LOT" : "ODBACI LOT",
      boja: prihvati ? "zelena" : "crvena",
      qu, ql, k,
      razlog: `Qu = (USL − x̄)/s = ${qu.toFixed(3)} ${prihvati ? "≥" : "<"} k = ${k.toFixed(3)}`,
    };
  }

  if (tip === "donja") {
    if (ql == null) return { tekst: "NEDOSTAJE LSL", boja: "siva", qu, ql, k, razlog: "Unesite donju granicu (LSL)" };
    const prihvati = ql >= k;
    return {
      tekst: prihvati ? "PRIHVATI LOT" : "ODBACI LOT",
      boja: prihvati ? "zelena" : "crvena",
      qu, ql, k,
      razlog: `Ql = (x̄ − LSL)/s = ${ql.toFixed(3)} ${prihvati ? "≥" : "<"} k = ${k.toFixed(3)}`,
    };
  }

  if (L == null || U == null) {
    return { tekst: "NEDOSTAJU GRANICE", boja: "siva", qu, ql, k, razlog: "Dvostrana kontrola zahteva LSL i USL" };
  }
  const prihvati = qu >= k && ql >= k;
  return {
    tekst: prihvati ? "PRIHVATI LOT" : "ODBACI LOT",
    boja: prihvati ? "zelena" : "crvena",
    qu, ql, k,
    razlog: `Qu=${qu.toFixed(3)}, Ql=${ql.toFixed(3)} — oba moraju biti ≥ k=${k.toFixed(3)}`,
  };
}

/** Kompletan proračun: plan + uneta merenja + granice. */
export function proracunIso3951({
  lotSize,
  nivo,
  aql,
  merenja,
  lsl,
  usl,
  tipGranice,
}) {
  const plan = planIso3951(lotSize, nivo, aql);
  const stat = statistikaUzorka(merenja);
  if (!stat.ok) {
    return { plan, stat, odluka: { tekst: "UNESITE MERENJA", boja: "siva", razlog: stat.msg } };
  }
  const odluka = odlukaIso3951({
    mean: stat.mean,
    s: stat.s,
    k: plan.k,
    lsl,
    usl,
    tipGranice,
  });
  const dovoljnoMerenja = stat.n >= Math.min(plan.n, plan.lot);
  return {
    plan,
    stat,
    odluka,
    dovoljnoMerenja,
    upozorenje: !dovoljnoMerenja
      ? `Plan zahteva n=${plan.n}, uneto ${stat.n} merenja`
      : null,
  };
}
