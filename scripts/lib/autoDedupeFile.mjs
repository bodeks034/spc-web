/** Dedupe store na fajlu — samo za Node skripte. */
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_MS = 4 * 60 * 60 * 1000;

/**
 * @param {{ putanjaFajla: string, ms?: number }} opts
 */
export function createFileDedupeStore({ putanjaFajla, ms = DEFAULT_MS }) {
  return {
    async vecPoslato(kljuc) {
      try {
        const raw = await fs.readFile(putanjaFajla, "utf8");
        const data = JSON.parse(raw);
        const t = data[kljuc];
        return t != null && Date.now() - t < ms;
      } catch {
        return false;
      }
    },
    async oznaci(kljuc) {
      try {
        let data = {};
        try {
          data = JSON.parse(await fs.readFile(putanjaFajla, "utf8"));
        } catch { /* */ }
        data[kljuc] = Date.now();
        await fs.mkdir(path.dirname(putanjaFajla), { recursive: true });
        await fs.writeFile(putanjaFajla, JSON.stringify(data));
      } catch { /* */ }
    },
  };
}
