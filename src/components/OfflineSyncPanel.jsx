import { useState, useCallback, useEffect } from "react";
import {
  loadQueue,
  ensureQueueReady,
  flushOfflineQueue,
  removeJob,
  clearQueue,
  opisPosla,
  queueCounts,
  getStorageMode,
} from "../lib/offlineQueue.js";

export default function OfflineSyncPanel({
  supabase,
  C,
  addToast,
  online: onlineProp,
  onSync,
  mirrorKontrolniLog,
  kompakt,
}) {
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [storage, setStorage] = useState("…");
  const [online, setOnline] = useState(
    () => onlineProp ?? (typeof navigator !== "undefined" ? navigator.onLine : true),
  );

  useEffect(() => {
    if (onlineProp !== undefined) setOnline(onlineProp);
  }, [onlineProp]);

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

  const refresh = useCallback(() => {
    ensureQueueReady().then(() => {
      setQueue(loadQueue());
      setStorage(getStorageMode());
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  const counts = queueCounts(queue);

  const sync = async () => {
    if (!navigator.onLine) {
      addToast?.("Nema mreže — sync kada bude online", "greska");
      return;
    }
    setSyncing(true);
    const res = await flushOfflineQueue(supabase, {
      mirrorKontrolniLog,
      onJobError: (_j, e) => console.warn(e?.message),
    });
    refresh();
    setSyncing(false);
    onSync?.(res);
    if (res.syncedJobs > 0) {
      addToast?.(`✓ ${res.syncedJobs} paketa · ${res.syncedRows} stavki u Supabase`, "uspeh");
    } else if (res.failed > 0) {
      addToast?.(`${res.failed} paketa nije ušlo — proveri grešku ispod`, "greska");
    } else if (!queue.length) {
      addToast?.("Red je prazan", "info");
    }
  };

  if (kompakt && !queue.length) return null;

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${counts.total ? C.zuta : C.border}`,
      borderRadius: 12,
      padding: kompakt ? 12 : 18,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 10, flexWrap: "wrap", gap: 8,
      }}>
        <span style={{ color: C.tekst, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
          OFFLINE RED · SINHRONIZACIJA
        </span>
        <span style={{
          fontSize: 10,
          color: online ? C.zelena : C.crvena,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: online ? C.zelena : C.crvena,
          }} />
          {online ? "Online" : "Offline"}
        </span>
      </div>

      <p style={{ color: C.sivi, fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}>
        Skladište: <strong style={{ color: storage === "indexedDB" ? C.zelena : C.zuta }}>{storage}</strong>
        {storage === "indexedDB" && " (veći kapacitet, perzistentno na uređaju)"}.
        Paketi čekaju slanje u Supabase. Posle uspešnog sync-a podaci su u bazi i ulaze u SPC karte.
        {counts.total > 0 && (
          <strong style={{ color: C.zuta }}> {counts.total} paket(a), ~{counts.stavki} stavki.</strong>
        )}
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" disabled={syncing || !counts.total} onClick={sync}
          style={{
            background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer",
            opacity: counts.total ? 1 : 0.5,
          }}>
          {syncing ? "Šaljem…" : "↻ Sinhronizuj sve"}
        </button>
        <button type="button" onClick={refresh}
          style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.tekst, fontSize: 10, padding: "8px 12px", cursor: "pointer",
          }}>
          Osveži
        </button>
        {counts.total > 0 && (
          <button type="button" onClick={() => {
            if (window.confirm("Obrisati ceo offline red? Podaci se gube.")) {
              clearQueue();
              refresh();
              addToast?.("Offline red obrisan", "info");
            }
          }}
            style={{
              background: "none", border: `1px solid ${C.crvena}`, borderRadius: 6,
              color: C.crvena, fontSize: 10, padding: "8px 12px", cursor: "pointer",
            }}>
            Obriši red
          </button>
        )}
      </div>

      {!queue.length ? (
        <div style={{ color: C.border, fontSize: 11, textAlign: "center", padding: 12 }}>
          Nema paketa na čekanju
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflow: "auto" }}>
          {queue.map(job => (
            <div key={job.id} style={{
              background: C.input, border: `1px solid ${job.lastError ? C.crvena : C.border}`,
              borderRadius: 8, padding: 10, fontSize: 10,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ color: C.tekst }}>{opisPosla(job)}</strong>
                <button type="button" onClick={() => {
                  removeJob(job.id);
                  refresh();
                }}
                  style={{
                    background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 9,
                  }}>
                  Ukloni
                </button>
              </div>
              <div style={{ color: C.sivi, marginTop: 4 }}>
                {new Date(job.createdAt).toLocaleString("sr-RS")}
                {job.sesija_id && <> · sesija {String(job.sesija_id).slice(0, 12)}…</>}
              </div>
              {job.lastError && (
                <div style={{ color: C.crvena, marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {job.lastError}
                  {job.failCount > 1 && ` (pokušaja: ${job.failCount})`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
