/** Navigacija iz drugih modula ka Modul 0 / drugim modulima. */

export const APP_MODUL_NAV_EVENT = "app-modul-nav";

export function sacuvajOtvoriSifrarnik(tab, ctx = {}) {
  const payload = { modul: "sifrarnik", tab, ctx: { ...ctx }, ts: Date.now() };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_MODUL_NAV_EVENT, { detail: payload }));
  }
  return payload;
}
