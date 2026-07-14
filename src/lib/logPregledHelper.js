/** Pomoćnici za LOG tab — filter datum/smena i offline red iz reda čekanja. */

export function normalizujDatumLog(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s.slice(0, 10);
}

export function filtrirajLogRedove(rows, { datum, smena } = {}) {
  let out = rows || [];
  if (datum) {
    const d = normalizujDatumLog(datum);
    out = out.filter((r) => normalizujDatumLog(r.datum) === d);
  }
  if (smena != null && smena !== "" && smena !== "sve") {
    const sm = Number(smena);
    out = out.filter((r) => Number(r.smena) === sm);
  }
  return out;
}

export function offlineKontrolniRedovi(queue = []) {
  const rows = [];
  for (const job of queue) {
    const batch = job.type === "kontrolni_log"
      ? job.payload
      : job.type === "atributivne_batch"
        ? job.payload?.logRows
        : null;
    if (!batch?.length) continue;
    for (const r of batch) {
      rows.push({
        ...r,
        _offline: true,
        _offlineAt: job.createdAt,
        _jobId: job.id,
      });
    }
  }
  return rows.sort((a, b) => String(b._offlineAt).localeCompare(String(a._offlineAt)));
}

export function offlineMerljiviRedovi(queue = []) {
  const rows = [];
  for (const job of queue) {
    if (job.type !== "merljive_serija") continue;
    for (const r of job.payload?.merenja || []) {
      rows.push({
        ...r,
        _offline: true,
        _offlineAt: job.createdAt,
        _jobId: job.id,
      });
    }
  }
  return rows.sort((a, b) => String(b._offlineAt).localeCompare(String(a._offlineAt)));
}

/** Offline stavke na vrhu, zatim redovi iz baze. */
export function spojiOfflineINadRedove(offlineRows, dbRows) {
  return [...(offlineRows || []), ...(dbRows || []).filter((r) => !r._offline)];
}

export function brojOfflineStavki(queue, modul) {
  if (modul === "merljive") return offlineMerljiviRedovi(queue).length;
  return offlineKontrolniRedovi(queue).length;
}
