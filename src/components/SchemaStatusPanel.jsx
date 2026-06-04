import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { proveriSemu, MIGRACIJE_LISTA } from "../lib/schemaCheck.js";
import { queueCounts, loadQueue, ensureQueueReady, getStorageMode } from "../lib/offlineQueue.js";

export default function SchemaStatusPanel({ C }) {
  const [stavke, setStavke] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState({ total: 0, stavki: 0 });
  const [storage, setStorage] = useState("");

  const osvezi = useCallback(async () => {
    setLoading(true);
    await ensureQueueReady();
    setOffline(queueCounts(loadQueue()));
    setStorage(getStorageMode());
    try {
      const r = await proveriSemu(supabase);
      setStavke(r);
    } catch (e) {
      setStavke(MIGRACIJE_LISTA.map(m => ({
        ...m, ok: false, poruka: e.message,
      })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  const sveOk = stavke.length > 0 && stavke.every(s => s.ok);

  return (
    <div style={{
      background: C.panel, border: `1px solid ${sveOk ? C.zelena : C.zuta}40`,
      borderRadius: 12, padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          STATUS ŠEME · MIGRACIJE
        </div>
        <button type="button" onClick={osvezi} disabled={loading}
          style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 10, padding: "6px 12px", cursor: "pointer",
          }}>
          {loading ? "…" : "↻ Proveri"}
        </button>
      </div>

      <div style={{
        background: C.bg, borderRadius: 8, padding: "10px 12px", marginBottom: 14,
        fontSize: 10, color: C.sivi, lineHeight: 1.5,
      }}>
        Redosled SQL fajlova: <strong style={{ color: C.tekst }}>docs/MIGRACIJE.md</strong>
        {offline.total > 0 && (
          <span style={{ display: "block", marginTop: 6, color: C.zuta }}>
            📶 Offline red: {offline.total} paketa ({offline.stavki} stavki)
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 12 }}>Provera tabele…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stavke.map(s => (
            <div key={s.id} style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
              padding: "10px 12px", background: C.bg, borderRadius: 8,
              border: `1px solid ${s.ok ? C.zelena : C.crvena}30`,
            }}>
              <div>
                <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>{s.naziv}</div>
                <div style={{ color: C.sivi, fontSize: 9, marginTop: 3 }}>{s.fajl}</div>
                {!s.ok && s.detalji?.[0]?.poruka && (
                  <div style={{ color: C.crvena, fontSize: 9, marginTop: 4, maxWidth: 420 }}>
                    {s.detalji[0].poruka}
                  </div>
                )}
              </div>
              <span style={{
                color: s.ok ? C.zelena : C.crvena, fontWeight: 700, fontSize: 11, flexShrink: 0,
              }}>
                {s.ok ? "✓" : "✕"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
