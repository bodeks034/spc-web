import { opisSpcKarte } from "../../lib/analitikaOpisi.js";

export default function SpcKartaOpis({ tip, modul, C }) {
  const tekst = opisSpcKarte(tip, modul);
  if (!tekst) return null;
  return (
    <div style={{
      color: C.sivi,
      fontSize: 10,
      marginBottom: 12,
      padding: "8px 12px",
      background: C.bg,
      borderRadius: 8,
      border: `1px solid ${C.border}`,
      lineHeight: 1.45,
    }}>
      {tekst}
    </div>
  );
}
