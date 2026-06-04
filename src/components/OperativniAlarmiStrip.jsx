import { bojaNivoa } from "../lib/operativniAlarmi.js";

export default function OperativniAlarmiStrip({ alarmi, C, onZatvori, kompakt }) {
  const visoki = (alarmi || []).filter(a => a.nivo === "visok");
  const prikaz = kompakt ? (alarmi || []).slice(0, 3) : visoki.length ? visoki : (alarmi || []).slice(0, 2);
  if (!prikaz.length) return null;

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
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {prikaz.map(a => (
          <div key={a.id} style={{ fontSize: 11, lineHeight: 1.45 }}>
            <span style={{ color: bojaNivoa(a.nivo, C), fontWeight: 700 }}>{a.naslov}</span>
            {a.opis && (
              <span style={{ color: C.sivi, display: "block", fontSize: 10, marginTop: 2 }}>{a.opis}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
