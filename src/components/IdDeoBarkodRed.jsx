import { BarkodSkenirajPolje } from "./BarkodKameraSken.jsx";

function visinaKaoInput(unosStil = {}) {
  if (unosStil.minHeight) return unosStil.minHeight;
  if (unosStil.height) return unosStil.height;
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

/**
 * ID deo + usko polje „ID barkod“ (kamera) u istom redu, ista visina.
 */
export default function IdDeoBarkodRed({
  C,
  akcent = C?.plava,
  onBarkodSken,
  lblStyle,
  idLabel = "ID deo",
  barkodLabel = "Kamera",
  sirinaBarkod = 68,
  razmakKolona = 8,
  kompaktRed = false,
  unosStil = {},
  children,
  hintUsb = false,
}) {
  const LBL = lblStyle || {
    color: C.sivi,
    fontSize: 12,
    letterSpacing: 1.3,
    marginBottom: 0,
    display: "block",
  };
  const lblRed = {
    ...LBL,
    marginBottom: LBL.marginBottom ?? 8,
    fontSize: LBL.fontSize ?? 12,
  };

  const visinaUnosa = visinaKaoInput(unosStil);

  const poljeStil = {
    borderRadius: unosStil.borderRadius ?? 10,
    minHeight: visinaUnosa,
    height: visinaUnosa,
    fontSize: sirinaBarkod <= 28
      ? Math.max(9, Math.round((unosStil.fontSize ? Number(unosStil.fontSize) : 14) * 0.72))
      : (unosStil.fontSize ? Math.round(Number(unosStil.fontSize) * 0.85) : 20),
  };

  if (kompaktRed) {
    return (
      <div>
        <span style={{ ...lblRed, display: "block", marginBottom: lblRed.marginBottom ?? 3 }}>
          {idLabel}
        </span>
        <div style={{ display: "flex", gap: razmakKolona, alignItems: "stretch", minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
          {onBarkodSken && (
            <div style={{
              width: sirinaBarkod,
              minWidth: sirinaBarkod,
              maxWidth: sirinaBarkod,
              flex: `0 0 ${sirinaBarkod}px`,
              display: "flex",
            }}>
              <BarkodSkenirajPolje
                onSken={onBarkodSken}
                C={C}
                akcent={akcent}
                velicinaIkone={poljeStil.fontSize}
                stil={{ ...poljeStil, width: sirinaBarkod, height: "100%" }}
              />
            </div>
          )}
        </div>
        {hintUsb && (
          <div style={{ color: C.border, fontSize: 10, marginTop: 6, textAlign: "center" }}>
            USB čitač: fokus u polje ID deo pa skeniraj
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: `minmax(0, 1fr) ${sirinaBarkod}px`,
        columnGap: razmakKolona,
        rowGap: 4,
        alignItems: "end",
        gridTemplateRows: "auto 1fr",
      }}>
        <span style={{ ...lblRed, gridColumn: 1 }}>{idLabel}</span>
        <span style={{
          ...lblRed,
          gridColumn: 2,
          textAlign: "center",
          fontSize: Math.max(8, (lblRed.fontSize || 12) - 1),
          letterSpacing: 0.8,
        }}
        >
          {barkodLabel}
        </span>
        <div style={{ gridColumn: 1, minWidth: 0 }}>{children}</div>
        <div style={{
          gridColumn: 2,
          alignSelf: "stretch",
          width: sirinaBarkod,
          minWidth: sirinaBarkod,
          maxWidth: sirinaBarkod,
          display: "flex",
        }}>
          {onBarkodSken && (
            <BarkodSkenirajPolje
              onSken={onBarkodSken}
              C={C}
              akcent={akcent}
              velicinaIkone={poljeStil.fontSize}
              stil={{ ...poljeStil, width: sirinaBarkod, height: "100%" }}
            />
          )}
        </div>
      </div>
      {hintUsb && (
        <div style={{ color: C.border, fontSize: 10, marginTop: 6, textAlign: "center" }}>
          USB čitač: fokus u polje ID deo pa skeniraj
        </div>
      )}
    </div>
  );
}
