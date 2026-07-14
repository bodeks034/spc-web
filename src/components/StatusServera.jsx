import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { proveriSemu } from "../lib/schemaCheck.js";
import { queueCounts, loadQueue, ensureQueueReady } from "../lib/offlineQueue.js";

const APP_VER = import.meta.env.VITE_APP_VERSION || "1.0.0";

/** Admin — ping Supabase, verzija, offline red, sažetak migracija. */
export default function StatusServera({ C }) {
  const [pingMs, setPingMs] = useState(null);
  const [pingOk, setPingOk] = useState(null);
  const [migracije, setMigracije] = useState({ ok: 0, ukupno: 0 });
  const [offline, setOffline] = useState(0);
  const [swStatus, setSwStatus] = useState("—");
  const [loading, setLoading] = useState(true);

  const osvezi = useCallback(async () => {
    setLoading(true);
    await ensureQueueReady();
    setOffline(queueCounts(loadQueue()).total);

    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      setSwStatus(reg?.active ? "aktivan" : reg ? "čeka" : "nije registrovan");
    }

    const t0 = performance.now();
    try {
      const { error } = await supabase.from("delovi").select("id_deo").limit(1);
      setPingMs(Math.round(performance.now() - t0));
      setPingOk(!error);
    } catch {
      setPingMs(null);
      setPingOk(false);
    }

    try {
      const stavke = await proveriSemu(supabase);
      setMigracije({
        ok: stavke.filter((s) => s.ok).length,
        ukupno: stavke.length,
      });
    } catch {
      setMigracije({ ok: 0, ukupno: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  const red = (label, vrednost, boja = C.tekst) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11 }}>
      <span style={{ color: C.sivi }}>{label}</span>
      <span style={{ color: boja, fontWeight: 700, textAlign: "right" }}>{vrednost}</span>
    </div>
  );

  const migOk = migracije.ukupno > 0 && migracije.ok === migracije.ukupno;

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${pingOk === false ? C.crvena : C.zelena}40`,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          STATUS SERVERA
        </div>
        <button type="button" onClick={osvezi} disabled={loading}
          style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 10, padding: "6px 12px", cursor: "pointer",
          }}>
          {loading ? "…" : "↻ Osveži"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {red("Aplikacija", `v${APP_VER}`)}
        {red("Mreža", navigator.onLine ? "online" : "offline", navigator.onLine ? C.zelena : C.crvena)}
        {red(
          "Supabase ping",
          pingOk === null ? "…" : pingOk ? `${pingMs} ms` : "GREŠKA",
          pingOk ? C.zelena : C.crvena,
        )}
        {red(
          "Migracije",
          migracije.ukupno ? `${migracije.ok}/${migracije.ukupno}` : "—",
          migOk ? C.zelena : C.zuta,
        )}
        {red("Offline red", offline || "0", offline > 0 ? C.zuta : C.zelena)}
        {red("Service worker", swStatus, swStatus === "aktivan" ? C.zelena : C.sivi)}
      </div>

      <div style={{
        marginTop: 12, fontSize: 9, color: C.sivi, lineHeight: 1.5,
        borderTop: `1px solid ${C.border}`, paddingTop: 10,
      }}>
        Posle deploy-a pokreni: <code style={{ color: C.tekst }}>npm run smoke:test</code>
      </div>
    </div>
  );
}
