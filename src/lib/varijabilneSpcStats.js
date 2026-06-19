import { chartDataWithWesternElectric, WE_MIN_PODGRUPA_OBRAZAC } from "./spcStats.js";
import { vrednostZaKarte } from "./varijabilneUtils.js";

/** Konstante za X̄/R karte (n = veličina podgrupe, kao u Excel SPC listu). */
export const SPC_FACTORS = {
  2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128, c4: 0.7979, E2: 2.659 },
  3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693, c4: 0.8862, E2: 1.772 },
  4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059, c4: 0.9213, E2: 1.457 },
  5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326, c4: 0.9400, E2: 1.290 },
  6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534, c4: 0.9515, E2: 1.184 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704, c4: 0.9594, E2: 1.109 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847, c4: 0.9650, E2: 1.054 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.97, c4: 0.9693, E2: 1.010 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078, c4: 0.9727, E2: 0.975 },
};

/** I-MR konstante (parno merenje, n=2). */
export const IMR_FACTORS = { d2: 1.128, D4: 3.267, D3: 0, E2: 2.659 };

export const SIGMA_BENCH = [
  { nivo: "6σ", dpmo: "3.4", rty: "99.9997%", opis: "World class", sigma: 6 },
  { nivo: "5σ", dpmo: "233", rty: "99.977%", opis: "Odlično", sigma: 5 },
  { nivo: "4σ", dpmo: "6,210", rty: "99.38%", opis: "Dobro", sigma: 4 },
  { nivo: "3σ", dpmo: "66,807", rty: "93.32%", opis: "Prosečno", sigma: 3 },
  { nivo: "2σ", dpmo: "308,538", rty: "69.15%", opis: "Loše", sigma: 2 },
  { nivo: "1σ", dpmo: "691,462", rty: "30.85%", opis: "Kritično", sigma: 1 },
];

export function sigmaIzDPMO(dpmo) {
  if (dpmo <= 0) return 6.0;
  const tbl = [[3.4, 6], [233, 5], [6210, 4], [66807, 3], [308538, 2], [691462, 1]];
  for (const [lim, s] of tbl) if (dpmo <= lim) return s;
  return 1;
}

export function vrednostMerenja(m, jedinica) {
  return vrednostZaKarte(m.vrednost_raw, m.vrednost_dec, jedinica ?? m.jedinica);
}

export function yDomainSpc(podaci, extra = []) {
  if (!podaci?.length) return ["auto", "auto"];
  const nums = [];
  podaci.forEach(d => {
    if (Number.isFinite(d.val)) nums.push(d.val);
    if (Number.isFinite(d.ucl)) nums.push(d.ucl);
    if (Number.isFinite(d.lcl)) nums.push(d.lcl);
    if (Number.isFinite(d.cl)) nums.push(d.cl);
  });
  extra.forEach(v => { if (Number.isFinite(v)) nums.push(v); });
  if (!nums.length) return ["auto", "auto"];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const pad = Math.max((max - min) * 0.15, (max - min) * 0.05 + 0.001, 0.01);
  return [+(min - pad).toFixed(6), +(max + pad).toFixed(6)];
}

/** Y-os za R / MR kartu — bez LSL/USL dimenzije; raspon uvek čitljiv. */
export function yDomainRangeChart(podaci) {
  if (!podaci?.length) return [0, "auto"];
  const nums = [];
  podaci.forEach(d => {
    if (Number.isFinite(d.val)) nums.push(d.val);
    if (Number.isFinite(d.ucl)) nums.push(d.ucl);
    if (Number.isFinite(d.lcl)) nums.push(d.lcl);
    if (Number.isFinite(d.cl)) nums.push(d.cl);
  });
  if (!nums.length) return [0, "auto"];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = Math.max(max - min, max * 0.05, 0.001);
  const pad = Math.max(span * 0.22, 0.002);
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  return [+yMin.toFixed(6), +yMax.toFixed(6)];
}

export function spcFactors(n) {
  const k = Math.min(10, Math.max(2, Math.round(n)));
  return SPC_FACTORS[k];
}

/** Sortirana merenja → podgrupe veličine n (nepotpuna poslednja se preskače). */
export function podgrupeMerenja(merenja, n = 5, jedinica) {
  const vals = (merenja || [])
    .map(m => ({
      v: vrednostZaKarte(m.vrednost_raw, m.vrednost_dec, jedinica ?? m.jedinica),
      datum: m.datum,
      smena: m.smena,
      status: m.status,
      id: m.id,
      created_at: m.created_at,
    }))
    .filter(m => Number.isFinite(m.v));

  const out = [];
  for (let i = 0; i + n <= vals.length; i += n) {
    const chunk = vals.slice(i, i + n);
    const xs = chunk.map(c => c.v);
    const xbar = xs.reduce((s, x) => s + x, 0) / n;
    const r = Math.max(...xs) - Math.min(...xs);
    out.push({
      idx: out.length + 1,
      label: `#${out.length + 1}`,
      datum: chunk[0].datum,
      smena: chunk[0].smena,
      xbar: +xbar.toFixed(6),
      r: +r.toFixed(6),
      n,
      nok: chunk.filter(c => c.status === "NOK").length,
      values: xs,
    });
  }
  return out;
}

