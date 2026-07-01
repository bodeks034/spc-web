/**
 * Učitavanje, validacija i normalizacija 8D primera iz src/data/primeri-8d.json.
 * Primeri iz Word arhive dopunjuju ugrađene šablone u troubleshootingSabloni.js.
 */

import { M6_KATEGORIJE } from "./osmdStruktura.js";

export const M6_KLJUCEVI = M6_KATEGORIJE.map((k) => k.key);

/** @typedef {import("./troubleshootingSabloni.js").TroubleshootingSablon} TroubleshootingSablon */

const GRESKE = [];

function trimStr(v) {
  return String(v ?? "").trim();
}

/** Normalizuje niz 5×Zašto — dopunjava praznine. */
export function normalizujWhy(why, podrazumevano = []) {
  const red = Array.isArray(why) ? why.map(trimStr) : [];
  const out = [];
  for (let i = 0; i < 5; i++) {
    out.push(red[i] || podrazumevano[i] || "");
  }
  return out;
}

/** Spaja Ishikawa (6M) iz šablona + kontekst dashboarda. */
export function spojiM6Detalj(sablon, kontekst = {}) {
  const s = sablon ?? {};
  const k = kontekst ?? {};
  const m6 = Object.fromEntries(M6_KLJUCEVI.map((klj) => [klj, ""]));
  const det = s.m6Detalj || {};
  for (const klj of M6_KLJUCEVI) {
    if (trimStr(det[klj])) m6[klj] = trimStr(det[klj]);
  }
  const dominant = s.m6;
  if (dominant && M6_KLJUCEVI.includes(dominant) && !m6[dominant] && s.uzrok) {
    m6[dominant] = trimStr(s.uzrok);
  }
  if (k.topMasine?.[0]) {
    const extra = `Mašina sa najviše NOK: ${k.topMasine[0].naziv} (${k.topMasine[0].nok})`;
    m6.masina = [m6.masina, extra].filter(Boolean).join(" · ");
  }
  return m6;
}

const STOP_DEFEKT = new Set([
  "defekt", "nedostatak", "van", "merna", "tačka", "tačke", "kom", "lot", "spec", "mm",
  "the", "and", "nok", "ok", "broj", "tip", "ostalo",
]);

/** Skor podudarnosti naziva defekta sa šablonom (0 = nema pogotka). */
export function scoreSablonZaDefekt(nazivDefekta, sablon) {
  const dt = trimStr(nazivDefekta).toLowerCase();
  if (dt.length < 2) return 0;

  let score = 0;
  const problem = trimStr(sablon?.problem).toLowerCase();
  const d2sta = trimStr(sablon?.d2?.sta).toLowerCase();

  if (problem && (dt.includes(problem) || problem.includes(dt))) score += 40;
  if (d2sta.length > 8 && (dt.includes(d2sta.slice(0, 14)) || d2sta.includes(dt.slice(0, 14)))) score += 20;

  const tokeni = dt.split(/[\s,;/()+±∆·]+/).filter((t) => t.length > 2 && !STOP_DEFEKT.has(t));

  for (const kl of sablon?.kljucevi || []) {
    if (String(kl).startsWith("_")) continue;
    const k = String(kl).toLowerCase().trim();
    if (k.length < 3) continue;
    if (dt.includes(k)) score += k.length * 2;
    else if (k.length >= 4 && k.includes(dt)) score += dt.length * 2;
    for (const t of tokeni) {
      if (t.length >= 3 && (k.includes(t) || t.includes(k))) score += Math.min(t.length, k.length);
    }
  }

  if (problem) {
    for (const t of tokeni) {
      if (t.length > 3 && problem.includes(t)) score += t.length * 1.5;
    }
  }

  return score;
}

/**
 * @param {object} p
 * @returns {{ ok: boolean, greske: string[], primer?: TroubleshootingSablon }}
 */
