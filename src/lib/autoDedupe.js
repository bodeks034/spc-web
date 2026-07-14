/** Dedupe za automatizacije — browser (session) ili server (fajl). */

const SESSION_PREFIX = "spc_auto_dedupe_";
const DEFAULT_MS = 4 * 60 * 60 * 1000;

export function createDedupeStore({ tip = "session", putanjaFajla = null, ms = DEFAULT_MS } = {}) {
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

  if (tip === "file" && putanjaFajla) {
    return {
      async vecPoslato(kljuc) {
        try {
          const mod = await import("node:fs/promises");
          const raw = await mod.readFile(putanjaFajla, "utf8");
          const data = JSON.parse(raw);
          const t = data[kljuc];
          return t != null && Date.now() - t < ms;
        } catch {
          return false;
        }
      },
      async oznaci(kljuc) {
        try {
          const mod = await import("node:fs/promises");
          const path = await import("node:path");
          let data = {};
          try {
            data = JSON.parse(await mod.readFile(putanjaFajla, "utf8"));
          } catch { /* */ }
          data[kljuc] = Date.now();
          await mod.mkdir(path.dirname(putanjaFajla), { recursive: true });
          await mod.writeFile(putanjaFajla, JSON.stringify(data));
        } catch { /* */ }
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
