/**
 * Izolovan localStorage/sessionStorage po testu — stabilno na Node 22+ (Vercel CI).
 * Node često nema localStorage; sessionStorage je globalan i može da zagadi paralelne fajlove.
 */
import { beforeEach, vi } from "vitest";

function memorijskiStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memorijskiStorage());
  vi.stubGlobal("sessionStorage", memorijskiStorage());
});
