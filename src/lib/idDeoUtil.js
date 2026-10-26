/** Normalizacija ID dela (NM-001, DEMO-NM-001, …). */

const DASH_VARIANTS = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;



export function normalizujIdDeo(id) {

  return String(id || "")

    .replace(ZERO_WIDTH, "")

    .trim()

    .toUpperCase()

    .replace(/\s+/g, "")

    .replace(DASH_VARIANTS, "-");

}



/** Da li se dva ID-a odnose na isti deo (posle normalizacije). */

export function idDeoPoklapaSe(a, b) {

  const na = normalizujIdDeo(a);

  const nb = normalizujIdDeo(b);

  return Boolean(na && nb && na === nb);

}



/**

 * Da li je ID dovoljno potpun za učitavanje / pretragu.

 * Podržava višestruke crtice: DEMO-NM-001, NM-001.

 */

export function idSpremanZaUcitavanje(id) {

  const s = normalizujIdDeo(id);

  if (s.length < 4) return false;

  const segments = s.split("-").filter(Boolean);

  if (segments.length < 2) return s.length >= 6;

  const suffix = segments[segments.length - 1];

  if (suffix.length >= 3) return true;

  /** npr. 5502-A, NT-1 — prefiks min. 3 znaka, sufiks 1+ */
  if (suffix.length >= 1 && segments[0].length >= 3) return true;

  return s.length >= 6;

}



/** Tačan pun ID (poslednji segment min. 3 znaka) — za eq filter u bazi. */

export function jePunIdDeo(id) {

  const s = normalizujIdDeo(id);

  const segments = s.split("-").filter(Boolean);

  if (segments.length < 2) return s.length >= 6;

  const suffix = segments[segments.length - 1];

  if (suffix.length >= 3) return true;

  return suffix.length >= 1 && segments[0].length >= 3;

}



/**

 * Pun ID (npr. 5502-A) poredi se samo sa id_deo.

 * Kraći upit ostaje podstring i po ostalim kolonama (RN, naziv…).

 */

export function odgovaraFilteruIdDeo(idDeo, filter, ostalaPolja = []) {

  const q = String(filter ?? "").trim();

  if (!q) return true;

  if (jePunIdDeo(q)) return idDeoPoklapaSe(idDeo, q);

  const n = q.toLowerCase();

  return [idDeo, ...ostalaPolja].some((s) => String(s ?? "").toLowerCase().includes(n));

}


