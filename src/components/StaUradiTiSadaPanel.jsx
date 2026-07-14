import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  fetchKontekstDeo,
  obogatiKontekstAlarmima,
} from "../lib/kontekstualniVodic.js";
import { izvrsiWorkflowAkciju } from "../lib/workflowAkcije.js";
import { odrediModulZaDeo } from "../lib/deoModul.js";

function bojaNivoa(nivo, C) {
  if (nivo === "kriticno") return C.crvena;
  if (nivo === "visok") return C.narandzasta || C.zuta;
  if (nivo === "srednji") return C.zuta;
  return C.zelena;
}

export default function StaUradiTiSadaPanel({
  C,
  idDeo,
  modul = "merljive",
  smena,
  datum,
  radniNalog,
  alarmi = [],
  onWorkflow,
  kompakt = false,
}) {
  const [kontekst, setKontekst] = useState(null);
  const [loading, setLoading] = useState(false);

  const ucitaj = useCallback(async () => {
    const id = String(idDeo || "").trim().toUpperCase();
    if (id.length < 3) {
      setKontekst(null);
      return;
    }
    setLoading(true);
    try {
      const modulDeo = await odrediModulZaDeo(supabase, id);
      const baza = await fetchKontekstDeo(supabase, {
        idDeo: id,
        modul: modulDeo,
        smena,
        datum,
        radniNalog,
      });
      setKontekst(obogatiKontekstAlarmima(
        baza ? { ...baza, modul: modulDeo } : null,
        alarmi,
      ));
    } catch {
      setKontekst(null);
    } finally {
      setLoading(false);
    }
  }, [idDeo, smena, datum, radniNalog, alarmi]);

  useEffect(() => {
    const t = setTimeout(ucitaj, 300);
    return () => clearTimeout(t);
  }, [ucitaj]);

  const id = String(idDeo || "").trim().toUpperCase();
  if (id.length < 3) {
    return (
      <div style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: kompakt ? 10 : 14,
        color: C.sivi,
        fontSize: 11,
        textAlign: "center",
      }}>
        Izaberite ID deo za vodič „Šta uraditi sada“
      </div>
    );
  }

  if (loading && !kontekst) {
    return (
      <div style={{ color: C.sivi, fontSize: 11, padding: 12 }}>Učitavam vodič…</div>
    );
  }

  const koraci = kontekst?.koraci || [];
  const rizik = kontekst?.rizik;

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${rizik?.nivo === "kriticno" ? C.crvena : rizik?.nivo === "visok" ? C.zuta : C.border}50`,
      borderRadius: 10,
      padding: kompakt ? 10 : 14,
      marginBottom: 12,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 10,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2 }}>ŠTA URADITI SADA</div>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
            {id}
            {radniNalog ? ` · RN ${radniNalog}` : ""}
            {smena ? ` · S${smena}` : ""}
          </div>
        </div>
        {rizik && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.sivi, fontSize: 8 }}>RIZIK</div>
            <div style={{ color: bojaNivoa(rizik.nivo, C), fontSize: 20, fontWeight: 800 }}>
              {rizik.skor}
            </div>
          </div>
        )}
      </div>

      {rizik?.razlozi?.length > 0 && (
        <div style={{ fontSize: 9, color: C.sivi, marginBottom: 10, lineHeight: 1.5 }}>
          {rizik.razlozi.join(" · ")}
        </div>
      )}

      {!koraci.length ? (
        <div style={{ color: C.zelena, fontSize: 11 }}>✓ Nema hitnih koraka za ovaj filter</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {koraci.map((k, i) => (
            <li key={k.id} style={{ fontSize: 11, color: C.tekst, lineHeight: 1.45 }}>
              {k.upozorenje && (
                <div style={{ color: C.zuta, fontWeight: 700, fontSize: 10, marginBottom: 2 }}>
                  {k.upozorenje}
                </div>
              )}
              <span>{k.tekst}</span>
              {k.akcija && (
                <button
                  type="button"
                  onClick={() => izvrsiWorkflowAkciju(k.akcija, k.payload, onWorkflow)}
                  style={{
                    display: "block",
                    marginTop: 4,
                    background: `${C.plava}22`,
                    border: `1px solid ${C.plava}`,
                    borderRadius: 5,
                    color: C.plava,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  → {i + 1}. Izvrši
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
