import { useState } from "react";
import { zavrsiTour } from "../../lib/sifrarnikRadniTok.js";
import { btnStyle } from "./sifrarnikPanelStyle.js";

const KORACI = [
  {
    n: 1,
    naslov: "Izaberi liniju",
    tekst: "VOZ/PRO pločica ili padajući meni — fokus za današnji rad.",
  },
  {
    n: 2,
    naslov: "Sledeći korak",
    tekst: "Uradi šta nedostaje (GU, greške, crtež). Posle snimanja: „Gotovo → sledeći“.",
  },
  {
    n: 3,
    naslov: "Lista delimičnih",
    tekst: "Pregled rupa na liniji. Filter GU/greške/crtež sužava listu.",
  },
];

/** Jednokratna 3-korak obuka za Radni režim. */
export default function SifrarnikRadniTour({ C, onZavrsi }) {
  const [idx, setIdx] = useState(0);
  const k = KORACI[idx];
  const poslednji = idx >= KORACI.length - 1;

  const zavrsi = () => {
    zavrsiTour();
    onZavrsi?.();
  };

  return (
    <div
      data-testid="sifrarnik-radni-tour"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "18px 20px",
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, marginBottom: 6 }}>
          OBUKA · {idx + 1}/{KORACI.length}
        </div>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          {k.n}. {k.naslov}
        </div>
        <div style={{ color: C.sivi, fontSize: 11, lineHeight: 1.5, marginBottom: 16 }}>
          {k.tekst}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
          <button
            type="button"
            data-testid="radni-tour-preskoci"
            onClick={zavrsi}
            style={btnStyle(C, C.hover, { fontSize: 9 })}
          >
            Preskoči
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {idx > 0 && (
              <button
                type="button"
                onClick={() => setIdx((i) => i - 1)}
                style={btnStyle(C, C.hover, { fontSize: 9 })}
              >
                Nazad
              </button>
            )}
            <button
              type="button"
              data-testid="radni-tour-dalje"
              onClick={() => {
                if (poslednji) zavrsi();
                else setIdx((i) => i + 1);
              }}
              style={btnStyle(C, C.plava, { fontSize: 10 })}
            >
              {poslednji ? "Kreni" : "Dalje →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
