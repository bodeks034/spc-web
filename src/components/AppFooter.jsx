import { getBrending } from "../lib/brending.js";
import DevelopedBy from "./DevelopedBy.jsx";

/** Footer — verzija + Developed by (autor). */
export default function AppFooter({ C, kompakt = false, prikaziAutora = false, prikaziAutoraMobil = false }) {
  const b = getBrending();
  const sivi = C?.sivi || "#94a3b8";
  const prikaziDev = prikaziAutora || prikaziAutoraMobil;

  return (
    <div style={{
      color: sivi,
      fontSize: kompakt ? 9 : 10,
      lineHeight: 1.5,
      textAlign: "center",
      marginTop: kompakt ? 12 : 20,
      letterSpacing: 0.3,
    }}>
      <div>{b.nazivAplikacije} · v{b.verzija}</div>
      {prikaziDev && (
        <div style={{ marginTop: 6 }}>
          <DevelopedBy C={C} kompakt={kompakt} centar prikaz="autor" />
        </div>
      )}
    </div>
  );
}
