import { useState } from "react";
import { useDashboardPodaci } from "../lib/useDashboardPodaci.js";
import OperativniAlarmiStrip from "./OperativniAlarmiStrip.jsx";

/** Kontrolor na početnom ekranu — samo kritični alarmi, bez punog pregleda proizvodnje. */
export default function LinijaAlarmiPocetna({ C }) {
  const { podaci } = useDashboardPodaci({ period: 1 });
  const alarmi = podaci?.alarmi || [];
  const [sakrij, setSakrij] = useState(false);

  if (sakrij || !alarmi.length) return null;

  return (
    <div style={{ width: "100%", maxWidth: 960 }}>
      <OperativniAlarmiStrip
        alarmi={alarmi}
        C={C}
        kompakt
        onZatvori={() => setSakrij(true)}
      />
    </div>
  );
}
