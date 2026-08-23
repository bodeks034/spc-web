/** Snapshot pre batch objave — strogi audit / oporavak informacija. */
const KEY = "spc_sifrarnik_batch_snap";

export function snapBatchPreObjave({ ids = [], statistika = {} } = {}) {
  const payload = {
    ts: new Date().toISOString(),
    ids: [...ids],
    statistika,
    verzija: 1,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
  return payload;
}

export function ucitajBatchSnap() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function obrisiBatchSnap() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function preuzmiBatchSnapJson(snap = ucitajBatchSnap()) {
  if (!snap) return;
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch-snap-${snap.ts?.slice(0, 19)?.replace(/[:T]/g, "-") || "pre"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
