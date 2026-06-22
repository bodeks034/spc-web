/**
 * FPY vs RTY
 *
 * FPY (First Pass Yield) — prolaznost jedne faze/koraka (lokalna dijagnostika).
 * RTY (Rolled Throughput Yield) — ukupna prolaznost kroz lanac: RTY = FPY₁ × FPY₂ × …
 *
 * OEE i izveštaji efikasnosti pogona koriste RTY u faktoru kvaliteta.
 */

/** UI oznake jedne faze (SPC karte) — ne mešati sa RTY pogona. */
export const LAB_FPY_TAB = "FPY (faza)";
export const LAB_FPY_PCT = "FPY %";
export const LAB_FPY_KRATKO = "FPY";
export const LAB_FPY_CILJ = "FPY cilj %";
export const LAB_FPY_TREND = "FPY % trend";

export function calcFPY(ispravnoIzPrve, ukupno) {
  const uk = Number(ukupno) || 0;
  const fp = Number(ispravnoIzPrve) || 0;
  return uk > 0 ? +((fp / uk) * 100).toFixed(1) : 0;
}

/** RTY iz liste FPY vrednosti (%). Jedna faza → FPY; više faza → proizvod. */
export function calcRTYIzFaza(...fpyUnosi) {
  const procenati = fpyUnosi.flatMap(v => {
    if (v == null) return [];
    if (typeof v === "object") {
      const f = v.fpy ?? v.rty;
      return f != null && Number(v.ukupno ?? v.n ?? 1) > 0 ? [Number(f)] : [];
    }
    return [Number(v)];
  }).filter(n => Number.isFinite(n) && n >= 0);

  if (!procenati.length) return null;
  if (procenati.length === 1) return +procenati[0].toFixed(1);

  const proizvod = procenati.reduce((acc, f) => acc * (f / 100), 1);
  return +(proizvod * 100).toFixed(1);
}

/** Faze pogona (atributivne, merljive, …) + ukupni RTY. */
export function fazeKvalitetaPogona({ attr = null, merljive = null, dodatne = [] } = {}) {
  const faze = [];

  if (attr && Number(attr.ukupno) > 0) {
    const fpy = Number(attr.fpy ?? attr.rty) || 0;
    faze.push({
      id: "atributivne",
      naziv: "Atributivne",
      fpy,
      ukupno: attr.ukupno,
      neusaglaseno: attr.neusaglaseno,
      dpmo: attr.dpmo,
    });
  }

  if (merljive && Number(merljive.ukupno) > 0) {
    const fpy = Number(merljive.fpy ?? merljive.rty) || 0;
    faze.push({
      id: "merljive",
      naziv: "Merljive",
      fpy,
      ukupno: merljive.ukupno,
      neusaglaseno: merljive.neusaglaseno,
      dpmo: merljive.dpmo,
    });
  }

  for (const f of dodatne || []) {
    if (f && Number(f.ukupno) > 0 && (f.fpy != null || f.rty != null)) {
      faze.push({
        id: f.id || f.naziv,
        naziv: f.naziv || f.id,
        fpy: Number(f.fpy ?? f.rty) || 0,
        ukupno: f.ukupno,
        neusaglaseno: f.neusaglaseno,
        dpmo: f.dpmo,
      });
    }
  }

  const rty = calcRTYIzFaza(...faze);
  return { faze, rty };
}

/** Koji FPY faza najviše vuče RTY nadole (gap od 100%). */
export function najslabijaFaza(faze = []) {
  if (!faze.length) return null;
  return [...faze].sort((a, b) => (a.fpy ?? 100) - (b.fpy ?? 100))[0];
}

/** OEE kvalitet faktor iz RTY (%). */
export function kvalitetFaktorIzRty(rty) {
  const r = Number(rty);
  return Number.isFinite(r) && r >= 0 ? Math.max(0, Math.min(1, r / 100)) : null;
}

/** OEE iz A × P × RTY (ili × FPY kad je jedna faza). */
export function izracunajOeeSaKvalitetom({
  availability = null,
  performance = null,
  rty = null,
  fpy = null,
} = {}) {
  const q = kvalitetFaktorIzRty(rty ?? fpy);
  if (q == null) return null;

  const a = availability != null ? Math.max(0, Math.min(1, Number(availability))) : null;
  const p = performance != null ? Math.max(0, Math.min(1, Number(performance))) : 1;

  if (a != null) return +(a * p * q * 100).toFixed(1);
  return +(p * q * 100).toFixed(1);
}
