import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import CrtezZoomViewer from "./CrtezZoomViewer.jsx";

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Pregled crteža + opcioni panel pored (dimenzije).
 * Spoljašnja veličina i levi/desni odnos se menjaju prevlačenjem.
 */
export default function CrtezSplitModal({
  url,
  C,
  onClose,
  sidePanel = null,
  title = "Crtež dela",
  fullscreen = false,
  hotspotTacke = null,
  viewBox = null,
}) {
  const [modalW, setModalW] = useState(() => clamp(Math.round(window.innerWidth * 0.9), 520, 1500));
  const [modalH, setModalH] = useState(() => clamp(Math.round(window.innerHeight * 0.86), 360, 960));
  const [splitPct, setSplitPct] = useState(sidePanel ? 42 : 100);
  const dragRef = useRef(null);

  const stopDrag = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "size") {
        setModalW(clamp(e.clientX - d.ox + d.startW, 480, window.innerWidth - 24));
        setModalH(clamp(e.clientY - d.oy + d.startH, 300, window.innerHeight - 24));
      } else if (d.kind === "split") {
        const rect = d.el.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        setSplitPct(clamp(pct, 22, sidePanel ? 78 : 100));
      }
    };
    const onUp = () => stopDrag();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [sidePanel, stopDrag]);

  const startSizeDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { kind: "size", ox: e.clientX, oy: e.clientY, startW: modalW, startH: modalH };
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
  };

  const startSplitDrag = (e, el) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { kind: "split", el };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const imaPanel = !!sidePanel && !fullscreen;

  if (fullscreen) {
    const modal = (
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.92)",
          display: "flex", flexDirection: "column", padding: 8,
        }}
      >
        <div
          role="dialog"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            minHeight: 0,
            background: C.panel,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <span style={{ color: C.tekst, fontSize: 11, fontWeight: 700 }}>{title}</span>
            <span style={{ color: C.sivi, fontSize: 9 }}>Točkić / + − · prevuci</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: 8 }}>
            <CrtezZoomViewer
              url={url}
              C={C}
              onClose={onClose}
              hotspotTacke={hotspotTacke}
              viewBox={viewBox}
            />
          </div>
        </div>
      </div>
    );
    return createPortal(modal, document.body);
  }

  const modal = (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.82)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
      }}
    >
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: modalW,
          height: modalH,
          maxWidth: "calc(100vw - 24px)",
          maxHeight: "calc(100vh - 24px)",
          background: C.panel,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 12px 48px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <span style={{ color: C.tekst, fontSize: 11, fontWeight: 700 }}>{title}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>
              {imaPanel ? "Prevuci razdelnik · ugao — veličina prozora" : "Ugao — veličina prozora"}
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: C.hover, border: `1px solid ${C.border}`, borderRadius: 4,
                color: C.crvena, fontSize: 10, padding: "4px 10px", cursor: "pointer",
              }}
            >
              ✕ Zatvori
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <div style={{
            width: imaPanel ? `${splitPct}%` : "100%",
            minWidth: imaPanel ? 180 : 0,
            display: "flex",
            flexDirection: "column",
            padding: 8,
            minHeight: 0,
          }}>
            <CrtezZoomViewer url={url} C={C} visina={120} />
          </div>

          {imaPanel && (
            <>
              <div
                role="separator"
                aria-orientation="vertical"
                title="Prevuci — širina crteža / polja"
                onMouseDown={(e) => startSplitDrag(e, e.currentTarget.parentElement)}
                style={{
                  width: 8, flexShrink: 0, cursor: "col-resize",
                  background: C.hover, borderLeft: `1px solid ${C.border}`,
                  borderRight: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <span style={{ color: C.sivi, fontSize: 10, userSelect: "none" }}>⋮</span>
              </div>
              <div style={{
                flex: 1, minWidth: 200, overflow: "auto", padding: "8px 10px",
                background: `${C.input}88`,
              }}>
                {sidePanel}
              </div>
            </>
          )}
        </div>

        <div
          role="presentation"
          onMouseDown={startSizeDrag}
          title="Prevuci za promenu širine i visine prozora"
          style={{
            position: "absolute", right: 0, bottom: 0, width: 18, height: 18,
            cursor: "nwse-resize", zIndex: 2,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M6 18L18 6M10 18L18 10M14 18L18 14" stroke={C.sivi} strokeWidth="1.2" />
          </svg>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
