/** Snapshot pre/posle batch objave — audit + brzi pregled u UI. */
const KEY = "spc_sifrarnik_batch_snap";

export function snapBatchPreObjave({ ids = [], statistika = {} } = {}) {
  const payload = {
    ts: new Date().toISOString(),
    ids: [...ids],
    statistika,
    verzija: 1,
    faza: "pre",
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
  return payload;
}

/** Dopuni snap posle batch-a (rezultati) — za „poslednja objava“ panel. */
export function sacuvajBatchRezultat({ rezultati = [], linijaKod = null } = {}) {
  const prev = ucitajBatchSnap() || {};
  const payload = {
    ...prev,
    tsKraj: new Date().toISOString(),
    faza: "posle",
    linijaKod: linijaKod || prev.statistika?.linijaKod || null,
    rezultati: (rezultati || []).map((r) => ({
      idDeo: r.idDeo,
      ok: !!r.ok,
      greska: r.greska || null,
      karakteristike: r.karakteristike || 0,
    })),
    uspeh: (rezultati || []).filter((r) => r.ok).length,
    neuspelo: (rezultati || []).filter((r) => !r.ok).length,
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

/** ID-ovi uspešno objavljeni u poslednjem batch-u. */
export function uspesniIdoviIzSnap(snap = ucitajBatchSnap()) {
  if (!snap?.rezultati?.length) return snap?.ids || [];
  return snap.rezultati.filter((r) => r.ok).map((r) => r.idDeo).filter(Boolean);
}
