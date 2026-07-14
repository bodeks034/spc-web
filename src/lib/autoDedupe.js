/** Dedupe za automatizacije — browser (session) ili memory. */

const SESSION_PREFIX = "spc_auto_dedupe_";
const DEFAULT_MS = 4 * 60 * 60 * 1000;

export function createDedupeStore({ tip = "session", ms = DEFAULT_MS } = {}) {
  if (tip === "memory") {
    const mapa = new Map();
    return {
      vecPoslato(kljuc) {
        const t = mapa.get(kljuc);
        return t != null && Date.now() - t < ms;
      },
      oznaci(kljuc) {
        mapa.set(kljuc, Date.now());
      },
    };
  }

  if (typeof sessionStorage === "undefined") {
    return createDedupeStore({ tip: "memory", ms });
  }

  return {
    vecPoslato(kljuc) {
      try {
        const raw = sessionStorage.getItem(SESSION_PREFIX + kljuc);
        if (!raw) return false;
        return Date.now() - Number(raw) < ms;
      } catch {
        return false;
      }
    },
    oznaci(kljuc) {
      try {
        sessionStorage.setItem(SESSION_PREFIX + kljuc, String(Date.now()));
      } catch { /* */ }
    },
  };
}
