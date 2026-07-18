import { useEffect, useRef, useState } from "react";
import { ucitajSlikuKaoDataUrl, dataUrlIzVidea } from "../lib/slikaNok.js";

export default function FotoNokUnos({
  C, foto, komentar, onFoto, onKomentar, onGreska, kompakt,
}) {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [kamera, setKamera] = useState(false);

  const zaustaviKameru = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setKamera(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const otvoriKameru = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      // Nema kamere API-ja — padni na file input (mobilni će ponuditi kameru).
      ref.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setKamera(true);
      // video element se montira tek posle setKamera(true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      const poruka = /NotAllowedError|Permission/i.test(err?.name || err?.message || "")
        ? "Pristup kameri je odbijen — dozvoli kameru u browseru ili izaberi fajl."
        : "Kamera nije dostupna — izaberi fajl.";
      onGreska?.(poruka);
      ref.current?.click();
    }
  };

  const uslikaj = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    try {
      onFoto(dataUrlIzVidea(v));
      zaustaviKameru();
    } catch (err) {
      onGreska?.(err.message || "Greška pri snimanju slike");
    }
  };

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
    flex: 1,
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
      ) : kamera ? (
        <div style={{ marginBottom: 6 }}>
          <video ref={videoRef} muted playsInline style={{
            width: "100%", borderRadius: 6, maxHeight: kompakt ? 140 : 220,
            objectFit: "cover", background: "#000",
          }} />
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <button type="button" style={{ ...btn, color: C.tekst, fontWeight: 700 }} onClick={uslikaj}>
              ● Uslikaj
            </button>
            <button type="button" style={btn} onClick={zaustaviKameru}>
              Otkaži
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={btn} onClick={otvoriKameru} title="Otvori kameru">
            📷 Slikaj
          </button>
          <button type="button" style={btn} onClick={() => ref.current?.click()} title="Izaberi sliku iz fajlova">
            🖼 Izaberi fajl
          </button>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*"
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
