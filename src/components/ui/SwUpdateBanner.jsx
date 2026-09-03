import { useEffect, useState } from "react";
import { pretplatiSwUpdate, primeniSwUpdate } from "../../lib/pwa.js";

/** Baner kada čeka nova PWA verzija — korisnik bira reload. */
export default function SwUpdateBanner({ C }) {
  const [reg, setReg] = useState(null);

  useEffect(() => pretplatiSwUpdate((detail) => {
    if (detail?.registration) setReg(detail.registration);
  }), []);

  if (!reg) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9998,
        background: C?.panel || "#1a1f2e",
        borderBottom: `1px solid ${C?.plava || "#3b82f6"}`,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ color: C?.tekst || "#e2e8f0", fontSize: 12 }}>
        Nova verzija aplikacije je spremna. Osveži da učitaš ažuriranje.
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => setReg(null)}
          style={{
            background: "transparent",
            border: `1px solid ${C?.border || "#334155"}`,
            borderRadius: 6,
            color: C?.sivi || "#94a3b8",
            fontSize: 11,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Kasnije
        </button>
        <button
          type="button"
          onClick={() => primeniSwUpdate(reg)}
          style={{
            background: C?.plava || "#3b82f6",
            border: "none",
            borderRadius: 6,
            color: C?.onAkcent || "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Osveži sada
        </button>
      </div>
    </div>
  );
}