/** X̄ i R karte sa granicama (Western Electric na X̄). */
export function izracunajXbarRKarte(podgrupe, n = 5) {
  if (!podgrupe?.length) {
    return { xbarPodaci: [], rPodaci: [], xbarBar: 0, rBar: 0, sigmaHat: 0, factors: spcFactors(n) };
  }

  const f = spcFactors(n);
  const xbars = podgrupe.map(p => p.xbar);
  const rs = podgrupe.map(p => p.r);
  const xbarBar = xbars.reduce((s, x) => s + x, 0) / xbars.length;
  const rBar = rs.reduce((s, x) => s + x, 0) / rs.length;

  const uclX = xbarBar + f.A2 * rBar;
  const lclX = xbarBar - f.A2 * rBar;
  const uclR = f.D4 * rBar;
  const lclR = f.D3 * rBar;

  const xbarPodaci = podgrupe.map(p => ({
    label: p.label,
    datum: p.datum,
    val: p.xbar,
    cl: +xbarBar.toFixed(6),
    ucl: +uclX.toFixed(6),
    lcl: +lclX.toFixed(6),
    n: p.n,
    nok: p.nok,
    r: p.r,
  }));

  const rPodaci = podgrupe.map(p => ({
    label: p.label,
    datum: p.datum,
    val: p.r,
    cl: +rBar.toFixed(6),
    ucl: +uclR.toFixed(6),
    lcl: +lclR.toFixed(6),
    n: p.n,
    xbar: p.xbar,
  }));

  const sigmaHat = f.d2 > 0 ? rBar / f.d2 : 0;

  const weObrazac = podgrupe.length >= WE_MIN_PODGRUPA_OBRAZAC;

  return {
    xbarPodaci: chartDataWithWesternElectric(xbarPodaci, { obrazacPravila: weObrazac }),
    rPodaci: chartDataWithWesternElectric(rPodaci, { obrazacPravila: false }),
    xbarBar: +xbarBar.toFixed(6),
    rBar: +rBar.toFixed(6),
    sigmaHat: +sigmaHat.toFixed(6),
    factors: f,
    uclX: +uclX.toFixed(6),
    lclX: +lclX.toFixed(6),
    uclR: +uclR.toFixed(6),
    lclR: +lclR.toFixed(6),
  };
}

export function calcCpCpk(xbarBar, sigmaHat, lsl, usl) {
  if (!Number.isFinite(sigmaHat) || sigmaHat <= 0) return { cp: null, cpk: null };
  if (!Number.isFinite(lsl) && !Number.isFinite(usl)) return { cp: null, cpk: null };
  const tol = (Number.isFinite(usl) ? usl : xbarBar) - (Number.isFinite(lsl) ? lsl : xbarBar);
  const cp = tol > 0 ? +(tol / (6 * sigmaHat)).toFixed(3) : null;
  let cpk = null;
  if (Number.isFinite(usl) && Number.isFinite(lsl)) {
    cpk = +Math.min((usl - xbarBar) / (3 * sigmaHat), (xbarBar - lsl) / (3 * sigmaHat)).toFixed(3);
  } else if (Number.isFinite(usl)) {
    cpk = +((usl - xbarBar) / (3 * sigmaHat)).toFixed(3);
  } else if (Number.isFinite(lsl)) {
    cpk = +((xbarBar - lsl) / (3 * sigmaHat)).toFixed(3);
  }
  return { cp, cpk };
}

/** Cp/Cpk: >=1.33 zeleno, 1.0-1.33 zuto, <1.0 crveno */
export function bojaKapabiliteta(v, C) {
  if (v == null || !Number.isFinite(v)) return C.sivi;
  if (v >= 1.33) return C.zelena;
  if (v >= 1.0) return C.zuta;
  return C.crvena;
}

export function paretoNokPoPoziciji(merenja, limit = 8) {
  const g = {};
  (merenja || []).forEach(m => {
    if (m.status !== "NOK") return;
    const k = m.pozicija || "?";
    g[k] = (g[k] || 0) + 1;
  });
  const sor = Object.entries(g).map(([naziv, count]) => ({ naziv, count }))
    .sort((a, b) => b.count - a.count).slice(0, limit);
  const uk = sor.reduce((s, d) => s + d.count, 0);
  let kum = 0;
  return sor.map(d => { kum += d.count; return { ...d, kum: uk > 0 ? +((kum / uk) * 100).toFixed(1) : 0 }; });
}

