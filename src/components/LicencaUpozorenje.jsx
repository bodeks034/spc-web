import useAppStore from "../lib/appStore.js";

/** Traka upozorenja kad licence radi iz keša (offline grace). */
export default function LicencaUpozorenje({ licenca: licencaProp, C: CProp }) {
  const storeLicenca = useAppStore((s) => s.licenca);
  const storeC = useAppStore((s) => s.temaC);
  const licenca = licencaProp ?? storeLicenca;
  const C = CProp ?? storeC;
  if (!licenca?.offlineGrace || !C) return null;

  return (
    <div style={{
      background: `${C.zuta}18`,
      borderBottom: `1px solid ${C.zuta}44`,
      color: C.zuta,
      fontSize: 10,
      padding: "6px 12px",
      textAlign: "center",
      letterSpacing: 0.3,
      flexShrink: 0,
    }}>
      ⚠ Provera licence nije dostupna — aplikacija radi iz keša (offline grace).
      {licenca.vazi_do ? ` Važi do ${new Date(licenca.vazi_do).toLocaleDateString("sr-RS")}.` : ""}
    </div>
  );
}
