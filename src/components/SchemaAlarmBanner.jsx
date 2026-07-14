import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { proveriSemu, sumirajProveruSeme } from "../lib/schemaCheck.js";

/** Upozorenje na početnom ekranu kad nedostaju SQL migracije. */
export default function SchemaAlarmBanner({ C, onOtvoriAdmin }) {
  const [sumar, setSumar] = useState(null);
  const [sakrij, setSakrij] = useState(false);

  const proveri = useCallback(async () => {
    try {
      const stavke = await proveriSemu(supabase);
      setSumar(sumirajProveruSeme(stavke));
    } catch {
      setSumar(null);
    }
  }, []);

  useEffect(() => {
    proveri();
    const timer = setInterval(proveri, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [proveri]);

  if (sakrij || !sumar || sumar.ok) return null;

  const lista = sumar.nedostaje.slice(0, 4).map((m) => m.naziv).join(", ");
  const vise = sumar.nedostaje.length > 4 ? ` +${sumar.nedostaje.length - 4}` : "";

  return (
    <div
      data-testid="schema-alarm-banner"
      style={{
        background: `${C.crvena}18`,
        border: `1px solid ${C.crvena}55`,
        borderRadius: 10,
        padding: "12px 14px",
        marginBottom: 12,
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ color: C.crvena, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
          ⚠ Nedostaju migracije ({sumar.primenjeno}/{sumar.ukupno})
        </div>
        <div style={{ color: C.tekst, fontSize: 10, lineHeight: 1.5 }}>
          {lista}{vise}
          <span style={{ display: "block", color: C.sivi, marginTop: 4 }}>
            Pokreni: <code>npm run db:migrate</code> · vidi docs/MIGRACIJE.md
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {onOtvoriAdmin && (
          <button
            type="button"
            onClick={onOtvoriAdmin}
            style={{
              background: C.hover,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.tekst,
              fontSize: 10,
              fontWeight: 700,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Admin → šema
          </button>
        )}
        <button
          type="button"
          onClick={() => setSakrij(true)}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.sivi,
            fontSize: 10,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          Sakrij
        </button>
      </div>
    </div>
  );
}
