/**
 * Fizičke dimenzije ekrana (mm) i referentna CSS širina za dp skaliranje.
 * Telefon: 69,5 × 154 mm · Tablet: 108 × 172 mm
 */

export const UREDJAJ_MM = {
  telefon: { sirina: 69.5, visina: 154 },
  tablet: { sirina: 108, visina: 172 },
};

/** Referentna kraća strana u CSS px (portret) — dizajn na ovoj širini = dp vrednost × 1 */
export const REF_CSS = {
  telefon: {
    kratka: 360,
    duga: Math.round(360 * (UREDJAJ_MM.telefon.visina / UREDJAJ_MM.telefon.sirina)),
  },
  tablet: {
    kratka: 720,
    duga: Math.round(720 * (UREDJAJ_MM.tablet.visina / UREDJAJ_MM.tablet.sirina)),
  },
};
