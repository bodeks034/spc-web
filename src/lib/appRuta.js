/**
 * Rutiranje modula kroz URL hash. Bez ovoga Back dugme izlazi iz aplikacije
 * umesto da vrati na početni ekran, a refresh gubi otvoreni modul.
 *
 * Modul 0 zadržava svoj `#sifrarnik?...` oblik (sifrarnikDeepLink.js), da se
 * dva mehanizma ne bi otimala oko istog hash-a.
 */

export const MODULI = ["atributivne", "varijabilne", "sifrarnik", "admin"];

function hashZa(modul) {
  if (!modul) return "";
  return modul === "sifrarnik" ? "#sifrarnik" : `#/${modul}`;
}

export function citajModulIzHasha(hash) {
  const h = typeof hash === "string"
    ? hash
    : (typeof window !== "undefined" ? window.location.hash : "");
  if (!h) return null;
  if (h.startsWith("#sifrarnik")) return "sifrarnik";

  const m = /^#\/([a-z-]+)/.exec(h);
  if (!m) return null;
  return MODULI.includes(m[1]) ? m[1] : null;
}

/**
 * @param {string|null} modul
 * @param {{zameni?: boolean}} [opcije] zameni=true ne pravi novi unos u istoriji
 */
export function upisiModulUHash(modul, { zameni = false } = {}) {
  if (typeof window === "undefined") return;

  const zeljeni = hashZa(modul);
  const trenutni = window.location.hash || "";

  // Modul 0 sam dopunjava hash tabom i delom — ne gazimo ga.
  if (modul === "sifrarnik" && trenutni.startsWith("#sifrarnik")) return;
  if (trenutni === zeljeni) return;

  const url = zeljeni || `${window.location.pathname}${window.location.search}`;
  if (zameni) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}
