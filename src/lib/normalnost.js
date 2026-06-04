import { vrednostZaKarte } from "./varijabilneUtils.js";

export function izvuciVrednostiMerenja(merenja, jedinica) {
  return (merenja || [])
    .map(m => vrednostZaKarte(m.vrednost_raw, m.vrednost_dec, jedinica ?? m.jedinica))
    .filter(Number.isFinite);
}

export function sredina(vals) {
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Uzorak: s sa n-1. */
export function stdUzorak(vals, mu = null) {
  const n = vals.length;
  if (n < 2) return null;
  const m = mu ?? sredina(vals);
  const ss = vals.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(ss / (n - 1));
}

export function normalPdf(x, mu, sigma) {
  if (!Number.isFinite(sigma) || sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Granična asimetrija i spljoštenost (excess kurtosis). */
export function momenti(vals) {
  const n = vals.length;
  if (n < 3) return { skew: null, kurt: null };
  const mu = sredina(vals);
  const s = stdUzorak(vals, mu);
  if (!s || s <= 0) return { skew: null, kurt: null };
  let m3 = 0;
  let m4 = 0;
  vals.forEach(v => {
    const z = (v - mu) / s;
    m3 += z ** 3;
    m4 += z ** 4;
  });
  m3 /= n;
  m4 = m4 / n - 3;
  return { skew: +m3.toFixed(4), kurt: +m4.toFixed(4) };
}

/** Jarque–Bera; približna p-vrednost (χ² sa 2 stepeni). */
export function jarqueBera(vals) {
  const n = vals.length;
  if (n < 20) return null;
  const { skew, kurt } = momenti(vals);
  if (skew == null || kurt == null) return null;
  const jb = (n / 6) * (skew ** 2 + (kurt ** 2) / 4);
  const p = chi2PValueApprox(jb, 2);
  return { jb: +jb.toFixed(4), p: p != null ? +p.toFixed(4) : null, skew, kurt };
}

/** P(X > x) za χ²(k) — Wilson–Hilferty približno. */
function chi2PValueApprox(x, k) {
  if (x <= 0) return 1;
  const z = ((x / k) ** (1 / 3) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k));
  return 1 - normalCdf(z);
}

function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/**
 * Histogram + skala Gausove gustine (broj u binu).
 * gauss ≈ n · Δx · φ(x)
 */
export function histogramIGaus(merenja, bins = 12, jedinica) {
  const vals = izvuciVrednostiMerenja(merenja, jedinica);
  if (!vals.length) {
    return { data: [], mu: null, sigma: null, n: 0, step: null, vals: [] };
  }
  const mu = sredina(vals);
  const sigma = stdUzorak(vals, mu);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const step = (max - min) / bins || 1;
  const n = vals.length;

  const data = Array.from({ length: bins }, (_, i) => {
    const lo = min + i * step;
    const hi = min + (i + 1) * step;
    const mid = (lo + hi) / 2;
    return {
      bin: `${lo.toFixed(3)}–${hi.toFixed(3)}`,
      count: 0,
      mid: +mid.toFixed(6),
      gauss: sigma > 0 ? +(n * step * normalPdf(mid, mu, sigma)).toFixed(4) : 0,
    };
  });

  vals.forEach(v => {
    let i = Math.floor((v - min) / step);
    if (i >= bins) i = bins - 1;
    if (i < 0) i = 0;
    data[i].count += 1;
  });

  return { data, mu: +mu.toFixed(6), sigma: sigma != null ? +sigma.toFixed(6) : null, n, step: +step.toFixed(6), vals };
}

/**
 * Procena normalnosti za Cp/Cpk.
 * status: ok | upozorenje | losno | nedovoljno
 */
export function proceniNormalnost(vals) {
  const n = vals?.length || 0;
  if (n < 8) {
    return {
      ok: false,
      status: "nedovoljno",
      boja: "sivi",
      tekst: `Premalo merenja za procenu normalnosti (n=${n}, preporuka ≥30).`,
      n,
      mu: sredina(vals),
      sigma: stdUzorak(vals),
      skew: null,
      kurt: null,
      jb: null,
      cpkPouzdan: false,
    };
  }

  const mu = sredina(vals);
  const sigma = stdUzorak(vals, mu);
  const { skew, kurt } = momenti(vals);
  const jbRes = jarqueBera(vals);

  let status = "ok";
  let tekst = "Raspodela je približno normalna — Cp/Cpk su pouzdani uz stabilan proces.";

  const skewOk = skew != null && Math.abs(skew) <= 0.5;
  const kurtOk = kurt != null && Math.abs(kurt) <= 1;
  const skewMid = skew != null && Math.abs(skew) <= 1;
  const kurtMid = kurt != null && Math.abs(kurt) <= 2;

  if (!skewMid || !kurtMid) {
    status = "losno";
    tekst = "Raspodela značajno odstupa od normalne — Cp/Cpk mogu preceniti kapabilitet.";
  } else if (!skewOk || !kurtOk || (jbRes?.p != null && jbRes.p < 0.05)) {
    status = "upozorenje";
    tekst = "Umereno odstupanje od normalne — proveri uzrok (alat, uzorak, outlieri) pre Cp/Cpk.";
  }

  if (jbRes?.p != null && jbRes.p < 0.01 && status === "ok") {
    status = "upozorenje";
    tekst = "Jarque–Bera ukazuje na nenormalnost — koristi histogram i SPC karte uz oprez.";
  }

  const boja = status === "ok" ? "zelena" : status === "upozorenje" ? "zuta" : status === "losno" ? "crvena" : "sivi";

  return {
    ok: true,
    status,
    boja,
    tekst,
    n,
    mu,
    sigma,
    skew,
    kurt,
    jb: jbRes?.jb ?? null,
    jbP: jbRes?.p ?? null,
    cpkPouzdan: status === "ok",
  };
}
