/** Navigacija u Modul 0 iz Admin panela ili drugih modula. */

export const SIFRARNIK_NAV_PENDING_KEY = "spc_sifrarnik_nav_pending";
export const SIFRARNIK_NAV_EVENT = "sifrarnik-navigate";

export function sacuvajSifrarnikNav(tab, ctx = {}) {
  const payload = { tab, ctx: { ...ctx }, ts: Date.now() };
  try {
    sessionStorage.setItem(SIFRARNIK_NAV_PENDING_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SIFRARNIK_NAV_EVENT, { detail: payload }));
  }
  return payload;
}

export function ucitajPendingSifrarnikNav({ ukloni = true } = {}) {
  try {
    const raw = sessionStorage.getItem(SIFRARNIK_NAV_PENDING_KEY);
    if (!raw) return null;
    if (ukloni) sessionStorage.removeItem(SIFRARNIK_NAV_PENDING_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
