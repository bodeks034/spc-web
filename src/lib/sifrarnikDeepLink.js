/**
 * Deep-link za Modul 0 — tab, deo i radna linija u URL hash-u.
 * Bez ovoga refresh i Back dugme gube kontekst, a tab se ne može podeliti linkom.
 */

const PREFIKS = "#sifrarnik";

export function citajDeepLink() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  if (!hash.startsWith(PREFIKS)) return null;

  const upit = hash.slice(PREFIKS.length).replace(/^[?&]/, "");
  if (!upit) return null;

  const params = new URLSearchParams(upit);
  const tab = params.get("tab");
  if (!tab) return null;

  return {
    tab,
    idDeo: params.get("deo") || null,
    linija: params.get("linija") || null,
  };
}

export function upisiDeepLink({ tab, idDeo = null, linija = null } = {}) {
  if (typeof window === "undefined" || !tab) return;

  const params = new URLSearchParams();
  params.set("tab", tab);
  if (idDeo) params.set("deo", String(idDeo).toUpperCase());
  if (linija) params.set("linija", String(linija).toUpperCase());

  const noviHash = `${PREFIKS}?${params.toString()}`;
  if (window.location.hash === noviHash) return;

  // replaceState da svaka promena taba ne pravi novi unos u istoriji.
  window.history.replaceState(null, "", noviHash);
}

export function ocistiDeepLink() {
  if (typeof window === "undefined") return;
  if (!window.location.hash.startsWith(PREFIKS)) return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
