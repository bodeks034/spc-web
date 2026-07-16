import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { proveriSemu } from "../lib/schemaCheck.js";
import { ensureQueueReady, loadQueue, queueCounts } from "../lib/offlineQueue.js";
import { jeAdmin } from "../lib/uloge.js";

/** Kompaktna kartica zdravlja — početni ekran / admin. */
export default function ZdravljeSistemaKartica({ C, korisnik, onOtvoriAdmin }) {
  const [stanje, setStanje] = useState({
    loading: true,
    pingOk: null,
    pingMs: null,
    offline: 0,
    schemaOk: null,
    schemaUk: 0,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
  });

  const osvezi = useCallback(async () => {
    setStanje((s) => ({ ...s, loading: true }));
    await ensureQueueReady();
    const offline = queueCounts(loadQueue()).total;
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    let pingOk = false;
    let pingMs = null;
    const t0 = performance.now();
    try {
      const { error } = await supabase.from("delovi").select("id_deo").limit(1);
      pingMs = Math.round(performance.now() - t0);
      pingOk = !error;
    } catch {
      pingOk = false;
    }
    let schemaOk = 0;
    let schemaUk = 0;
    try {
      const stavke = await proveriSemu(supabase);
      schemaUk = stavke.length;
      schemaOk = stavke.filter((s) => s.ok).length;
    } catch { /* */ }
    setStanje({
      loading: false,
      pingOk,
      pingMs,
      offline,
      schemaOk,
      schemaUk,
      online,
    });
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  const sveOk = stanje.pingOk && stanje.online && stanje.offline === 0
    && (stanje.schemaUk === 0 || stanje.schemaOk === stanje.schemaUk);
  const boja = !stanje.online || stanje.pingOk === false
    ? C.crvena
    : stanje.offline > 0 || (stanje.schemaUk > 0 && stanje.schemaOk < stanje.schemaUk)
      ? C.zuta
      : C.zelena;

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${boja}55`,
      borderRadius: 12,
      padding: "12px 14px",
      marginBottom: 14,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 8, flexWrap: "wrap", marginBottom: 8,
      }}>
        <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>
          ZDRAVLJE SISTEMA
          <span style={{
            marginLeft: 8, fontSize: 10, color: boja, fontWeight: 700,
          }}>
            {stanje.loading ? "…" : sveOk ? "OK" : "PROVERI"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={osvezi} disabled={stanje.loading}
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, fontSize: 10, padding: "5px 10px", cursor: "pointer",
            }}>
            Osveži
          </button>
          {jeAdmin(korisnik?.uloga) && onOtvoriAdmin && (
            <button type="button" onClick={onOtvoriAdmin}
              style={{
                background: "none", border: `1px solid ${C.plava}55`, borderRadius: 6,
                color: C.plava, fontSize: 10, fontWeight: 700, padding: "5px 10px", cursor: "pointer",
              }}>
              Admin →
            </button>
          )}
        </div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 8,
        fontSize: 11,
      }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9 }}>MREŽA</div>
          <div style={{ color: stanje.online ? C.zelena : C.crvena, fontWeight: 700 }}>
            {stanje.online ? "Online" : "Offline"}
          </div>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9 }}>BAZA</div>
          <div style={{ color: stanje.pingOk ? C.zelena : C.crvena, fontWeight: 700 }}>
            {stanje.pingOk == null ? "—" : stanje.pingOk ? `${stanje.pingMs ?? "?"} ms` : "Greška"}
          </div>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9 }}>OFFLINE RED</div>
          <div style={{ color: stanje.offline ? C.zuta : C.zelena, fontWeight: 700 }}>
            {stanje.offline} paketa
          </div>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9 }}>ŠEMA</div>
          <div style={{
            color: stanje.schemaUk && stanje.schemaOk === stanje.schemaUk ? C.zelena : C.zuta,
            fontWeight: 700,
          }}>
            {stanje.schemaUk ? `${stanje.schemaOk}/${stanje.schemaUk}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
