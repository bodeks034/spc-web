/** Zajednički offline red — IndexedDB (+ migracija sa localStorage). */

import { useState, useEffect, useCallback } from "react";
import { snimiKpiUnos, pronadjiAgregiraniKpiAtributivne, snimiIliAzurirajKpiUnos, kpiVrednostiIzDb, saberiKpiVrednosti } from "./kpiUnos.js";
import {
  idbPodrzan,
  idbUcitajSve,
  idbSnimiSve,
} from "./offlineQueueDb.js";

const STORAGE_KEY = "spc_q_v2";
const LEGACY_KEY = "spc_q";

/** @type {object[]} */
let cache = [];
let initPromise = null;
let storageMode = "indexedDB";

function uuid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeLegacy(raw) {
  if (!Array.isArray(raw) || !raw.length) return [];
  if (raw[0]?.type) return raw;
  return [{
    id: uuid(),
    type: "kontrolni_log",
    createdAt: new Date().toISOString(),
    sesija_id: null,
    payload: raw,
  }];
}

function loadFromLocalStorage() {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return normalizeLegacy(JSON.parse(v2));
    const leg = localStorage.getItem(LEGACY_KEY);
    if (leg) {
      const migrated = normalizeLegacy(JSON.parse(leg));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch { /* */ }
  return [];
}

function saveToLocalStorageFallback(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn("localStorage pun — koristi IndexedDB ili oslobodi prostor", e);
  }
}

async function persistCache(queue) {
  cache = [...queue];
  if (idbPodrzan()) {
    try {
      await idbSnimiSve(cache);
      storageMode = "indexedDB";
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_KEY);
      } catch { /* */ }
      return;
    } catch (e) {
      console.warn("IndexedDB snimanje — fallback localStorage", e);
    }
  }
  storageMode = "localStorage";
  saveToLocalStorageFallback(cache);
}

async function initCache() {
  if (idbPodrzan()) {
    try {
      const fromIdb = await idbUcitajSve();
      if (fromIdb.length) {
        cache = fromIdb;
        storageMode = "indexedDB";
        return;
      }
    } catch (e) {
      console.warn("IndexedDB učitavanje", e);
    }
  }

  const fromLs = loadFromLocalStorage();
  cache = fromLs;
  if (fromLs.length && idbPodrzan()) {
    try {
      await idbSnimiSve(fromLs);
      storageMode = "indexedDB";
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
      return;
    } catch { /* */ }
  }
  if (fromLs.length) storageMode = "localStorage";
  else storageMode = idbPodrzan() ? "indexedDB" : "localStorage";
}

/** Pozovi pre sync loadQueue u async kontekstu. */
export function ensureQueueReady() {
  if (!initPromise) {
    initPromise = initCache();
  }
  return initPromise;
}

export function getStorageMode() {
  return storageMode;
}

/** Sync — koristi keš (posle ensureQueueReady). */
export function loadQueue() {
  return [...cache];
}

export async function loadQueueAsync() {
  await ensureQueueReady();
  return loadQueue();
}

export function saveQueue(queue) {
  cache = [...queue];
  persistCache(cache);
}

export async function saveQueueAsync(queue) {
  await ensureQueueReady();
  await persistCache([...queue]);
}

export async function removeJobAsync(jobId) {
  await ensureQueueReady();
  const q = cache.filter(j => j.id !== jobId);
  await persistCache(q);
  return q;
}

export function removeJob(jobId) {
  const q = cache.filter(j => j.id !== jobId);
  saveQueue(q);
  return q;
}

export async function clearQueueAsync() {
  await ensureQueueReady();
  await persistCache([]);
}

export function clearQueue() {
  saveQueue([]);
}

export function opisPosla(job) {
  if (!job) return "—";
  if (job.type === "merljive_serija") {
    const m = job.payload?.merenja?.length || 0;
    const id = job.payload?.merenja?.[0]?.id_deo || job.payload?.meta?.idDeo || "?";
    return `Merljive ${id} · ${m} merenja`;
  }
  if (job.type === "atributivne_batch") {
    const n = job.payload?.logRows?.length || 0;
    return `Atributivne · ${n} stavki`;
  }
  if (job.type === "kontrolni_log") {
    return `Log · ${job.payload?.length || 0} redova`;
  }
  return job.type;
}

export function queueCounts(queue) {
  const q = queue ?? cache;
  const counts = { total: q.length, kontrolni_log: 0, merljive_serija: 0, atributivne_batch: 0 };
  let stavki = 0;
  q.forEach(j => {
    counts[j.type] = (counts[j.type] || 0) + 1;
    if (j.type === "kontrolni_log") stavki += j.payload?.length || 0;
    if (j.type === "atributivne_batch") stavki += j.payload?.logRows?.length || 0;
    if (j.type === "merljive_serija") stavki += j.payload?.merenja?.length || 0;
  });
  return { ...counts, stavki };
}

export function enqueueJob(job) {
  const entry = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    ...job,
  };
  cache = [...cache, entry];
  persistCache(cache);
  return entry;
}

export function enqueueKontrolniLog(rows, sesija_id) {
  return enqueueJob({
    type: "kontrolni_log",
    sesija_id: sesija_id || null,
    payload: rows,
    kpi: null,
  });
}

export function enqueueMerljiveSerija({ merenja, kpi, sesija_id, meta }) {
  return enqueueJob({
    type: "merljive_serija",
    sesija_id: sesija_id || null,
    payload: { merenja, kpi, meta },
  });
}

