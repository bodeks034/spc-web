import { bojaNivoa } from "../lib/operativniAlarmi.js";
import { izvrsiWorkflowAkciju, akcijaZaOperativniAlarm } from "../lib/workflowAkcije.js";
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
    <div style={{
      background: "#2d1010",
      border: `1px solid ${C.crvena}50`,
      borderRadius: kompakt ? 8 : 10,
      padding: kompakt ? "10px 12px" : "12px 16px",
      marginBottom: kompakt ? 12 : 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ color: C.crvena, fontSize: 10, fontWeight: 700, letterSpacing: 1.2 }}>
          ⚠ OPERATIVNI ALARMI
        </div>
        {onZatvori && (
          <button type="button" onClick={onZatvori}
            style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 14 }}>
            ✕
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {prikaz.map((a) => {
          const wf = akcijaZaAlarm(a);
          return (
            <div key={a.id} style={{
              fontSize: 11,
              lineHeight: 1.45,
              padding: "8px 10px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: 6,
              border: `1px solid ${bojaNivoa(a.nivo, C)}40`,
            }}>
              <span style={{ color: bojaNivoa(a.nivo, C), fontWeight: 700 }}>{a.naslov}</span>
              {a.opis && (
                <span style={{ color: C.sivi, display: "block", fontSize: 10, marginTop: 2 }}>{a.opis}</span>
              )}
              {onWorkflow && (
                <button
                  type="button"
                  onClick={() => izvrsiWorkflowAkciju(wf.akcija, wf.payload, onWorkflow)}
                  style={{
                    marginTop: 6,
                    background: `${C.plava}33`,
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
                  → {wf.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