export function validirajPrimer8d(p, indeks = 0) {
  const greske = [];
  const pref = `Primer #${indeks + 1}${p?.id ? ` (${p.id})` : ""}`;

  if (!p || typeof p !== "object") {
    return { ok: false, greske: [`${pref}: nije objekat`] };
  }
  if (!trimStr(p.id)) greske.push(`${pref}: nedostaje "id"`);
  if (!Array.isArray(p.kljucevi) || !p.kljucevi.length) {
    greske.push(`${pref}: "kljucevi" mora biti niz sa bar jednom rečju`);
  }
  if (!trimStr(p.problem)) greske.push(`${pref}: nedostaje "problem"`);
  if (!trimStr(p.uzrok) && !trimStr(p.korenskiUzrok)) {
    greske.push(`${pref}: potrebno "uzrok" ili "korenskiUzrok"`);
  }

  if (p.m6 && !M6_KLJUCEVI.includes(p.m6)) {
    greske.push(`${pref}: "m6" mora biti jedan od: ${M6_KLJUCEVI.join(", ")}`);
  }
  if (p.m6Detalj && typeof p.m6Detalj !== "object") {
    greske.push(`${pref}: "m6Detalj" mora biti objekat`);
  }
  if (p.why != null) {
    if (!Array.isArray(p.why)) greske.push(`${pref}: "why" mora biti niz`);
    else if (p.why.filter((w) => trimStr(w)).length < 2) {
      greske.push(`${pref}: "why" — unesite bar 2 koraka 5×Zašto`);
    }
  }

  if (greske.length) return { ok: false, greske };

  return {
    ok: true,
    greske: [],
    primer: {
      id: trimStr(p.id),
      kljucevi: p.kljucevi.map((k) => trimStr(k).toLowerCase()).filter(Boolean),
      problem: trimStr(p.problem),
      uzrok: trimStr(p.uzrok) || trimStr(p.korenskiUzrok),
      korenskiUzrok: trimStr(p.korenskiUzrok) || trimStr(p.uzrok),
      privremena: trimStr(p.privremena),
      resenje: trimStr(p.resenje),
      m6: p.m6 || "metod",
      m6Detalj: p.m6Detalj || {},
      why: p.why ? normalizujWhy(p.why) : null,
      d2: p.d2 || null,
      d7Stavke: Array.isArray(p.d7Stavke) ? p.d7Stavke.map(trimStr).filter(Boolean) : [],
      proces: trimStr(p.proces) || "atributivne",
      izvor: trimStr(p.izvor),
      napomena: trimStr(p.napomena),
      izUvoznogJson: true,
    },
  };
}

/** Učitava i validira primere iz primeri-8d.json. */
export function ucitajPrimere8dIzJson(raw) {
  if (!raw) return { primeri: [], greske: [], verzija: 1 };
  const lista = raw?.primeri || [];
  const validni = [];
  const sveGreske = [];

  lista.forEach((p, i) => {
    const r = validirajPrimer8d(p, i);
    if (r.ok && r.primer) validni.push(r.primer);
    else sveGreske.push(...r.greske);
  });

  return { primeri: validni, greske: sveGreske, verzija: raw?.verzija || 1 };
}

/** Pretvara D4 JSON iz osmd_izvestaji u format primera. */
export function osmdD4uPrimer8d({ id_deo, d2_opis_problema, d4_uzrok, d5_korektivna, d3_privremena_akcija, id }) {
  let d4;
  try {
    d4 = typeof d4_uzrok === "string" ? JSON.parse(d4_uzrok) : d4_uzrok;
  } catch {
    return null;
  }
  if (!d4 || d4._fmt !== 3) return null;

  const grana = d4.grane?.[0];
  if (!grana) return null;

  const whyPopunjen = (grana.why || []).filter((w) => trimStr(w)).length;
  const m6Popunjen = M6_KLJUCEVI.filter((k) => trimStr(d4.m6?.[k])).length;
  if (whyPopunjen < 2 && m6Popunjen < 1) return null;

  const naslov = trimStr(d4.problem_naslov) || trimStr(grana.opis) || id_deo || "primer";
  const slug = naslov.toLowerCase().replace(/[^\w]+/g, "-").slice(0, 40);

  let d2 = null;
  if (d2_opis_problema) {
    try {
      const j = JSON.parse(d2_opis_problema);
      if (j?._fmt === 3) d2 = j;
    } catch { /* plain text */ }
  }

  const dominantM6 = M6_KLJUCEVI.find((k) => trimStr(d4.m6?.[k])) || "metod";

  return {
    id: id ? `osmd-${id}` : `osmd-${slug}`,
    kljucevi: [slug.replace(/-/g, " "), id_deo].filter(Boolean).map((s) => s.toLowerCase()),
    problem: trimStr(d4.opis_problema) || naslov,
    uzrok: trimStr(grana.definitivna) || trimStr(grana.korenski_uzrok) || trimStr(grana.why?.[grana.why.length - 1]),
    korenskiUzrok: trimStr(grana.korenski_uzrok) || trimStr(grana.definitivna),
    privremena: trimStr(grana.privremena),
    resenje: trimStr(d5_korektivna)?.replace(/^•\s*/gm, "").split("\n")[0]
      || trimStr(grana.korenski_uzrok) || trimStr(grana.definitivna),
    m6: dominantM6,
    m6Detalj: { ...(d4.m6 || {}) },
    why: normalizujWhy(grana.why),
    d2,
    d7Stavke: [],
    proces: "oba",
    izvor: `osmd_izvestaji #${id || "?"}`,
    napomena: "Automatski izvezeno iz baze — pregledati pre produkcije",
  };
}
