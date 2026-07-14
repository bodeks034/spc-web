import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { fetchPrioritetSmene } from "../lib/kontekstualniVodic.js";
import { WORKFLOW_TIP } from "../lib/workflowAkcije.js";
import { izvrsiWorkflowAkciju } from "../lib/workflowAkcije.js";

function bojaSkora(nivo, C) {
  if (nivo === "kriticno") return C.crvena;
  if (nivo === "visok") return C.narandzasta || C.zuta;
  if (nivo === "srednji") return C.zuta;
  return C.sivi;
}

export default function PrioritetSmenePanel({
  C,
  modul = "merljive",
  smena,
  datum,
  onIzaberiDeo,
  onWorkflow,
  kompakt = false,
}) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPrioritetSmene(supabase, { modul, smena, datum });
      setLista(rows);
    } catch {
      setLista([]);
    } finally {
      setLoading(false);
    }
  }, [modul, smena, datum]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  if (loading) {
    return <div style={{ color: C.sivi, fontSize: 10, padding: 8 }}>Prioritet smene…</div>;
  }

  if (!lista.length) {
    return (
      <div style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 10,
        fontSize: 10,
        color: C.sivi,
        marginBottom: 12,
      }}>
        PRIORITET SMENE — nema delova sa rizikom za danas
      </div>
    );
  }

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: kompakt ? 10 : 12,
      marginBottom: 12,
    }}>
      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 8 }}>
        PRIORITET SMENE
        {smena ? ` · S${smena}` : ""}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lista.map((r) => (
          <div
            key={r.idDeo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              background: C.bg,
              borderRadius: 8,
              border: `1px solid ${bojaSkora(r.nivo, C)}40`,
              flexWrap: "wrap",
            }}
          >
            <div style={{
              color: bojaSkora(r.nivo, C),
              fontWeight: 800,
              fontSize: 16,
              minWidth: 32,
            }}>
              {r.skor}
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <button
                type="button"
                onClick={() => onIzaberiDeo?.(r.idDeo)}
                style={{
                  background: "none",
                  border: "none",
                  color: C.tekst,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                {r.idDeo}
              </button>
              <div style={{ fontSize: 9, color: C.sivi, marginTop: 2, lineHeight: 1.4 }}>
                {(r.razlozi || []).slice(0, 2).join(" · ")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => izvrsiWorkflowAkciju(WORKFLOW_TIP.KPI_DORADA, {
                idDeo: r.idDeo,
                smena,
                datum,
                modul,
              }, onWorkflow)}
              style={{
                background: `${C.zelena}22`,
                border: `1px solid ${C.zelena}`,
                borderRadius: 5,
                color: C.zelena,
                fontSize: 9,
                fontWeight: 700,
                padding: "4px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              KPI
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
