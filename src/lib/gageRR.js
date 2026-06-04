/**
 * Gage R&R — crossed study, Average & Range metoda (AIAG MSA).
 * matrica[deo][operater][ponavljanje] = broj
 */

const K1 = { 2: 3.65, 3: 3.05, 4: 2.7, 5: 2.52, 6: 2.35, 7: 2.23, 8: 2.13, 9: 2.05, 10: 1.98 };
const K2 = { 2: 3.65, 3: 2.7, 4: 2.3, 5: 2.08, 6: 1.93, 7: 1.82, 8: 1.74, 9: 1.67, 10: 1.62 };
const K3 = {
  2: 3.65, 3: 2.7, 4: 2.3, 5: 2.08, 6: 1.93, 7: 1.82, 8: 1.74, 9: 1.67, 10: 1.62,
  11: 1.56, 12: 1.51, 13: 1.47, 14: 1.43, 15: 1.18,
};

function k1(r) { return K1[Math.min(10, Math.max(2, r))] ?? 1.98; }
function k2(b) { return K2[Math.min(10, Math.max(2, b))] ?? 1.62; }
function k3(a) { return K3[Math.min(15, Math.max(2, a))] ?? 1.18; }

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Parsira 2D/3D niz ili ravan listu sa indeksima. */
export function normalizujMatricu(raw, nDelova, nOperatera, nPonavljanja) {
  const out = [];
  for (let i = 0; i < nDelova; i++) {
    out[i] = [];
    for (let j = 0; j < nOperatera; j++) {
      out[i][j] = [];
      for (let k = 0; k < nPonavljanja; k++) {
        let v = null;
        if (Array.isArray(raw?.[i]?.[j])) v = num(raw[i][j][k]);
        else if (Array.isArray(raw?.[i]) && raw[i].length === nOperatera * nPonavljanja) {
          v = num(raw[i][j * nPonavljanja + k]);
        }
        out[i][j][k] = v;
      }
    }
  }
  return out;
}

export function validacijaMatrice(matrica) {
  const praznine = [];
  const vrednosti = [];
  matrica.forEach((deo, i) => {
    deo.forEach((op, j) => {
      op.forEach((v, k) => {
        if (v == null) praznine.push({ i, j, k });
        else vrednosti.push(v);
      });
    });
  });
  if (praznine.length) {
    return { ok: false, poruka: `Nedostaje ${praznine.length} merenja — popuni celu matricu.` };
  }
  if (vrednosti.length < 4) {
    return { ok: false, poruka: "Potrebno je najmanje 4 merenja." };
  }
  return { ok: true, n: vrednosti.length };
}

/**
 * @param {number[][][]} matrica
 * @param {{ tolerancija?: number }} opcije — USL-LSL ili 6σ spec
 */
export function izracunajGageRR(matrica, opcije = {}) {
  const a = matrica.length;
  const b = matrica[0]?.length || 0;
  const r = matrica[0]?.[0]?.length || 0;
  if (a < 2 || b < 2 || r < 2) {
    return { ok: false, poruka: "Minimum: 2 dela, 2 operatera, 2 ponavljanja." };
  }

  const val = validacijaMatrice(matrica);
  if (!val.ok) return { ok: false, poruka: val.poruka };

  const prosekIO = [];
  const opsegIO = [];

  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      const trial = matrica[i][j];
      const avg = trial.reduce((s, x) => s + x, 0) / r;
      const range = Math.max(...trial) - Math.min(...trial);
      prosekIO.push(avg);
      opsegIO.push(range);
    }
  }

  const rBar = opsegIO.reduce((s, x) => s + x, 0) / opsegIO.length;
  const xGrand = prosekIO.reduce((s, x) => s + x, 0) / prosekIO.length;

  const prosekPoOperatoru = [];
  for (let j = 0; j < b; j++) {
    let s = 0;
    let c = 0;
    for (let i = 0; i < a; i++) {
      s += matrica[i][j].reduce((ss, x) => ss + x, 0) / r;
      c += 1;
    }
    prosekPoOperatoru.push(s / c);
  }

  const prosekPoDelu = [];
  for (let i = 0; i < a; i++) {
    let s = 0;
    for (let j = 0; j < b; j++) {
      s += matrica[i][j].reduce((ss, x) => ss + x, 0) / r;
    }
    prosekPoDelu.push(s / b);
  }

  const xDiff = Math.max(...prosekPoOperatoru) - Math.min(...prosekPoOperatoru);
  const rp = Math.max(...prosekPoDelu) - Math.min(...prosekPoDelu);

  const EV = rBar * k1(r);
  const avSq = Math.max(0, (xDiff * k2(b)) ** 2 - (EV ** 2) / (a * r));
  const AV = Math.sqrt(avSq);
  const PV = rp * k3(a);
  const GRR = Math.sqrt(EV ** 2 + AV ** 2);
  const TV = Math.sqrt(GRR ** 2 + PV ** 2);

  const pct = (x, base) => (base > 0 ? +(100 * x / base).toFixed(2) : null);

  const pctRepeat = pct(EV, TV);
  const pctReprod = pct(AV, TV);
  const pctGRR = pct(GRR, TV);
  const pctPart = pct(PV, TV);

  const tolerancija = Number(opcije.tolerancija);
  const pctTolGRR = Number.isFinite(tolerancija) && tolerancija > 0
    ? +(100 * GRR / tolerancija).toFixed(2)
    : null;

  const ndc = GRR > 0 ? Math.floor(1.41 * PV / GRR) : 0;

  const odluka = proceniMSA({ pctGRR, pctTolGRR, ndc });

  return {
    ok: true,
    metoda: "xbar_r",
    nDelova: a,
    nOperatera: b,
    nPonavljanja: r,
    xGrand: +xGrand.toFixed(6),
    rBar: +rBar.toFixed(6),
    EV: +EV.toFixed(6),
    AV: +AV.toFixed(6),
    PV: +PV.toFixed(6),
    GRR: +GRR.toFixed(6),
    TV: +TV.toFixed(6),
    pctRepeat,
    pctReprod,
    pctGRR,
    pctPart,
    pctTolGRR,
    ndc,
    prosekPoOperatoru: prosekPoOperatoru.map(v => +v.toFixed(6)),
    prosekPoDelu: prosekPoDelu.map(v => +v.toFixed(6)),
    odluka,
  };
}

