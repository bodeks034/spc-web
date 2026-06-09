/**
 * Dimenzije kartice kolone merenja (merljive).
 * Desktop/laptop: layout/merljive/kolonaUnos.js → DIM_KOLONA_UNOS_DESKTOP
 * Telefon/tablet karusel: DIM_KOLONA_UNOS_MOB
 */

/** Desktop + laptop — 5 kolona u redu */
export const DIM_KOLONA_UNOS_DESKTOP = {
  kartica: {
    padding: 10,
    borderRadius: 8,
    borderAktivna: 2,
    borderObicna: 1,
  },
  metaRed: {
    naslovFont: 8,
    vrednostFont: 10,
    marginBottom: 3,
    lineHeight: 1.25,
    naslovLetterSpacing: 0.4,
    vrednostFontWeight: 400,
    vrednostFontWeightAccent: 600,
  },
  metaLslUsl: {
    gap: 6,
    marginBottom: 3,
    vrednostFontWeight: 500,
  },
  plausibilnost: {
    fontSize: 8,
    marginTop: 2,
    marginBottom: 1,
  },
  labelUnos: {
    fontSize: 8,
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  inputMerenje: {
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 10px",
    minHeight: 34,
    borderRadius: 6,
    marginBottom: 6,
  },
  dugmeDodaj: {
    width: "100%",
    padding: "11px 14px",
    minHeight: 38,
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 6,
    marginBottom: 6,
  },
  okNok: {
    gap: 6,
    marginBottom: 6,
    minHeight: 40,
    padding: "5px 6px",
    labelFont: 8,
    brojFont: 18,
    borderRadius: 6,
  },
  lista: {
    labelFont: 8,
    marginBottom: 2,
    fontSize: 11,
    itemPadding: "3px 6px",
    minHeight: 0,
    maxHeight: null,
  },
};

/** Telefon / tablet — karusel jedne kolone */
export const DIM_KOLONA_UNOS_MOB = {
  kartica: {
    padding: 6,
    borderRadius: 8,
    borderAktivna: 2,
    borderObicna: 1,
  },
  metaRed: {
    naslovFont: 7,
    vrednostFont: 9,
    marginBottom: 2,
    lineHeight: 1.2,
    naslovLetterSpacing: 0.3,
    vrednostFontWeight: 400,
    vrednostFontWeightAccent: 600,
  },
  metaLslUsl: {
    gap: 4,
    marginBottom: 2,
    vrednostFontWeight: 500,
  },
  plausibilnost: {
    fontSize: 7,
    marginTop: 1,
    marginBottom: 1,
  },
  labelUnos: {
    fontSize: 7,
    marginTop: 2,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  inputMerenje: {
    fontSize: 14,
    fontWeight: 600,
    padding: "7px 10px",
    minHeight: 34,
    borderRadius: 6,
    marginBottom: 4,
  },
  dugmeDodaj: {
    width: "100%",
    padding: "7px 10px",
    minHeight: 32,
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 6,
    marginBottom: 4,
  },
  okNok: {
    gap: 4,
    marginBottom: 4,
    minHeight: 28,
    padding: "2px 3px",
    labelFont: 7,
    brojFont: 13,
    borderRadius: 5,
  },
  lista: {
    labelFont: 7,
    marginBottom: 1,
    fontSize: 9,
    itemPadding: "1px 4px",
    minHeight: 36,
    maxHeight: 88,
  },
};

export function dimKolonaUnos({ kompakt = false } = {}) {
  return kompakt ? DIM_KOLONA_UNOS_MOB : DIM_KOLONA_UNOS_DESKTOP;
}
