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

  if (s.length < 6) return false;

  const segments = s.split("-").filter(Boolean);

  if (segments.length < 2) return s.length >= 6;

  const suffix = segments[segments.length - 1];

  return suffix.length >= 3;

}



/** Tačan pun ID (poslednji segment min. 3 znaka) — za eq filter u bazi. */

export function jePunIdDeo(id) {

  const s = normalizujIdDeo(id);

  const segments = s.split("-").filter(Boolean);

  return segments.length >= 2 && segments[segments.length - 1].length >= 3;

}


