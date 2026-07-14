import { useRef, useState } from "react";

function HotspotKrugovi({ tacke, C, velicina = 26 }) {
  if (!tacke?.length) return null;
  return tacke.map((t, i) => (
    <span
      key={`${t.poz}-${i}`}
      aria-hidden
      style={{
        position: "absolute",
        left: `${t.x}%`,
        top: `${t.y}%`,
        transform: "translate(-50%, -50%)",
        width: velicina,
        height: velicina,
        borderRadius: "50%",
        border: `2.5px solid ${C.zelena}`,
        background: "rgba(34,197,94,0.42)",
        boxShadow: `0 0 0 2px ${C.zelena}44`,
        pointerEvents: "none",
        animation: "moment-poz-pulse 1.2s ease-in-out infinite",
      }}
    />
  ));
}

export default function CrtezZoomViewer({
  url, C, visina, onFullscreen, onClose, hotspotTacke = null, viewBox = null,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pomerio = useRef(false);
  const downAt = useRef({ x: 0, y: 0 });

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const btn = {
    background: C.hover,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    color: C.sivi,
    fontSize: 10,
    padding: "3px 9px",
    cursor: "pointer",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" style={btn} onClick={() => setZoom(z => Math.min(6, z + 0.25))}>+</button>
        <span style={{ fontSize: 9, color: C.sivi, minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button type="button" style={btn} onClick={() => setZoom(z => Math.max(0.35, z - 0.25))}>−</button>
        <button type="button" style={btn} onClick={reset}>⊡</button>
        {onFullscreen && (
          <button type="button" style={btn} onClick={onFullscreen} title="Ceo ekran">⛶ Ceo ekran</button>
        )}
        {onClose && (
          <button type="button" style={{ ...btn, marginLeft: "auto", color: C.crvena }} onClick={onClose}>✕ Zatvori</button>
        )}
      </div>
      <div
        onWheel={e => {
          e.preventDefault();
          setZoom(z => Math.min(6, Math.max(0.35, z - e.deltaY * 0.001)));
        }}
        onMouseDown={e => {
          pomerio.current = false;
          downAt.current = { x: e.clientX, y: e.clientY };
          setDrag(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={e => {
          if (!drag) return;
          const dx = e.clientX - downAt.current.x;
          const dy = e.clientY - downAt.current.y;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pomerio.current = true;
          setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }}
        onMouseUp={() => {
          if (drag && !pomerio.current && onFullscreen) onFullscreen();
          setDrag(false);
        }}
        onMouseLeave={() => setDrag(false)}
        title={onFullscreen ? "Klik — ceo ekran · prevuci — pomeri" : undefined}
        style={{
          flex: 1,
          minHeight: visina || 200,
          overflow: "hidden",
          background: C.input,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          cursor: drag ? "grabbing" : onFullscreen ? "pointer" : "grab",
          position: "relative",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            maxWidth: "92%",
            maxHeight: "92%",
            aspectRatio: viewBox ? `${viewBox[0]} / ${viewBox[1]}` : undefined,
          }}
        >
          <img
            src={url}
            alt="crtež dela"
            draggable={false}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
              userSelect: "none",
              pointerEvents: "none",
            }}
            onError={e => { e.target.style.opacity = "0.3"; }}
          />
          {hotspotTacke?.length > 0 && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <HotspotKrugovi tacke={hotspotTacke} C={C} velicina={28} />
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes moment-poz-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.92; }
        }
      `}</style>
    </div>
  );
}
