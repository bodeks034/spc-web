import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import useAppStore from "../../lib/appStore.js";

function formatVreme(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sr-RS");
  } catch {
    return iso;
  }
}

/**
 * Pregled klijentskih grešaka — samo admin (RLS).
 * Tema i korisnik dolaze iz appStore-a.
 */
export default function AdminErrorLogPanel() {
  const C = useAppStore((s) => s.temaC);
  const [redovi, setRedovi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greska, setGreska] = useState("");
  const [samoNove, setSamoNove] = useState(true);
  const [otvoren, setOtvoren] = useState(null);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    setGreska("");
    let q = supabase
      .from("error_log")
      .select("id,created_at,modul,poruka,stack,component_stack,url,user_agent,radnik_id,pregledano")
      .order("created_at", { ascending: false })
      .limit(80);
    if (samoNove) q = q.eq("pregledano", false);
    const { data, error } = await q;
    if (error) {
      setGreska(error.message);
      setRedovi([]);
    } else {
      setRedovi(data || []);
    }
    setLoading(false);
  }, [samoNove]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const oznaci = async (id, pregledano) => {
    const { error } = await supabase.from("error_log").update({ pregledano }).eq("id", id);
    if (error) {
      setGreska(error.message);
      return;
    }
    setRedovi((p) => p.map((r) => (r.id === id ? { ...r, pregledano } : r)));
  };

  if (!C) return null;

  return (
    <div
      id="admin-error-log"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 18,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            GREŠKE APLIKACIJE
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
            Crash iz ErrorBoundary. Operateri samo šalju zapis; ovde vidi samo admin.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ color: C.sivi, fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={samoNove} onChange={(e) => setSamoNove(e.target.checked)} />
            samo nove
          </label>
          <button
            type="button"
            onClick={ucitaj}
            disabled={loading}
            style={{
              background: C.plava, border: "none", borderRadius: 6,
              color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "6px 12px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "…" : "↻ Osveži"}
          </button>
        </div>
      </div>

      {greska && (
        <div style={{ color: C.crvena, fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
          {greska.includes("does not exist") || greska.includes("schema cache")
            ? "Tabela error_log nije na bazi. Pokreni 97_error_log.sql (npm run db:migrate:go-live)."
            : greska}
        </div>
      )}

      {!loading && !greska && redovi.length === 0 && (
        <div style={{ color: C.sivi, fontSize: 12 }}>Nema zapisa.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {redovi.map((r) => (
          <div
            key={r.id}
            style={{
              background: C.bg,
              border: `1px solid ${r.pregledano ? C.border : `${C.crvena}55`}`,
              borderRadius: 8,
              padding: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: C.zuta, fontSize: 11, fontWeight: 700 }}>{r.modul || "—"}</span>
                <span style={{ color: C.sivi, fontSize: 10, marginLeft: 8 }}>{formatVreme(r.created_at)}</span>
                <div style={{ color: C.tekst, fontSize: 12, marginTop: 4, wordBreak: "break-word" }}>
                  {r.poruka}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setOtvoren(otvoren === r.id ? null : r.id)}
                  style={{
                    background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                    color: C.sivi, fontSize: 10, padding: "4px 8px", cursor: "pointer",
                  }}
                >
                  {otvoren === r.id ? "Sakrij" : "Detalj"}
                </button>
                <button
                  type="button"
                  onClick={() => oznaci(r.id, !r.pregledano)}
                  style={{
                    background: r.pregledano ? C.hover : "#0c2010",
                    border: `1px solid ${r.pregledano ? C.border : `${C.zelena}55`}`,
                    borderRadius: 6,
                    color: r.pregledano ? C.sivi : C.zelena,
                    fontSize: 10, padding: "4px 8px", cursor: "pointer", fontWeight: 700,
                  }}
                >
                  {r.pregledano ? "Vrati" : "Pregledano"}
                </button>
              </div>
            </div>
            {otvoren === r.id && (
              <pre style={{
                margin: "10px 0 0",
                color: C.sivi,
                fontSize: 10,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: 220,
                overflow: "auto",
              }}>
                {`url: ${r.url || "—"}\nua: ${r.user_agent || "—"}\nradnik_id: ${r.radnik_id ?? "—"}\n\n${r.stack || "(nema stack)"}\n\n${r.component_stack || ""}`}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
