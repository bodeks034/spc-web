/**
 * Koji dijagram (silueta vozila) za koji model.
 * Zone (K, M, T…) uvek crta aplikacija — u SVG/PNG ide samo oblík vozila, bez krugova.
 *
 * Ključ = delovi.vozilo_katalog_id ili delovi.id_deo (AUTO-SUV…)
 * Vrednost = putanja u public/ (npr. /vozilo/dijagrami/suv.svg)
 * null = ugrađena limuzina u kodu (CarBodyDetailed)
 */

export const VOZILO_DIJAGRAMI = {
  default: null,

  "FINAL-001": "/vozilo/dijagrami/auto-limuzina.svg",
  "AUTO-001": "/vozilo/dijagrami/auto-limuzina.svg",

  SUV: "/vozilo/dijagrami/suv.svg",
  "AUTO-SUV": "/vozilo/dijagrami/suv.svg",

  KAMION: "/vozilo/dijagrami/kamion.svg",
  "AUTO-KAMION": "/vozilo/dijagrami/kamion.svg",

  DZIP: "/vozilo/dijagrami/dzip.svg",
  "AUTO-DZIP": "/vozilo/dijagrami/dzip.svg",

  KOMBI: "/vozilo/dijagrami/kombi.svg",
  "AUTO-KOMBI": "/vozilo/dijagrami/kombi.svg",

  LIMUZINA: "/vozilo/dijagrami/auto-limuzina.svg",
};

/** @param {{ vozilo_katalog_id?: string, id_deo?: string } | null | undefined} deo */
export function dijagramSrcZaDeo(deo) {
  if (!deo) return VOZILO_DIJAGRAMI.default;
  const keys = [
    deo.vozilo_katalog_id,
    deo.id_deo,
  ].filter(Boolean).map((k) => String(k).trim().toUpperCase());

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(VOZILO_DIJAGRAMI, k)) {
      return VOZILO_DIJAGRAMI[k];
    }
  }
  return VOZILO_DIJAGRAMI.default;
}
