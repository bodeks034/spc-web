function visinaPolja(unosStil = {}) {
  if (unosStil.height) return unosStil.height;
  if (unosStil.minHeight) return unosStil.minHeight;
  const fs = Number(unosStil.fontSize) || 14;
  const pad = unosStil.padding;
  if (typeof pad === "string") {
    const p = pad.split(/\s+/).map((x) => parseFloat(x));
    const gore = p[0] || 0;
    const dole = p.length > 2 ? p[2] : p[0];
    return Math.ceil(gore + dole + fs * 1.15);
  }
  return 40;
}

/** Samo prikaz trenutne smene (bez izbora). */
export default function SmenaAutoPrikaz({
  smena,
  C,
  lblStyle = {},
  inpStyle = {},
  sirina,
  kompakt = false,
}) {
  const s = Number(smena) || 1;
  const visina = visinaPolja(inpStyle);
  const lbl = {
    color: C.sivi,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 2,
    display: "block",
    ...lblStyle,
  };

  return (
    <div style={{
      flex: sirina ? `0 0 ${sirina}px` : undefined,
      minWidth: sirina || undefined,
      width: sirina ? sirina : "100%",
    }}>
      <span style={lbl}>Smena</span>
      <div
        title={`Smena ${s}`}
        style={{
          width: "100%",
          boxSizing: "border-box",
          height: visina,
          minHeight: visina,
          maxHeight: visina,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.input,
          border: `1px solid ${C.border}`,
          borderRadius: inpStyle.borderRadius ?? 8,
          color: C.tekst,
          fontWeight: 700,
          fontSize: inpStyle.fontSize ?? 14,
          padding: kompakt ? "0 4px" : "0 8px",
          userSelect: "none",
        }}
      >
        {s}
      </div>
    </div>
  );
}
