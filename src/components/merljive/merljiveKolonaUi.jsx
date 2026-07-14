import { dimKolonaUnos } from "../../layout/index.js";

export function metaRed(C, naslov, vrednost, accent, K) {
  const M = K.metaRed;
  return (
    <div style={{
      fontSize: M.vrednostFont,
      marginBottom: M.marginBottom,
      lineHeight: M.lineHeight,
      flexShrink: 0,
    }}>
      <span style={{
        color: C.border,
        fontSize: M.naslovFont,
        display: "block",
        textTransform: "uppercase",
        letterSpacing: M.naslovLetterSpacing,
      }}>
        {naslov}
      </span>
      <span style={{
        color: accent || C.tekst,
        fontWeight: accent ? M.vrednostFontWeightAccent : M.vrednostFontWeight,
        fontSize: M.vrednostFont,
      }}>
        {vrednost || "—"}
      </span>
    </div>
  );
}

export function mobMetaCelija(C, naslov, vrednost, accent, poravnanje, K) {
  const M = K.metaRed;
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: poravnanje }}>
      <div style={{
        color: C.border, fontSize: M.naslovFont, textTransform: "uppercase",
        letterSpacing: M.naslovLetterSpacing, lineHeight: 1.2, marginBottom: 1,
      }}>
        {naslov}
      </div>
      <div style={{
        color: accent || C.tekst,
        fontSize: M.vrednostFont,
        fontWeight: accent ? M.vrednostFontWeightAccent : M.vrednostFontWeight,
        lineHeight: 1.2,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {vrednost || "—"}
      </div>
    </div>
  );
}

export function metaLevoDesno(C, levoNaslov, levoVal, desnoNaslov, desnoVal, levoBoja, desnoBoja, K) {
  const M = K.metaRed;
  const lslUsl = K.metaLslUsl;
  const naslovStil = {
    color: C.border,
    fontSize: M.naslovFont,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: M.naslovLetterSpacing,
  };
  const vrednostStil = (boja) => ({
    color: boja || C.tekst,
    fontWeight: lslUsl.vrednostFontWeight,
    fontSize: M.vrednostFont,
  });
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: lslUsl.gap,
      marginBottom: lslUsl.marginBottom,
      flexShrink: 0,
      fontSize: M.vrednostFont,
      lineHeight: M.lineHeight,
    }}>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <span style={naslovStil}>{levoNaslov}</span>
        <span style={vrednostStil(levoBoja)}>{levoVal ?? "—"}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
        <span style={naslovStil}>{desnoNaslov}</span>
        <span style={vrednostStil(desnoBoja)}>{desnoVal ?? "—"}</span>
      </div>
    </div>
  );
}

export function inpMerenjeBaza(inp, kompakt) {
  const K = dimKolonaUnos({ kompakt });
  return {
    ...inp,
    fontSize: K.inputMerenje.fontSize,
    fontWeight: K.inputMerenje.fontWeight,
    padding: K.inputMerenje.padding,
    minHeight: K.inputMerenje.minHeight,
    borderRadius: K.inputMerenje.borderRadius,
    boxSizing: "border-box",
  };
}
