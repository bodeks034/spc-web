/**
 * Radna linija u Modulu 0 — fokus na jednoj VOZ/PRO (ili legacy) liniji.
 */

import {
  jeLinijaProizvod,
  jeLinijaVozila,
  normalizujKodLinije,
  predlogSheetaZaLiniju,
} from "./linijaProizvoda.js";

export const RADNA_LINIJA_KEY = "spc_sifrarnik_radna_linija";

export function ucitajRadnuLiniju() {
  try {
    return normalizujKodLinije(localStorage.getItem(RADNA_LINIJA_KEY) || "") || "";
  } catch {
    return "";
  }
}

/** @param {string} kod — prazan string briše izbor */
export function sacuvajRadnuLiniju(kod) {
  try {
    const k = normalizujKodLinije(kod);
    if (k) localStorage.setItem(RADNA_LINIJA_KEY, k);
    else localStorage.removeItem(RADNA_LINIJA_KEY);
  } catch { /* ignore */ }
}

/** Ključ za GlavniUnosSheetBirac: voz:VOZ-01, pro:PRO-02 */
export function kljucRadneLinije(kod) {
  const k = normalizujKodLinije(kod);
  if (jeLinijaVozila(k)) return `voz:${k}`;
  if (jeLinijaProizvod(k)) return `pro:${k}`;
  return k ? `legacy:${k}` : "";
}

/** Predlog GU sheeta za radnu liniju (komponente). */
export function sheetRadneLinije(kod, vrsta = "delovi") {
  const k = normalizujKodLinije(kod);
  if (!k) return null;
  if (jeLinijaVozila(k) || jeLinijaProizvod(k)) return predlogSheetaZaLiniju(k, vrsta);
  return null;
}
