import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { formatErpUvozVreme } from "../lib/erpUvozLog.js";

/** Kompaktan ERP monitoring — poslednji uvoz i status. */
export default function ErpMonitoringStrip({ C, addToast, onOtvoriPanel }) {
  const [logovi, setLogovi] = useState([]);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    const { data, error } = await supabase
      .from("erp_uvoz_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) addToast?.(error.message, "greska");
    setLogovi(data || []);
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    ucitaj();
    const t = setInterval(ucitaj, 120000);
    return () => clearInterval(t);
  }, [ucitaj]);

  const poslednji = logovi[0];
  const greske = logovi.filter((l) => !l.uspeh).length;

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 12,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: logovi.length ? 8 : 0,
      }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700 }}>ERP monitoring</div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
            {loading ? "…" : poslednji
              ? `Poslednji: ${formatErpUvozVreme(poslednji.created_at)} · ${poslednji.izvor || "—"}`
              : "Nema zapisa uvoza"}
            {greske > 0 && (
              <span style={{ color: C.crvena, marginLeft: 6 }}>
                {greske} greška u poslednjih 5
              </span>
            )}
          </div>
        </div>
        {onOtvoriPanel && (
          <button
            type="button"
            onClick={onOtvoriPanel}
            style={{
              background: C.plava,
              border: "none",
              borderRadius: 6,
              color: C.onAkcent,
              fontSize: 10,
              fontWeight: 700,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Otvori ERP uvoz
          </button>
        )}
      </div>

      {logovi.length > 0 && (
        <div style={{ fontSize: 9, color: C.sivi, lineHeight: 1.6 }}>
          {logovi.map((l) => (
            <div key={l.id} style={{ display: "flex", gap: 8 }}>
              <span style={{ color: l.uspeh ? C.zelena : C.crvena, fontWeight: 700, minWidth: 28 }}>
                {l.uspeh ? "OK" : "NOK"}
              </span>
              <span>{formatErpUvozVreme(l.created_at)}</span>
              <span>{l.izvor || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
