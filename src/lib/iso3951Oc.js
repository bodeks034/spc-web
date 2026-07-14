/**
 * ISO 3951-1 OC kriva — s-metod (Form k), normalni proces.
 * Pa = P(prihvatanje lota) u zavisnosti od % neispravnih u lotu.
 */
import {
  odlukaIso3951,
  planIso3951,
  kFaktor,
  ucitajIso3951Podesavanja,
  proracunIso3951,
  parseMerenjaTxt,
  INSPECTION_LEVELS,
  AQL_NIVOI,
} from "./iso3951.js";

export {
  planIso3951,
  kFaktor,
  ucitajIso3951Podesavanja,
  proracunIso3951,
  parseMerenjaTxt,
  INSPECTION_LEVELS,
  AQL_NIVOI,
};

/** Inverzija standardne normalne (Peter J. Acklam). */
export function normInv(p) {
  const pp = Number(p);
  if (!Number.isFinite(pp) || pp <= 0) return -Infinity;
  if (pp >= 1) return Infinity;

  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285084469138e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131884771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.584458818348936e+00,
    2.938163982698853e+00,
  ];
  const d = [
    7.784695709041136e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907387e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (pp < pLow) {
    const q = Math.sqrt(-2 * Math.log(pp));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (pp > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - pp));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  const q = pp - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
    / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function createRng(seed = 1) {
  let s = Math.floor(Math.abs(seed)) % 2147483646 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function randomNormal(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleStd(nums) {
  const n = nums.length;
  if (n < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(nums.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1));
}

/** μ procesa za zadati % neispravnih (normalni lot). */
export function muZaUdeoNeispravnih(pct, {
  tipGranice = "gornja",
  lsl = null,
  usl = 0,
  sigma = 1,
} = {}) {
  const p = Math.min(99.99, Math.max(0.01, Number(pct) || 0)) / 100;
  const sig = Number(sigma) > 0 ? Number(sigma) : 1;

  if (tipGranice === "gornja") {
    const U = Number.isFinite(Number(usl)) ? Number(usl) : 0;
    return U - sig * normInv(1 - p);
  }
  if (tipGranice === "donja") {
    const L = Number.isFinite(Number(lsl)) ? Number(lsl) : 0;
    return L - sig * normInv(p);
  }

  const L = Number.isFinite(Number(lsl)) ? Number(lsl) : -1;
  const U = Number.isFinite(Number(usl)) ? Number(usl) : 1;

  const target = p;
  let lo = L - 6 * sig;
  let hi = U + 6 * sig;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    const tail = normCdf((L - mid) / sig) + (1 - normCdf((U - mid) / sig));
    if (tail > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function normCdf(z) {
  const x = Number(z);
  if (!Number.isFinite(x)) return x < 0 ? 0 : 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

/** Monte Carlo Pa za jedan nivo kvaliteta (% neispravnih). */
export function verovatnoaPrihvatanjaIso3951(pct, {
  n,
  k,
  tipGranice = "gornja",
  lsl = null,
  usl = 0,
  sigma = 1,
  iteracije = 6000,
  seed = 42,
} = {}) {
  const nn = Math.max(2, Math.round(Number(n) || 2));
  const kk = Number(k);
  if (!Number.isFinite(kk)) return null;

  const mu = muZaUdeoNeispravnih(pct, { tipGranice, lsl, usl, sigma });
  const rng = createRng(seed + Math.round(pct * 100));
  let prihvaceno = 0;

  const lslVal = tipGranice === "gornja" ? null : (Number.isFinite(Number(lsl)) ? Number(lsl) : -1);
  const uslVal = tipGranice === "donja" ? null : (Number.isFinite(Number(usl)) ? Number(usl) : 1);
  const tip = tipGranice === "dvostrano" ? "dvostrano"
    : tipGranice === "donja" ? "donja" : "gornja";

  for (let i = 0; i < iteracije; i += 1) {
    const uzorak = [];
    for (let j = 0; j < nn; j += 1) {
      uzorak.push(mu + sigma * randomNormal(rng));
    }
    const mean = uzorak.reduce((a, b) => a + b, 0) / nn;
    const s = sampleStd(uzorak);
    const od = odlukaIso3951({
      mean,
      s,
      k: kk,
      lsl: lslVal,
      usl: uslVal,
      tipGranice: tip,
    });
    if (od.boja === "zelena") prihvaceno += 1;
  }

  return (prihvaceno / iteracije) * 100;
}

const DEFAULT_P_ROZSAH = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20, 25, 30];

/** OC kriva — niz { p, pa } za graf. */
export function izracunajOcKrivuIso3951({
  lotSize = 500,
  nivo = "II",
  aql = "1.5",
  n: nOverride = null,
  k: kOverride = null,
  tipGranice = "gornja",
  lsl = null,
  usl = 0,
  sigma = 1,
  pRozsah = DEFAULT_P_ROZSAH,
  iteracije = 5000,
  seed = 42,
} = {}) {
  const plan = planIso3951(lotSize, nivo, aql);
  const n = nOverride != null ? Math.max(2, Math.round(Number(nOverride) || plan.n)) : plan.n;
  const k = kOverride != null ? Number(kOverride) : plan.k;

  if (!Number.isFinite(k)) {
    return { plan: { ...plan, n, k: null }, tacke: [], greska: "k konstanta nije dostupna za ovaj n/AQL" };
  }

  const tacke = (pRozsah || DEFAULT_P_ROZSAH).map((pRaw) => {
    const p = +Number(pRaw).toFixed(2);
    const pa = verovatnoaPrihvatanjaIso3951(p, {
      n, k, tipGranice, lsl, usl, sigma, iteracije, seed: seed + Math.round(p * 10),
    });
    return { p, pa: pa != null ? +pa.toFixed(2) : null };
  });

  return {
    plan: { ...plan, n, k, aql: plan.aql, nivo: plan.nivo },
    tacke,
    greska: null,
  };
}

function numGranica(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function jeVanGranice(x, { tipGranice, lsl, usl }) {
  const L = numGranica(lsl);
  const U = numGranica(usl);
  if (tipGranice === "gornja") return U != null && x > U;
  if (tipGranice === "donja") return L != null && x < L;
  if (L != null && x < L) return true;
  if (U != null && x > U) return true;
  return false;
}

/** Udeo merenja van LSL/USL u uzorku (%). */
export function procenatNeispravnihUZorku(merenja, { tipGranice = "gornja", lsl = null, usl = null } = {}) {
  const nums = (Array.isArray(merenja) ? merenja : parseMerenjaTxt(merenja))
    .map((v) => Number(String(v).replace(",", ".")))
    .filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  const van = nums.filter((x) => jeVanGranice(x, { tipGranice, lsl, usl })).length;
  return +(van / nums.length * 100).toFixed(2);
}

/** Interpolacija Pa na OC krivi za dati p (%). */
export function paNaKriviZaP(tacke, p) {
  if (!tacke?.length || !Number.isFinite(Number(p))) return null;
  const sorted = [...tacke].sort((a, b) => a.p - b.p);
  const px = Number(p);
  if (px <= sorted[0].p) return sorted[0].pa;
  if (px >= sorted[sorted.length - 1].p) return sorted[sorted.length - 1].pa;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (px >= a.p && px <= b.p) {
      const t = (px - a.p) / (b.p - a.p || 1);
      return +(a.pa + t * (b.pa - a.pa)).toFixed(2);
    }
  }
  return null;
}
