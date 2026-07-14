/** Zajednički UI dijalozi — izdvojeno iz App.jsx */

export function Toast({ poruke, C }) {
  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 1400, display: "flex", flexDirection: "column", gap: 8 }}>
      {poruke.map((p, i) => (
        <div key={i} style={{
          background: C.panel,
          border: `1px solid ${p.tip === "uspeh" ? C.zelena : p.tip === "greska" ? C.crvena : C.border}`,
          borderRadius: 8, padding: "10px 16px", fontSize: 12, color: C.tekst,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", minWidth: 220,
          borderLeft: `3px solid ${p.tip === "uspeh" ? C.zelena : p.tip === "greska" ? C.crvena : C.plava}`,
        }}>
          {p.tekst}
        </div>
      ))}
    </div>
  );
}

export function Modal({ poruka, tip, onOK, onOtkazati, okTekst = "OK", C }) {
  const boja = tip === "uspeh" ? C.zelena : tip === "greska" ? C.crvena : C.plava;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${boja}`, borderRadius: 12,
        padding: "30px 34px", maxWidth: 420, textAlign: "center",
      }}>
        <div style={{ color: boja, fontSize: 28, marginBottom: 10 }}>
          {tip === "uspeh" ? "✓" : tip === "greska" ? "✗" : "ℹ"}
        </div>
        <div style={{ color: C.tekst, fontSize: 13, lineHeight: 1.7, marginBottom: 20, whiteSpace: "pre-line" }}>
          {poruka}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={onOK} style={{
            background: boja, border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 13, fontWeight: 700, padding: "9px 24px", cursor: "pointer",
          }}>
            {okTekst}
          </button>
          {onOtkazati && (
            <button type="button" onClick={onOtkazati} style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, fontSize: 12, padding: "9px 16px", cursor: "pointer",
            }}>
              Otkaži
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlarmBanner({ poruka, onClose, C }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 1500, background: C.crvena,
      padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      boxShadow: `0 4px 20px ${C.crvena}60`,
    }}>
      <div style={{ color: C.onAkcent, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
        🚨 ALARM — {poruka}
      </div>
      <button type="button" onClick={onClose} style={{
        background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 5, color: C.onAkcent, fontSize: 11, padding: "4px 12px", cursor: "pointer",
      }}>
        Potvrdi
      </button>
    </div>
  );
}
