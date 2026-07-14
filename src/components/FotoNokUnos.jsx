import { useRef } from "react";
import { ucitajSlikuKaoDataUrl } from "../lib/slikaNok.js";

export default function FotoNokUnos({
  C, foto, komentar, onFoto, onKomentar, onGreska, kompakt,
}) {
  const ref = useRef(null);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const url = await ucitajSlikuKaoDataUrl(f);
      onFoto(url);
    } catch (err) {
      onGreska?.(err.message || "Greška pri učitavanju slike");
    }
  };

  const btn = {
    background: C.hover,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    color: C.sivi,
    fontSize: kompakt ? 9 : 10,
    padding: kompakt ? "4px 8px" : "6px 10px",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div style={{
      marginTop: kompakt ? 4 : 8,
      paddingTop: kompakt ? 4 : 8,
      borderTop: `1px solid ${C.hover}`,
      flexShrink: 0,
    }}>
      <div style={{
        color: C.sivi, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4,
      }}>
        Foto (NOK)
      </div>
      {foto ? (
        <div style={{ position: "relative", marginBottom: 6 }}>
          <img src={foto} alt="NOK" style={{
            width: "100%", borderRadius: 6, maxHeight: kompakt ? 72 : 100, objectFit: "cover",
          }} />
          <button type="button" onClick={() => onFoto(null)}
            style={{
              position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)",
              border: "none", borderRadius: 4, color: C.onAkcent, fontSize: 11, padding: "2px 8px", cursor: "pointer",
            }}>✕</button>
        </div>
      ) : (
        <button type="button" style={btn} onClick={() => ref.current?.click()} title="Otvori kameru ili galeriju">
          📷 Slikaj / izaberi
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment"
        onChange={onFile} style={{ display: "none" }} />
      <input
        type="text"
        value={komentar || ""}
        onChange={e => onKomentar(e.target.value)}
        placeholder="Komentar (opciono)"
        style={{
          width: "100%", marginTop: 6, background: C.input, border: `1px solid ${C.border}`,
          borderRadius: 5, color: C.tekst, fontSize: 10, padding: "6px 8px", boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}
