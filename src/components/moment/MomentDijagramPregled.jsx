import { useState, useEffect } from "react";
import { lokalnaPutanjaMomentDijagram } from "../../lib/crtezAssets.js";
import { hotspotZaPoz, viewBoxDijagrama } from "../../lib/momentDijagramHotspot.js";

const omotStil = ({ sidebar, kompakt, maxHeight, vbW, vbH, onZoom }) => ({
  position: "relative",
  display: "block",
  width: sidebar ? "92%" : "100%",
  maxWidth: sidebar ? "92%" : "100%",
  maxHeight: sidebar ? "92%" : (kompakt ? 120 : maxHeight),
  aspectRatio: `${vbW} / ${vbH}`,
  margin: sidebar ? "0 auto" : "0 auto",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: onZoom ? "zoom-in" : "default",
  overflow: "hidden",
});

function DijagramSlika({ url, dijagram, tacke, C, kompakt, sidebar, onError }) {
  return (
    <>
      <img
        src={url}
        alt={`Dijagram ${dijagram}`}
        onError={onError}
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
      {tacke.map((t, i) => (
        <span
          key={`${t.poz}-${i}`}
          aria-hidden
          style={{
            position: "absolute",
            left: `${t.x}%`,
            top: `${t.y}%`,
            transform: "translate(-50%, -50%)",
            width: sidebar ? 18 : (kompakt ? 22 : 28),
            height: sidebar ? 18 : (kompakt ? 22 : 28),
            borderRadius: "50%",
            border: `2.5px solid ${C.zelena}`,
            background: "rgba(34,197,94,0.42)",
            boxShadow: `0 0 0 2px ${C.zelena}44`,
            pointerEvents: "none",
            animation: "moment-poz-pulse 1.2s ease-in-out infinite",
          }}
        />
      ))}
    </>
  );
}

/**
 * Dijagram sklopa sa highlight aktivne Poz. br.
 * Hotspoti su u % viewBox-a — omotač drži isti odnos širine/visine kao SVG.
 */
export default function MomentDijagramPregled({
  C,
  dijagram,
  pozBr,
  maxHeight = 180,
  onZoom,
  kompakt = false,
  prikaziDugmeZoom = true,
  sidebar = false,
}) {
  const [greska, setGreska] = useState(false);
  const [lokalniZoom, setLokalniZoom] = useState(1);
  const url = dijagram ? lokalnaPutanjaMomentDijagram(dijagram) : null;
  const tacke = pozBr && dijagram ? hotspotZaPoz(dijagram, pozBr) : [];
  const [vbW, vbH] = viewBoxDijagrama(dijagram);

  useEffect(() => {
    setLokalniZoom(1);
  }, [dijagram, pozBr]);

  if (!url || greska) return null;

  const otvoriZoom = (e) => {
    e?.stopPropagation?.();
    onZoom?.();
  };

  const stil = omotStil({ sidebar, kompakt, maxHeight, vbW, vbH, onZoom });
  const naTockicu = onZoom ? (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLokalniZoom((z) => Math.min(3, Math.max(1, z - e.deltaY * 0.002)));
  } : undefined;
  const slika = (
    <div style={{
      width: "100%",
      height: "100%",
      transform: lokalniZoom !== 1 ? `scale(${lokalniZoom})` : undefined,
      transformOrigin: "center center",
      transition: lokalniZoom === 1 ? "transform 0.15s" : undefined,
    }}
    >
      <DijagramSlika
        url={url}
        dijagram={dijagram}
        tacke={tacke}
        C={C}
        kompakt={kompakt}
        sidebar={sidebar}
        onError={() => setGreska(true)}
      />
    </div>
  );

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${tacke.length ? C.zelena : C.border}`,
      borderRadius: 10,
      padding: sidebar ? 4 : 8,
      textAlign: "center",
      height: sidebar ? "100%" : undefined,
      display: sidebar ? "flex" : undefined,
      flexDirection: sidebar ? "column" : undefined,
      minHeight: sidebar ? 0 : undefined,
      boxSizing: "border-box",
    }}
    >
      <div style={{
        flex: sidebar ? 1 : undefined,
        minHeight: sidebar ? 0 : undefined,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
      >
        {onZoom ? (
          <button type="button" onClick={otvoriZoom} onWheel={naTockicu} style={stil} title="Klik — ceo ekran · točkić — uvećaj">
            {slika}
          </button>
        ) : (
          <div style={stil} onWheel={naTockicu}>{slika}</div>
        )}
      </div>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: sidebar ? 4 : 8,
        flexWrap: "wrap",
        marginTop: sidebar ? 3 : 6,
        flexShrink: 0,
      }}
      >
        <div style={{ color: C.sivi, fontSize: 10 }}>
          {tacke.length
            ? <>Poz. <strong style={{ color: C.zelena }}>{pozBr}</strong></>
            : "Sklop"}
          {onZoom && lokalniZoom > 1 && (
            <span style={{ marginLeft: 6, color: C.plava }}>{Math.round(lokalniZoom * 100)}%</span>
          )}
        </div>
        {onZoom && prikaziDugmeZoom && (
          <>
            <button
              type="button"
              onClick={otvoriZoom}
              style={{
                background: `${C.plava || "#3b82f6"}22`,
                border: `1px solid ${C.plava || "#3b82f6"}`,
                borderRadius: 6,
                color: C.plava || "#3b82f6",
                fontSize: 9,
                fontWeight: 700,
                padding: sidebar ? "2px 6px" : "4px 10px",
                cursor: "pointer",
              }}
            >
              🔍
            </button>
            {lokalniZoom > 1 && (
              <button
                type="button"
                onClick={() => setLokalniZoom(1)}
                style={{
                  background: C.hover,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.sivi,
                  fontSize: 8,
                  padding: sidebar ? "2px 5px" : "3px 7px",
                  cursor: "pointer",
                }}
                title="Reset uvećanja"
              >
                ⊡
              </button>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes moment-poz-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.06); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
