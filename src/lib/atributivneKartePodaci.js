import { primeniBaselineNaPodatke } from "./spcBaseline.js";

/** Ista priprema podataka kao u SPCKarte (App.jsx). */
export function buildPKartaPodaci(grupe, pBar) {
  const p = pBar ?? 0;
  return (grupe || []).map((g) => ({
    datum: g.datum,
    label: g.label,
    val: +(g.n > 0 ? (g.nok / g.n) * 100 : 0).toFixed(3),
    cl: +(p * 100).toFixed(3),
    ucl: +((p + 3 * Math.sqrt(p * (1 - p) / Math.max(g.n, 1))) * 100).toFixed(3),
    lcl: +(Math.max(0, p - 3 * Math.sqrt(p * (1 - p) / Math.max(g.n, 1))) * 100).toFixed(3),
    n: g.n,
    nok: g.nok,
  }));
}

export function buildCKartaPodaci(rawData, cBar) {
  const cgr = {};
  (rawData || []).forEach((r) => {
    const k = `${r.datum}|${r.greska_naziv || "sve"}`;
    if (!cgr[k]) cgr[k] = { datum: r.datum, naziv: r.greska_naziv || "sve", c: 0 };
    cgr[k].c += r.kom_nok || 0;
  });
  const bar = cBar ?? 0;
  return Object.values(cgr)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((g) => ({
      datum: g.datum,
      naziv: g.naziv,
      val: +g.c.toFixed(0),
      cl: +bar.toFixed(2),
      ucl: +(bar + 3 * Math.sqrt(Math.max(bar, 0.001))).toFixed(2),
      lcl: +(Math.max(0, bar - 3 * Math.sqrt(Math.max(bar, 0.001)))).toFixed(2),
    }));
}

export function pripremaKontrolnaPodaci(podaci, baseline) {
  const pod = (podaci || []).map((d) => ({
    ...d,
    label: d.label || d.datum?.substring(5) || (d.naziv?.substring(0, 8)) || "",
  }));
  return primeniBaselineNaPodatke(pod, baseline).podaci;
}

export function prosekGranica(cd) {
  if (!cd?.length) return { cl: 0, ucl: 0, lcl: 0 };
  return {
    cl: +(cd.reduce((s, d) => s + d.cl, 0) / cd.length).toFixed(4),
    ucl: +(cd.reduce((s, d) => s + d.ucl, 0) / cd.length).toFixed(4),
    lcl: +(cd.reduce((s, d) => s + d.lcl, 0) / cd.length).toFixed(4),
  };
}

export function pBarIzGrupe(grupe) {
  const ukN = (grupe || []).reduce((s, g) => s + g.n, 0);
  const ukNok = (grupe || []).reduce((s, g) => s + g.nok, 0);
  return ukN > 0 ? ukNok / ukN : 0;
}

export function cBarIzGrupe(grupe) {
  if (!grupe?.length) return 0;
  return grupe.reduce((s, g) => s + g.c, 0) / grupe.length;
}

export function buildUKartaPodaci(grupe, uBar) {
  const u = uBar ?? 0;
  return (grupe || []).map((g) => ({
    datum: g.datum,
    label: g.label,
    val: +(g.n > 0 ? g.c / g.n : 0).toFixed(4),
    cl: +u.toFixed(4),
    ucl: +(u + 3 * Math.sqrt(u / Math.max(g.n, 1))).toFixed(4),
    lcl: +(Math.max(0, u - 3 * Math.sqrt(u / Math.max(g.n, 1)))).toFixed(4),
    n: g.n,
  }));
}

export function uBarIzGrupe(grupe) {
  const ukN = (grupe || []).reduce((s, g) => s + g.n, 0);
  if (ukN <= 0) return 0;
  return (grupe || []).reduce((s, g) => s + g.c, 0) / ukN;
}

export function nBarIzGrupe(grupe, ukN) {
  if (!grupe?.length) return 1;
  const n = ukN ?? grupe.reduce((s, g) => s + g.n, 0);
  return n / grupe.length;
}