/** AIAG pragovi (% ukupne varijacije i ndc). */
export function proceniMSA({ pctGRR, pctTolGRR, ndc }) {
  const grr = pctTolGRR != null && pctTolGRR > (pctGRR ?? 0) ? pctTolGRR : pctGRR;
  if (grr == null) return { status: "nepoznato", tekst: "Nema dovoljno podataka", boja: "sivi" };

  let status = "prihvatljivo";
  let tekst = "Merilo prihvatljivo za kontrolu procesa";

  if (grr > 30 || ndc < 2) {
    status = "neprihvatljivo";
    tekst = "Merilo neprihvatljivo — potrebna korekcija / kalibracija / obuka";
  } else if (grr > 10 || ndc < 5) {
    status = "uslovno";
    tekst = "Uslovno prihvatljivo — prati i smanji varijaciju merenja";
  }

  const boja = status === "prihvatljivo" ? "zelena" : status === "uslovno" ? "zuta" : "crvena";
  return { status, tekst, boja, koriscenPct: grr };
}

export function praznaMatrica(nDelova, nOperatera, nPonavljanja) {
  return Array.from({ length: nDelova }, () =>
    Array.from({ length: nOperatera }, () =>
      Array.from({ length: nPonavljanja }, () => "")));
}

export const GAGE_RR_STORAGE_KEY = "spc_gage_rr_studije";

