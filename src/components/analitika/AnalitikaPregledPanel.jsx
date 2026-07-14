import ZajednickiDashboard from "../ZajednickiDashboard.jsx";
import AnalitikaKpiStrip from "./AnalitikaKpiStrip.jsx";
import AnalitikaSpcSnapshot from "./AnalitikaSpcSnapshot.jsx";
import AnalitikaPregledKpi from "./AnalitikaPregledKpi.jsx";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";

const FORM_MAX = 960;

export default function AnalitikaPregledPanel({
  C,
  addToast,
  korisnik,
  onOtvori8D,
  onOtvoriNcr,
  modul,
  onOtvoriOee,
  onNavigacija,
}) {
  const filter = useAnalitikaFilter();
  const ivica = modul === "merljive" ? C.zelena : C.plava;

  return (
    <div style={{ padding: 16, overflow: "auto", flex: 1, boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: FORM_MAX, margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{
          background: C.panel,
          border: `1px solid ${ivica}35`,
          borderRadius: 12,
          padding: "14px 14px 12px",
          marginBottom: 14,
          width: "100%",
          boxSizing: "border-box",
        }}>
          <AnalitikaSpcSnapshot
            C={C}
            modul={modul}
            onNavigacija={onNavigacija}
            uklopljen
          />

          <div style={{ borderTop: `1px solid ${C.border}`, margin: "12px 0 10px" }} />

          <AnalitikaPregledKpi
            C={C}
            modul={modul}
            onNavigacija={onNavigacija}
          />
        </div>

        <div style={{ width: "100%", boxSizing: "border-box" }}>
          <ZajednickiDashboard
            C={C}
            addToast={addToast}
            korisnik={korisnik}
            onOtvori8D={onOtvori8D}
            onOtvoriNcr={onOtvoriNcr}
            filterIdDeo={filter?.idDeo}
            filterPeriod={filter?.period}
            filterLinija={filter?.linija}
            filterSmena={filter?.smena}
            sakrijFilterTraku
            sakrijNaslov
            modul={modul}
            onNavigacija={onNavigacija}
            sakrijKpiSest
          />
        </div>

        <AnalitikaKpiStrip
          C={C}
          modul={modul}
          filterIdDeo={filter?.idDeo}
          filterPeriod={filter?.period}
          filterSmena={filter?.smena}
          onDetaljiOee={onOtvoriOee}
        />
      </div>
    </div>
  );
}
