import { opisAnalitikaTaba } from "../../lib/analitikaOpisi.js";

export default function AnalitikaTabOpis({ tab, modul, C, kompakt }) {
  const tekst = opisAnalitikaTaba(tab, modul);
  if (!tekst) return null;
  return (
    <div style={{
      padding: kompakt ? "6px 10px" : "8px 18px",
      background: `${C.plava}08`,
      borderBottom: `1px solid ${C.border}`,
      color: C.sivi,
      fontSize: kompakt ? 10 : 11,
      lineHeight: 1.45,
    }}>
      {tekst}
    </div>
  );
}