export function statPoSmeni(merenja) {
  const sm = {
    1: { s: "Smena 1", ok: 0, nok: 0, n: 0 },
    2: { s: "Smena 2", ok: 0, nok: 0, n: 0 },
    3: { s: "Smena 3", ok: 0, nok: 0, n: 0 },
  };
  (merenja || []).forEach(m => {
    const s = sm[m.smena];
    if (!s) return;
    s.n += 1;
    if (m.status === "NOK") s.nok += 1;
    else s.ok += 1;
  });
  return Object.values(sm).map(s => ({
    ...s,
    rty: s.n > 0 ? +((s.ok / s.n) * 100).toFixed(1) : 0,
    p: s.n > 0 ? +((s.nok / s.n) * 100).toFixed(2) : 0,
  }));
}

/** Agregat OK/NOK po polju (masina, kontrolor, operater, …). */
export function statPoGrupi(merenja, polje = "masina") {
  const g = {};
  (merenja || []).forEach(m => {
    const k = String(m[polje] ?? "").trim() || "Nepoznato";
    if (!g[k]) g[k] = { naziv: k, ok: 0, nok: 0, n: 0 };
    g[k].n += 1;
    if ((m.status || "").toUpperCase() === "NOK") g[k].nok += 1;
    else g[k].ok += 1;
  });
  return Object.values(g)
    .map(o => ({
      ...o,
      rty: o.n > 0 ? +((o.ok / o.n) * 100).toFixed(1) : 0,
      p: o.n > 0 ? +((o.nok / o.n) * 100).toFixed(2) : 0,
      dpmo: o.n > 0 ? Math.round((o.nok / o.n) * 1e6) : 0,
    }))
    .sort((a, b) => b.nok - a.nok || b.n - a.n);
}

/** Heatmap: pozicija (dimenzija) × mašina — broj NOK merenja. */
export function korelacijaPozicijaMasina(merenja, limitPoz = 10) {
  const nokRows = (merenja || []).filter(m => (m.status || "").toUpperCase() === "NOK");
  const masine = [...new Set(nokRows.map(m => String(m.masina || "").trim() || "Nepoznata"))];
  const pozG = {};
  nokRows.forEach(m => {
    const p = m.pozicija || "?";
    pozG[p] = (pozG[p] || 0) + 1;
  });
  const pozicije = Object.entries(pozG)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limitPoz)
    .map(([p]) => p);

  const pivot = {};
  pozicije.forEach(p => {
    pivot[p] = {};
    masine.forEach(ma => { pivot[p][ma] = 0; });
  });
  nokRows.forEach(m => {
    const p = m.pozicija || "?";
    if (!pivot[p]) return;
    const ma = String(m.masina || "").trim() || "Nepoznata";
    pivot[p][ma] = (pivot[p][ma] || 0) + 1;
  });

  const maxVal = Math.max(
    0,
    ...pozicije.flatMap(p => masine.map(ma => pivot[p]?.[ma] || 0)),
  );
  return { masine, pozicije, pivot, maxVal, ukNok: nokRows.length };
}

export function histogramMerenja(merenja, bins = 12, jedinica) {
  const vals = (merenja || [])
    .map(m => vrednostZaKarte(m.vrednost_raw, m.vrednost_dec, jedinica ?? m.jedinica))
    .filter(Number.isFinite);
  if (!vals.length) return [];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const step = (max - min) / bins || 1;
  const counts = Array.from({ length: bins }, (_, i) => ({
    bin: `${(min + i * step).toFixed(2)}–${(min + (i + 1) * step).toFixed(2)}`,
    count: 0,
    mid: min + (i + 0.5) * step,
  }));
  vals.forEach(v => {
    let i = Math.floor((v - min) / step);
    if (i >= bins) i = bins - 1;
    if (i < 0) i = 0;
    counts[i].count += 1;
  });
  return counts;
}

/** Pojedinačna merenja (I-karta). */
export function pojedinacnaMerenja(merenja, jedinica) {
  return (merenja || [])
    .map((m, i) => {
      const v = vrednostMerenja(m, jedinica);
      if (v == null) return null;
      return {
        idx: i + 1,
        label: `#${i + 1}`,
        datum: m.datum,
        smena: m.smena,
        val: v,
        status: m.status,
      };
    })
    .filter(Boolean);
}

