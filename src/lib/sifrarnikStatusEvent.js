/** Signal da se promenio status kompletnosti dela u šifrarniku (banner, pregledi). */

export const SIFRARNIK_STATUS_EVENT = "sifrarnik-status-changed";

export function obavestiPromenuStatusaSifrarnika(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SIFRARNIK_STATUS_EVENT, { detail }));
}
