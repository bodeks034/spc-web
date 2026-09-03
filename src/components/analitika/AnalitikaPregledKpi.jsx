import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import { useDashboardPodaci } from "../../lib/useDashboardPodaci.js";
import AnalitikaKpiSestPolja from "./AnalitikaKpiSestPolja.jsx";

/** Učitava i prikazuje 6 KPI polja u punoj širini forme. */
export default function AnalitikaPregledKpi({ C, modul, onNavigacija }) {
  const filter = useAnalitikaFilter();
  const { podaci, loading, greska, osvezi } = useDashboardPodaci({
    period: Number(filter?.period || 7),
    idDeo: filter?.idDeo || "",
    linija: filter?.linija || "",
    smena: filter?.smena ?? "",
  });

  if (greska && !podaci) {
    return (
      <div role="alert" style={{
        color: C.crvena, fontSize: 10, width: "100%", padding: "4px 0",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <span>{greska}</span>
        <button type="button" onClick={osvezi}
          style={{
            background: "transparent", border: `1px solid ${C.crvena}60`, borderRadius: 6,
            color: C.crvena, fontSize: 9, padding: "2px 8px", cursor: "pointer",
          }}>
          Pokušaj ponovo
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ color: C.sivi, fontSize: 10, width: "100%", padding: "2px 0" }}>
        Učitavanje KPI…
      </div>
    );
  }

  if (!podaci) {
    return (
      <div style={{ color: C.border, fontSize: 10, width: "100%", padding: "2px 0" }}>
        Nema KPI podataka
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
      <AnalitikaKpiSestPolja
        C={C}
        podaci={podaci}
        modul={modul}
        onNavigacija={onNavigacija}
      />
    </div>
  );
}
