import { bojaNivoa } from "../lib/operativniAlarmi.js";
import {
  izvrsiWorkflowAkciju,
  akcijaZaOperativniAlarm,
  WORKFLOW_TIP,
} from "../lib/workflowAkcije.js";

const OZNAKA_NIVOA = {
  kriticno: "⛔",
  visok: "⚠",
  srednji: "▲",
  nizak: "•",
};

export default function OperativniAlarmiStrip({
  alarmi,
  C,
  onZatvori,
  kompakt,
  onWorkflow,
  kontekst = {},
}) {
  const visoki = (alarmi || []).filter((a) => a.nivo === "visok" || a.nivo === "kriticno");
  const prikaz = kompakt ? (alarmi || []).slice(0, 4) : visoki.length ? visoki : (alarmi || []).slice(0, 3);
  if (!prikaz.length) return null;

  const akcijaZaAlarm = (a) => akcijaZaOperativniAlarm(a, kontekst);

  return (
    <div
      role="region"
      aria-label="Operativni alarmi"
      aria-live="polite"
      data-testid="operativni-alarmi-strip"
      style={{
        background: "#2d1010",
        border: `1px solid ${C.crvena}50`,
        borderRadius: kompakt ? 8 : 10,
        padding: kompakt ? "10px 12px" : "12px 16px",
        marginBottom: kompakt ? 12 : 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ color: C.crvena, fontSize: 10, fontWeight: 700, letterSpacing: 1.2 }}>
          ALARMI · REAGUJ SADA
        </div>
        {onZatvori && (
          <button type="button" onClick={onZatvori} aria-label="Zatvori traku alarma"
            style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 14 }}>
            ✕
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {prikaz.map((a) => {
          const wf = akcijaZaAlarm(a);
          const ncrJePrimarni = wf?.akcija === WORKFLOW_TIP.NCR_IZ_ALARMA
            || wf?.akcija === WORKFLOW_TIP.NCR;
          return (
            <div key={a.id} style={{
              fontSize: 11,
              lineHeight: 1.45,
              padding: "8px 10px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: 6,
              border: `1px solid ${bojaNivoa(a.nivo, C)}40`,
            }}>
              <span style={{ color: bojaNivoa(a.nivo, C), fontWeight: 700 }}>
                <span aria-hidden="true">{OZNAKA_NIVOA[a.nivo] || "•"} </span>
                <span className="sr-only">{`Nivo ${a.nivo || "info"}: `}</span>
                {a.naslov}
              </span>
              {a.opis && (
                <span style={{ color: C.sivi, display: "block", fontSize: 10, marginTop: 2 }}>{a.opis}</span>
              )}
              {onWorkflow && wf && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    data-testid={`alarm-cta-${a.id}`}
                    onClick={() => izvrsiWorkflowAkciju(wf.akcija, wf.payload, onWorkflow)}
                    style={{
                      background: C.crvena,
                      border: "none",
                      borderRadius: 5,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      minHeight: 36,
                    }}
                  >
                    → {wf.label}
                  </button>
                  {ncrJePrimarni && onWorkflow.onOtvori8D && (
                    <button
                      type="button"
                      onClick={() => izvrsiWorkflowAkciju(
                        WORKFLOW_TIP.OSMD_8D,
                        { ...(wf.payload || {}), modul: wf.payload?.modul || kontekst.modul },
                        onWorkflow,
                      )}
                      style={{
                        background: "transparent",
                        border: `1px solid ${C.plava}`,
                        borderRadius: 5,
                        color: C.plava,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        minHeight: 36,
                      }}
                    >
                      8D
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
