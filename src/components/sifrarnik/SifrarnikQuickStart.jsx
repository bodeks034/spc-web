import { useState } from "react";

const STORAGE_KEY = "spc_sifrarnik_quickstart_off";

/** Kratki vodič za inženjere — 3 koraka do kompletnog dela. */
export default function SifrarnikQuickStart({ C, onNavigate, skriveno = false }) {
  const [off, setOff] = useState(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  if (skriveno || off) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setOff(true);
  };

  const koraci = [
    { n: 1, label: "Kreiraj deo", tab: "delovi", hint: "Master zapis + crtež" },
    { n: 2, label: "Glavni unos", tab: "glavni_unos", hint: "Dimenzije + greške" },
    { n: 3, label: "Objavi", tab: "glavni_unos", hint: "Propagacija u Merljive/RN" },
  ];

  return (
    <div
      data-testid="sifrarnik-quick-start"
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${C.plava}44`,
        background: `${C.plava}0d`,
        fontSize: 10,
        lineHeight: 1.45,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <strong style={{ color: C.tekst, fontSize: 11 }}>Brzi start — novi deo u 3 koraka</strong>
        <button
          type="button"
          data-testid="sifrarnik-quick-start-dismiss"
          onClick={dismiss}
          style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 9 }}
        >
          Sakrij
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {koraci.map((k) => (
          <button
            key={k.n}
            type="button"
            data-testid={`sifrarnik-quick-start-${k.tab}`}
            onClick={() => onNavigate?.(k.tab)}
            style={{
              flex: "1 1 140px",
              textAlign: "left",
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 10px",
              cursor: "pointer",
            }}
          >
            <span style={{ color: C.plava, fontWeight: 700 }}>{k.n}. </span>
            <span style={{ color: C.tekst, fontWeight: 700 }}>{k.label}</span>
            <span style={{ display: "block", color: C.sivi, fontSize: 9, marginTop: 2 }}>{k.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
