/** Snapshot GU redova pre XLSX importa — sessionStorage undo. */

const KEY = "spc_gu_xlsx_undo";

export function sacuvajGuUndoSnapshot({ poSheetu, imeFajla }) {
  try {
    const payload = {
      ts: Date.now(),
      imeFajla: imeFajla || "",
      poSheetu,
    };
    sessionStorage.setItem(KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function ucitajGuUndoSnapshot() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function obrisiGuUndoSnapshot() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
