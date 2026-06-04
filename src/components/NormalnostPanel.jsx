import { formatVrednostKarte } from "../lib/varijabilneUtils.js";

export default function NormalnostPanel({ normalnost, C, jedinica, kompakt }) {
  if (!normalnost) return null;
  const b = C[normalnost.boja] || C.sivi;

  const redovi = [
    ["n", normalnost.n],
    ["μ", normalnost.mu != null ? formatVrednostKarte(normalnost.mu, jedinica) : "—"],
    ["σ", normalnost.sigma != null ? formatVrednostKarte(normalnost.sigma, jedinica) : "—"],
    ["Skew", normalnost.skew ?? "—"],
    ["Kurt", normalnost.kurt ?? "—"],
    ...(normalnost.jb != null
      ? [["Jarque–Bera", `${normalnost.jb}${normalnost.jbP != null ? ` (p≈${normalnost.jbP})` : ""}`]]
      : []),
  ];

  return (
    <div style={{
      background: `${b}12`,
      border: `1px solid ${b}45`,
      borderRadius: 10,
      padding: kompakt ? "10px 12px" : "12px 14px",
      marginTop: kompakt ? 0 : 14,
      marginBottom: kompakt ? 10 : 0,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: kompakt ? 6 : 10 }}>
        <span style={{ fontSize: 18 }}>📈</span>
        <div>
          <div style={{ color: b, fontWeight: 700, fontSize: kompakt ? 11 : 12, marginBottom: 4 }}>
            Normalnost (Gausova raspodela)
          </div>
          <div style={{ color: C.tekst, fontSize: kompakt ? 10 : 11, lineHeight: 1.5 }}>
            {normalnost.tekst}
          </div>
        </div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: kompakt ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(100px, 1fr))",
        gap: 8,
        fontSize: 10,
      }}>
        {redovi.map(([k, v]) => (
          <div key={k} style={{ background: C.panel, borderRadius: 6, padding: "6px 8px" }}>
            <div style={{ color: C.sivi, fontSize: 8 }}>{k}</div>
            <div style={{ color: C.tekst, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
      {normalnost.n < 30 && (
        <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>
          Za pouzdaniji test uvezi ≥30 merenja (Jarque–Bera).
        </div>
      )}
    </div>
  );
}
