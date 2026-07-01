import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  ucitajFaiCekaju, ucitajFaiPoId, odobriFai, faiImaNok, formatFaiKreirao,
} from "../lib/faiWorkflow.js";
import { mozeOdobritiFai } from "../lib/uloge.js";

function dISO() {
  return new Date().toISOString().split("T")[0];
}

function MerenjaTabela({ merenja, C }) {
  if (!merenja?.length) {
    return <div style={{ color: C.sivi, fontSize: 11 }}>Nema merenja u zapisu.</div>;
  }
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 90px 56px",
        background: C.hover, padding: "6px 10px", fontSize: 9, color: C.sivi, gap: 8,
      }}>
        <span>POZICIJA</span><span>VREDNOST</span><span>STATUS</span>
      </div>
      {merenja.map((m, i) => {
        const nok = String(m.status || "").toUpperCase() === "NOK";
        return (
          <div key={`${m.pozicija}-${i}`} style={{
            display: "grid", gridTemplateColumns: "1fr 90px 56px",
            padding: "7px 10px", borderTop: `1px solid ${C.border}`,
            fontSize: 11, gap: 8, alignItems: "center",
          }}>
            <span style={{ color: C.tekst }}>{m.pozicija}</span>
            <span style={{ color: C.tekst, fontVariantNumeric: "tabular-nums" }}>{m.vrednost}</span>
            <span style={{ color: nok ? C.crvena : C.zelena, fontWeight: 700 }}>{m.status || "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

function FaiKartica({
  rec, C, korisnik, snimaId, onOdobri, kompakt = false,
}) {
  const imaNok = faiImaNok(rec.merenja_json);
  const moze = mozeOdobritiFai(korisnik?.uloga, { imaNok });

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${imaNok ? `${C.crvena}55` : `${C.zuta}55`}`,
      borderRadius: 10,
      padding: kompakt ? 10 : 14,
      marginBottom: kompakt ? 8 : 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>{rec.id_deo}</div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 2 }}>
            Smena {rec.smena}
            {rec.radni_nalog ? ` · RN ${rec.radni_nalog}` : ""}
            {rec.pogon_kod ? ` · ${rec.pogon_kod}` : ""}
          </div>
        </div>
        <span style={{
          background: imaNok ? `${C.crvena}22` : `${C.zuta}22`,
          color: imaNok ? C.crvena : C.zuta,
          fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6, alignSelf: "flex-start",
        }}>
          {imaNok ? "IMA NOK" : "ČEKA"}
        </span>
      </div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
        Uneto: {formatFaiKreirao(rec)}
        {" · "}{new Date(rec.created_at).toLocaleString("sr-RS")}
      </div>
      {rec.komentar && (
        <div style={{ color: C.zuta, fontSize: 10, marginBottom: 8 }}>💬 {rec.komentar}</div>
      )}
      <MerenjaTabela merenja={rec.merenja_json} C={C} />
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {moze ? (
          <button
            type="button"
            disabled={snimaId === rec.id}
            onClick={() => onOdobri(rec.id)}
            style={{
              background: C.zelena, border: "none", borderRadius: 8,
              color: "#fff", fontSize: 11, fontWeight: 700,
              padding: "9px 16px", cursor: snimaId === rec.id ? "wait" : "pointer",
              opacity: snimaId === rec.id ? 0.7 : 1,
            }}
          >
            {snimaId === rec.id ? "Odobrava…" : "Odobri FAI"}
          </button>
        ) : (
          <span style={{ color: C.sivi, fontSize: 10, lineHeight: 1.5 }}>
            {imaNok
              ? "FAI sa NOK — odobrava kvalitet / šef / admin."
              : "Nemate pravo odobrenja za ovaj zapis."}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Lista FAI zapisa na čekanju + odobrenje (tab ili ugrađeno na unosu).
 */
export default function FaiOdobrenjePanel({
  C, korisnik, smena, pogonKod, idDeoFilter, faiId, addToast, kompakt = false, onOdobreno,
}) {
  const [lista, setLista] = useState([]);
  const [jedan, setJedan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snimaId, setSnimaId] = useState(null);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      if (faiId) {
        const rec = await ucitajFaiPoId(supabase, faiId);
        setJedan(rec?.status === "ceka" ? rec : null);
        setLista([]);
      } else {
        const rows = await ucitajFaiCekaju(supabase, {
          datum: dISO(),
          smena,
          pogonKod,
          idDeo: idDeoFilter,
        });
        setLista(rows);
        setJedan(null);
      }
    } catch (e) {
      addToast?.(e.message, "greska");
      setLista([]);
      setJedan(null);
    } finally {
      setLoading(false);
    }
  }, [faiId, smena, pogonKod, idDeoFilter, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    const ch = supabase.channel("fai_odobrenje_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "fai_unosi" }, () => ucitaj())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ucitaj]);

  const odobri = async (id) => {
    const rec = lista.find((r) => r.id === id) || (jedan?.id === id ? jedan : null);
    const imaNok = faiImaNok(rec?.merenja_json);
    if (!mozeOdobritiFai(korisnik?.uloga, { imaNok })) {
      addToast?.("Nemate pravo odobrenja ovog FAI zapisa", "greska");
      return;
    }
    setSnimaId(id);
    try {
      const updated = await odobriFai(supabase, id, korisnik);
      if (updated.status === "odobren") {
        addToast?.("✓ FAI odobren — serija je puštena", "uspeh");
        onOdobreno?.(updated);
        await ucitaj();
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setSnimaId(null);
    }
  };

  const prikaz = faiId ? (jedan ? [jedan] : []) : lista;

  if (loading) {
    return (
      <div style={{ color: C.sivi, fontSize: 12, padding: kompakt ? 8 : 20, textAlign: "center" }}>
        Učitavanje FAI…
      </div>
    );
  }

  if (!prikaz.length) {
    return (
      <div style={{
        color: C.border, fontSize: 12, textAlign: "center",
        padding: kompakt ? 12 : 32,
        background: C.panel, borderRadius: 8, border: `1px solid ${C.border}`,
      }}>
        {faiId ? "Nema FAI zapisa na čekanju za ovaj deo." : "Nema FAI na čekanju odobrenja za danas."}
      </div>
    );
  }

  return (
    <div style={{ padding: kompakt ? 0 : "12px 16px" }}>
      {!kompakt && (
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>
          FAI NA ČEKANJU ({prikaz.length})
        </div>
      )}
      {prikaz.map((rec) => (
        <FaiKartica
          key={rec.id}
          rec={rec}
          C={C}
          korisnik={korisnik}
          snimaId={snimaId}
          onOdobri={odobri}
          kompakt={kompakt}
        />
      ))}
    </div>
  );
}
