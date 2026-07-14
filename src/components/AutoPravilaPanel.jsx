import { useState } from "react";
import { AUTO_PRAVILA } from "../lib/autoPravila.js";

/**
 * Pregled auto-pravila za admin / kvalitet / šef.
 * @param {{ C: object, kompakt?: boolean, podrazumevanoOtvoren?: boolean }} props
 */
export default function AutoPravilaPanel({ C, kompakt = false, podrazumevanoOtvoren = false }) {
  const [otvoren, setOtvoren] = useState(podrazumevanoOtvoren || !kompakt);

  return (
    <div
      data-testid="auto-pravila-panel"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: kompakt ? 10 : 12,
        padding: kompakt ? "10px 12px" : 16,
        marginBottom: kompakt ? 12 : 16,
      }}
    >
      <button
        type="button"
        onClick={() => setOtvoren((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          color: C.tekst,
          fontSize: kompakt ? 11 : 13,
          fontWeight: 700,
          letterSpacing: 0.5,
          cursor: "pointer",
          padding: 0,
          fontFamily: "inherit",
        }}
      >
        <span>🤖 Auto pravila ({AUTO_PRAVILA.length})</span>
        <span style={{ color: C.sivi, fontSize: 10 }}>{otvoren ? "▲" : "▼"}</span>
      </button>

      {otvoren && (
        <>
          <p style={{
            color: C.sivi,
            fontSize: kompakt ? 9 : 10,
            lineHeight: 1.5,
            margin: "10px 0 12px",
          }}>
            Pravila rade bez AI — na osnovu pragova u bazi. Task Scheduler: <code>npm run auto:install</code>
            {" · "}logovi: <code>npm run logs:auto</code>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: kompakt ? 6 : 8 }}>
            {AUTO_PRAVILA.map((p) => (
              <div
                key={p.id}
                data-testid={`auto-pravilo-${p.id}`}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: kompakt ? "8px 10px" : "10px 12px",
                }}
              >
                <div style={{ color: C.tekst, fontSize: kompakt ? 11 : 12, fontWeight: 700 }}>
                  {p.naslov}
                </div>
                <div style={{ color: C.sivi, fontSize: kompakt ? 9 : 10, marginTop: 4, lineHeight: 1.45 }}>
                  {p.opis}
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 6,
                  fontSize: 9,
                  color: C.sivi,
                }}>
                  <span>⏱ {p.okidač}</span>
                  <span>📣 {p.kanal}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