export function enqueueAtributivneBatch({ logRows, kpi, sesija_id }) {
  return enqueueJob({
    type: "atributivne_batch",
    sesija_id: sesija_id || null,
    payload: { logRows, kpi },
  });
}

function stripMeta(row) {
  const { id, created_at, ...rest } = row;
  return rest;
}

async function insertJob(supabase, job, { mirrorKontrolniLog }) {
  const sid = job.sesija_id || null;

  if (job.type === "kontrolni_log") {
    const batch = (job.payload || []).map(r => ({ ...stripMeta(r), sesija_id: sid }));
    const { error } = await supabase.from("kontrolni_log").insert(batch);
    if (error) throw error;
    if (mirrorKontrolniLog) await mirrorKontrolniLog(supabase, batch).catch(() => {});
    return batch.length;
  }

  if (job.type === "atributivne_batch") {
    const { logRows = [], kpi } = job.payload || {};
    const batch = logRows.map(r => ({ ...stripMeta(r), sesija_id: sid }));
    if (batch.length) {
      const { error } = await supabase.from("kontrolni_log").insert(batch);
      if (error) throw error;
      if (mirrorKontrolniLog) await mirrorKontrolniLog(supabase, batch).catch(() => {});
    }
    if (kpi) {
      let kpiId = null;
      let kpiZaSnimanje = kpi.kpi || kpi;
      const postojeci = await pronadjiAgregiraniKpiAtributivne(supabase, {
        idDeo: kpi.id_deo,
        datum: kpi.datum,
        smena: kpi.smena,
        radniNalog: kpi.radni_nalog || undefined,
      });
      if (postojeci) {
        kpiId = postojeci.id;
        kpiZaSnimanje = saberiKpiVrednosti(kpiVrednostiIzDb(postojeci), kpi.kpi || kpi);
      }
      const { error: eK } = await snimiIliAzurirajKpiUnos(supabase, {
        ...kpi,
        sesija_id: sid,
        kpi: kpiZaSnimanje,
      }, kpiId);
      if (eK) throw eK;
    }
    return batch.length + (kpi ? 1 : 0);
  }

  if (job.type === "merljive_serija") {
    const { merenja = [], kpi } = job.payload || {};
    const rows = merenja.map(r => ({ ...stripMeta(r), sesija_id: sid }));
    if (rows.length) {
      const { error } = await supabase.from("merenja_varijabilna").insert(rows);
      if (error) throw error;
    }
    if (kpi) {
      const { error: eK } = await snimiKpiUnos(supabase, { ...kpi, sesija_id: sid });
      if (eK) throw eK;
    }
    return rows.length + (kpi ? 1 : 0);
  }

  return 0;
}

export async function flushOfflineQueue(supabase, options = {}) {
  const { mirrorKontrolniLog, onJobError, samoSaGreskom = false } = options;
  await ensureQueueReady();
  const queue = loadQueue();
  if (!queue.length || !navigator.onLine) {
    return { syncedJobs: 0, syncedRows: 0, failed: 0, remaining: queue.length };
  }

  const remaining = [];
  let syncedJobs = 0;
  let syncedRows = 0;
  let failed = 0;

  for (const job of queue) {
    if (samoSaGreskom && !job.lastError) {
      remaining.push(job);
      continue;
    }
    try {
      const n = await insertJob(supabase, job, { mirrorKontrolniLog });
      syncedJobs += 1;
      syncedRows += n;
    } catch (e) {
      failed += 1;
      remaining.push({
        ...job,
        lastError: e?.message || String(e),
        lastFailAt: new Date().toISOString(),
        failCount: (job.failCount || 0) + 1,
      });
      onJobError?.(job, e);
    }
  }

  await saveQueueAsync(remaining);
  return { syncedJobs, syncedRows, failed, remaining: remaining.length };
}

export function useOfflineQueue(supabase, options = {}) {
  const { mirrorKontrolniLog, onFlushed } = options;
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queue, setQueue] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    ensureQueueReady().then(() => setQueue(loadQueue()));
  }, []);

  useEffect(() => {
    ensureQueueReady().then(() => {
      setQueue(loadQueue());
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const flushQueue = useCallback(async () => {
    const res = await flushOfflineQueue(supabase, {
      mirrorKontrolniLog,
      onJobError: (job, e) => console.warn("Offline job", job.type, e?.message),
    });
    setQueue(loadQueue());
    if (res.syncedJobs > 0) onFlushed?.(res);
    return res;
  }, [supabase, mirrorKontrolniLog, onFlushed]);

  useEffect(() => {
    if (ready && online && queue.length > 0) {
      flushQueue();
    }
  }, [online, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const addKontrolniLog = useCallback((rows, sesija_id) => {
    enqueueKontrolniLog(rows, sesija_id);
    refresh();
  }, [refresh]);

  const addAtributivneBatch = useCallback(({ logRows, kpi, sesija_id }) => {
    enqueueJob({
      type: "atributivne_batch",
      sesija_id: sesija_id || null,
      payload: { logRows, kpi },
    });
    refresh();
  }, [refresh]);

  const addMerljiveSerija = useCallback((payload, sesija_id) => {
    enqueueMerljiveSerija({ ...payload, sesija_id });
    refresh();
  }, [refresh]);

  const counts = queueCounts(queue);

  return {
    online,
    queue,
    counts,
    ready,
    storageMode: getStorageMode(),
    refresh,
    flushQueue,
    addKontrolniLog,
    addAtributivneBatch,
    addMerljiveSerija,
  };
}