/** I-MR karte sa Western Electric na I i MR. */
export function izracunajIMRKarte(merenja, jedinica) {
  const ind = pojedinacnaMerenja(merenja, jedinica);
  if (ind.length < 2) {
    return { iPodaci: [], mrPodaci: [], xBar: 0, mrBar: 0, sigmaHat: 0 };
  }

  const f = IMR_FACTORS;
  const xs = ind.map(d => d.val);
  const xBar = xs.reduce((s, x) => s + x, 0) / xs.length;

  const mrRaw = [];
  for (let i = 1; i < xs.length; i++) {
    mrRaw.push(Math.abs(xs[i] - xs[i - 1]));
  }
  const mrBar = mrRaw.reduce((s, x) => s + x, 0) / mrRaw.length;

  const uclI = xBar + f.E2 * mrBar;
  const lclI = xBar - f.E2 * mrBar;
  const uclMR = f.D4 * mrBar;
  const lclMR = f.D3 * mrBar;

  const iPodaci = ind.map(d => ({
    label: d.label,
    datum: d.datum,
    val: d.val,
    cl: +xBar.toFixed(6),
    ucl: +uclI.toFixed(6),
    lcl: +lclI.toFixed(6),
    status: d.status,
  }));

  const mrPodaci = mrRaw.map((mr, i) => ({
    label: `#${i + 2}`,
    datum: ind[i + 1].datum,
    val: +mr.toFixed(6),
    cl: +mrBar.toFixed(6),
    ucl: +uclMR.toFixed(6),
    lcl: +lclMR.toFixed(6),
  }));

  const sigmaHat = f.d2 > 0 ? mrBar / f.d2 : 0;

  const weObrazac = ind.length >= WE_MIN_PODGRUPA_OBRAZAC;

  return {
    iPodaci: chartDataWithWesternElectric(iPodaci, { obrazacPravila: weObrazac }),
    mrPodaci: chartDataWithWesternElectric(mrPodaci, { obrazacPravila: false }),
    xBar: +xBar.toFixed(6),
    mrBar: +mrBar.toFixed(6),
    sigmaHat: +sigmaHat.toFixed(6),
    uclI: +uclI.toFixed(6),
    lclI: +lclI.toFixed(6),
    uclMR: +uclMR.toFixed(6),
    lclMR: +lclMR.toFixed(6),
  };
}

/** RTY / DPMO trend po danu (OK/NOK po merenju). */
export function trendKvalitetaPoDanu(merenja) {
  const g = {};
  (merenja || []).forEach(m => {
    const k = m.datum || "?";
    if (!g[k]) g[k] = { datum: k, label: k?.substring?.(5) || k, ok: 0, nok: 0, n: 0 };
    g[k].n += 1;
    if (m.status === "NOK") g[k].nok += 1;
    else g[k].ok += 1;
  });
  return Object.values(g)
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
    .map(d => ({
      ...d,
      rty: d.n > 0 ? +((d.ok / d.n) * 100).toFixed(2) : 0,
      p: d.n > 0 ? +((d.nok / d.n) * 100).toFixed(2) : 0,
      dpmo: d.n > 0 ? Math.round((d.nok / d.n) * 1e6) : 0,
    }));
}

/** Agregat kvaliteta za dashboard. */
export function agregatKvaliteta(merenja) {
  const n = (merenja || []).length;
  const nok = (merenja || []).filter(m => m.status === "NOK").length;
  const ok = n - nok;
  const rty = n > 0 ? +((ok / n) * 100).toFixed(3) : 0;
  const dpmo = n > 0 ? Math.round((nok / n) * 1e6) : 0;
  const sigma = sigmaIzDPMO(dpmo);
  const p = n > 0 ? +((nok / n) * 100).toFixed(2) : 0;
  return { n, ok, nok, rty, dpmo, sigma, p };
}

/** NOK po poziciji za dashboard deo. */
export function nokPoPozicijiDashboard(merenja) {
  const g = {};
  (merenja || []).forEach(m => {
    const k = m.pozicija || "?";
    if (!g[k]) g[k] = { pozicija: k, ok: 0, nok: 0, n: 0 };
    g[k].n += 1;
    if (m.status === "NOK") g[k].nok += 1;
    else g[k].ok += 1;
  });
  return Object.values(g).map(d => ({
    ...d,
    rty: d.n > 0 ? +((d.ok / d.n) * 100).toFixed(1) : 0,
    dpmo: d.n > 0 ? Math.round((d.nok / d.n) * 1e6) : 0,
  })).sort((a, b) => b.nok - a.nok);
}

/** Proces sigma iz Cp (short-term) ili iz DPMO (long-term). */
export function sigmaProcesa(cpk, sigmaIzMerenja, dpmo) {
  if (cpk?.cpk != null && cpk.cpk > 0) return +Math.min(6, cpk.cpk * 3).toFixed(2);
  if (sigmaIzMerenja > 0 && cpk?.cp != null) return +Math.min(6, cpk.cp * 3).toFixed(2);
  return sigmaIzDPMO(dpmo);
}
