/** Snapshot GU redova pre XLSX importa — sessionStorage undo (TTL 2h). */

const KEY = "spc_gu_xlsx_undo";
export const GU_UNDO_TTL_MS = 2 * 60 * 60 * 1000;

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
    const payload = JSON.parse(raw);
    if (!payload?.ts || Date.now() - payload.ts > GU_UNDO_TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function preostaloUndoMs(snapshot) {
  if (!snapshot?.ts) return 0;
  return Math.max(0, GU_UNDO_TTL_MS - (Date.now() - snapshot.ts));
}

export function formatUndoPreostalo(ms) {
  const min = Math.ceil(ms / 60000);
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}min`;
  return `${min} min`;
}

export function obrisiGuUndoSnapshot() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