export function ucitajStudije() {
  try {
    return JSON.parse(localStorage.getItem(GAGE_RR_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function snimiStudiju(studija) {
  const list = ucitajStudije().filter(s => s.id !== studija.id);
  list.unshift(studija);
  localStorage.setItem(GAGE_RR_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}

/** ANOVA — komponente varijanse (crossed, uključuje interakciju deo×operater). */
export function izracunajGageRRAnova(matrica, opcije = {}) {
  const a = matrica.length;
  const b = matrica[0]?.length || 0;
  const r = matrica[0]?.[0]?.length || 0;
  if (a < 2 || b < 2 || r < 2) {
    return { ok: false, poruka: "Minimum: 2 dela, 2 operatera, 2 ponavljanja." };
  }
  const val = validacijaMatrice(matrica);
  if (!val.ok) return { ok: false, poruka: val.poruka };

  let n = 0;
  let grand = 0;
  const x_ij = [];
  const x_i = [];
  const x_j = [];

  for (let i = 0; i < a; i++) {
    x_ij[i] = [];
    let si = 0;
    let ci = 0;
    for (let j = 0; j < b; j++) {
      const trial = matrica[i][j];
      const m = trial.reduce((s, x) => s + x, 0) / r;
      x_ij[i][j] = m;
      trial.forEach(y => { grand += y; n += 1; si += y; ci += 1; });
    }
    x_i.push(si / ci);
  }

  for (let j = 0; j < b; j++) {
    let s = 0;
    let c = 0;
    for (let i = 0; i < a; i++) {
      matrica[i][j].forEach(y => { s += y; c += 1; });
    }
    x_j.push(s / c);
  }
  grand /= n;

  let SS_A = 0;
  let SS_B = 0;
  let SS_AB = 0;
  let SS_E = 0;

  for (let i = 0; i < a; i++) SS_A += b * r * (x_i[i] - grand) ** 2;
  for (let j = 0; j < b; j++) SS_B += a * r * (x_j[j] - grand) ** 2;
  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      SS_AB += r * (x_ij[i][j] - x_i[i] - x_j[j] + grand) ** 2;
    }
  }
  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      matrica[i][j].forEach(y => { SS_E += (y - x_ij[i][j]) ** 2; });
    }
  }

  const df_A = a - 1;
  const df_B = b - 1;
  const df_AB = (a - 1) * (b - 1);
  const df_E = a * b * (r - 1);

  const MS_A = df_A > 0 ? SS_A / df_A : 0;
  const MS_B = df_B > 0 ? SS_B / df_B : 0;
  const MS_AB = df_AB > 0 ? SS_AB / df_AB : 0;
  const MS_E = df_E > 0 ? SS_E / df_E : 0;

  const varRepeat = MS_E;
  const varInter = Math.max(0, (MS_AB - MS_E) / r);
  const varReprod = Math.max(0, (MS_B - MS_AB) / (a * r));
  const varPart = Math.max(0, (MS_A - MS_AB) / (b * r));

  const EV = Math.sqrt(varRepeat);
  const AV = Math.sqrt(varReprod);
  const IV = Math.sqrt(varInter);
  const PV = Math.sqrt(varPart);
  const GRR = Math.sqrt(varRepeat + varReprod + varInter);
  const TV = Math.sqrt(GRR ** 2 + PV ** 2);

  const pct = (x, base) => (base > 0 ? +(100 * x / base).toFixed(2) : null);
  const pctRepeat = pct(EV, TV);
  const pctReprod = pct(Math.sqrt(varReprod + varInter), TV);
  const pctGRR = pct(GRR, TV);
  const pctPart = pct(PV, TV);

  const tolerancija = Number(opcije.tolerancija);
  const pctTolGRR = Number.isFinite(tolerancija) && tolerancija > 0
    ? +(100 * GRR / tolerancija).toFixed(2)
    : null;
  const ndc = GRR > 0 ? Math.floor(1.41 * PV / GRR) : 0;
  const odluka = proceniMSA({ pctGRR, pctTolGRR, ndc });

  return {
    ok: true,
    metoda: "anova",
    nDelova: a,
    nOperatera: b,
    nPonavljanja: r,
    xGrand: +grand.toFixed(6),
    EV: +EV.toFixed(6),
    AV: +AV.toFixed(6),
    IV: +IV.toFixed(6),
    PV: +PV.toFixed(6),
    GRR: +GRR.toFixed(6),
    TV: +TV.toFixed(6),
    pctRepeat,
    pctReprod,
    pctGRR,
    pctPart,
    pctTolGRR,
    ndc,
    MS_E: +MS_E.toFixed(8),
    MS_AB: +MS_AB.toFixed(8),
    odluka,
  };
}

/** Obe metode; primarna odluka po većem %GRR (konzervativno). */
export function izracunajGageRRKompletno(matrica, opcije = {}) {
  const xbar = izracunajGageRR(matrica, opcije);
  const anova = izracunajGageRRAnova(matrica, opcije);
  if (!xbar.ok && !anova.ok) {
    return { ok: false, poruka: xbar.poruka || anova.poruka || "Greška u izračunu." };
  }

  const pctX = xbar.ok ? xbar.pctGRR : null;
  const pctA = anova.ok ? anova.pctGRR : null;
  const pctGRR = Math.max(pctX ?? 0, pctA ?? 0) || null;
  const pctTolX = xbar.ok ? xbar.pctTolGRR : null;
  const pctTolA = anova.ok ? anova.pctTolGRR : null;
  const pctTolGRR = pctTolX != null || pctTolA != null
    ? Math.max(pctTolX ?? 0, pctTolA ?? 0)
    : null;
  const ndc = Math.min(
    xbar.ok ? xbar.ndc : 99,
    anova.ok ? anova.ndc : 99,
  );
  const odluka = proceniMSA({ pctGRR, pctTolGRR, ndc });

  return {
    ok: true,
    xbar: xbar.ok ? xbar : null,
    anova: anova.ok ? anova : null,
    primarni: odluka,
    pctGRR,
    pctTolGRR,
    ndc,
    odluka,
  };
}
