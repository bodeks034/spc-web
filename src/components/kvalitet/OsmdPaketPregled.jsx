import { useEffect, useState } from "react";
import { supabase as defaultSupabase } from "../../lib/supabaseClient.js";
import {
  ucitajPfmeaCpPaketZa8d,
  sazetakPfmeaCpPaketa,
} from "../../lib/osmdPfmeaCpPaket.js";
import { izracunajRpnSummary } from "../../lib/pfmeaControlPlan.js";
import { statusNaziv8d } from "../../lib/osmdIzvestajPdf.js";

function Kpi({ label, vrednost, C, boja }) {
  return (
    <div style={{
      background: C.hover, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "10px 12px", minWidth: 88, flex: "1 1 88px",
    }}>
      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ color: boja || C.tekst, fontSize: 16, fontWeight: 700 }}>{vrednost}</div>
    </div>
  );
}

export default function OsmdPaketPregled({
  izvestaj,
  C,
  supabase = defaultSupabase,
  onOtvoriPfmeaCp,
  onExportPaket,
  paketBusy = false,
}) {
  const [loading, setLoading] = useState(false);
  const [dokument, setDokument] = useState(null);
  const [storageMode, setStorageMode] = useState(null);

  const osmdId = izvestaj?.id;
  const broj8d = izvestaj?.broj_8d;
  const idDeo = izvestaj?.id_deo;

  useEffect(() => {
    if (!osmdId && !broj8d) {
      setDokument(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ucitajPfmeaCpPaketZa8d(supabase, { osmdId, broj8d, idDeo });
        if (!cancelled) {
          setDokument(res.dokument);
          setStorageMode(res.storageMode);
        }
      } catch {
        if (!cancelled) setDokument(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [osmdId, broj8d, idDeo, supabase]);

  const sazetak = sazetakPfmeaCpPaketa(dokument);
  const rpn = dokument
    ? (dokument.rpnSummary?.length
      ? dokument.rpnSummary
      : izracunajRpnSummary(dokument.pfmea?.redovi || []))
    : [];

  if (!osmdId && !broj8d) return null;

  return (
    <div style={{
      background: `${C.plava}10`,
      border: `1px solid ${C.plava}44`,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
        marginBottom: 12,
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: C.plava, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>
            PREGLED PAKETA KVALITETA
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4 }}>
            8D {broj8d || `#${osmdId}`} · deo {idDeo || "—"}
            {loading ? " · učitavanje PFMEA/CP…" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {onOtvoriPfmeaCp && (
            <button
              type="button"
              onClick={onOtvoriPfmeaCp}
              style={{
                background: C.hover, border: `1px solid ${C.plava}`, borderRadius: 7,
                color: C.plava, fontSize: 10, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
              }}
            >
              → PFMEA / CP
            </button>
          )}
          {onExportPaket && (
            <button
              type="button"
              disabled={paketBusy}
              onClick={onExportPaket}
              style={{
                background: paketBusy ? C.hover : "#7c3aed", border: "none", borderRadius: 7,
                color: paketBusy ? C.sivi : "#fff",
                fontSize: 10, fontWeight: 700, padding: "7px 12px",
                cursor: paketBusy ? "wait" : "pointer",
              }}
            >
              {paketBusy ? "⏳ Paket…" : "📦 ZIP paket (Word+RPN+Excel)"}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: sazetak.imaDokument ? 12 : 0 }}>
        <Kpi label="8D status" vrednost={statusNaziv8d(izvestaj?.status)} C={C} boja={C.plava} />
        <Kpi
          label="PFMEA stavke"
          vrednost={sazetak.imaDokument ? sazetak.pfmeaBroj : "—"}
          C={C}
        />
        <Kpi
          label="CP stavke"
          vrednost={sazetak.imaDokument ? sazetak.cpBroj : "—"}
          C={C}
        />
        <Kpi
          label="RPN redovi"
          vrednost={sazetak.imaDokument ? rpn.length : "—"}
          C={C}
        />
      </div>

      {!loading && !sazetak.imaDokument && (
        <div style={{ color: C.sivi, fontSize: 11, fontStyle: "italic" }}>
          Nema povezanog PFMEA/CP dokumenta — koristite „→ PFMEA / Control Plan“ da prenesete iz 8D.
        </div>
      )}

      {!loading && sazetak.imaDokument && (
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 8, fontStyle: "italic" }}>
          PDF paket uključuje Word 8D + RPN Excel + PFMEA/CP Excel (ZIP).
        </div>
      )}

      {sazetak.imaDokument && (
        <div style={{ fontSize: 11, color: C.tekst }}>
          <strong>{sazetak.naziv}</strong>
          {sazetak.revizija && <span style={{ color: C.sivi }}> · Rev. {sazetak.revizija}</span>}
          {storageMode === "local" && (
            <span style={{ color: C.narandzasta }}> · lokalni režim</span>
          )}
          {rpn.length > 0 && (
            <div style={{ color: C.sivi, fontSize: 10, marginTop: 6 }}>
              RPN primer: {rpn[0].mod_greske?.slice(0, 48) || "—"}
              {" · "}pre {rpn[0].rpn_before || "—"} → posle {rpn[0].rpn_after || "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
