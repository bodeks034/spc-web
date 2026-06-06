import { REF_CSS } from "./uredjaji.js";

/** Telefon / tablet / desktop */
export function klasaUredjaja(ekran) {
  if (ekran.desk) return "desktop";
  if (ekran.telefon) return "telefon";
  return "tablet";
}

/**
 * Skalira px vrednost za telefon i tablet (kao Android dp).
 * Desktop/laptop: vraća istu vrednost bez skaliranja.
 */
export function dp(vrednost, ekran) {
  if (typeof vrednost !== "number" || !Number.isFinite(vrednost)) return vrednost;
  if (ekran.desk) return Math.round(vrednost);
  const klasa = ekran.telefon ? "telefon" : "tablet";
  const ref = REF_CSS[klasa];
  const scale = ekran.kratka / ref.kratka;
  return Math.round(vrednost * scale);
}

export function dpClamp(vrednost, ekran, min, max) {
  const skalirano = dp(vrednost, ekran);
  return Math.min(dp(max, ekran), Math.max(dp(min, ekran), skalirano));
}

/** Padding string "T R B" ili "V H" u px */
export function dpPad(gore, strana, dole, ekran) {
  if (dole === undefined) {
    return `${dp(gore, ekran)}px ${dp(strana, ekran)}px`;
  }
  return `${dp(gore, ekran)}px ${dp(strana, ekran)}px ${dp(dole, ekran)}px`;
}
